import { type CircuitContext, QueryContext, sampleContractAddress, createConstructorContext, CostModel } from "@midnight-ntwrk/compact-runtime";
import { Contract, type Ledger, ledger } from "../../contracts/managed/credit_gate/contract/index.js";
import { type CreditPrivateState, witnesses } from "../witnesses.js";

export class CreditSimulator {
  readonly contract: Contract<CreditPrivateState>;
  circuitContext: CircuitContext<CreditPrivateState>;

  constructor(secretKey: Uint8Array, creditScore: bigint, credentialSalt: Uint8Array, minScore: bigint, adminPk: Uint8Array) {
    this.contract = new Contract<CreditPrivateState>(witnesses);
    const state = this.contract.initialState(
      createConstructorContext({ secretKey, creditScore, credentialSalt }, "0".repeat(64)),
      minScore,
      adminPk,
    );
    this.circuitContext = {
      currentPrivateState: state.currentPrivateState,
      currentZswapLocalState: state.currentZswapLocalState,
      costModel: CostModel.initialCostModel(),
      currentQueryContext: new QueryContext(state.currentContractState.data, sampleContractAddress()),
    };
  }

  switchUser(secretKey: Uint8Array, creditScore: bigint, credentialSalt: Uint8Array) {
    this.circuitContext.currentPrivateState = { secretKey, creditScore, credentialSalt };
  }

  getLedger(): Ledger { return ledger(this.circuitContext.currentQueryContext.state); }
  publicKey(sk: Uint8Array) { return this.contract.circuits.publicKey(this.circuitContext, sk).result; }
  credentialCommitment(score: bigint, salt: Uint8Array) { return this.contract.circuits.credentialCommitment(this.circuitContext, score, salt).result; }

  issueCredential(commitment: Uint8Array): Ledger {
    this.circuitContext = this.contract.impureCircuits.issueCredential(this.circuitContext, commitment).context;
    return this.getLedger();
  }

  verifyCredit(): boolean { return this.contract.circuits.verifyCredit(this.circuitContext).result; }
}
