import {
  type CircuitContext,
  QueryContext,
  sampleContractAddress,
  createConstructorContext,
  CostModel,
} from "@midnight-ntwrk/compact-runtime";
import {
  Contract,
  type Ledger,
  ledger,
} from "../../contracts/managed/credit_gate/contract/index.js";
import { type CreditPrivateState, witnesses } from "../witnesses.js";

export class CreditSimulator {
  readonly contract: Contract<CreditPrivateState>;
  circuitContext: CircuitContext<CreditPrivateState>;

  constructor(secretKey: Uint8Array, creditScore: bigint, agencySignature: Uint8Array, minScore: bigint, adminPk: Uint8Array) {
    this.contract = new Contract<CreditPrivateState>(witnesses);
    const {
      currentPrivateState,
      currentContractState,
      currentZswapLocalState,
    } = this.contract.initialState(
      createConstructorContext({ secretKey, creditScore, agencySignature }, "0".repeat(64)),
      minScore,
      adminPk
    );
    this.circuitContext = {
      currentPrivateState,
      currentZswapLocalState,
      costModel: CostModel.initialCostModel(),
      currentQueryContext: new QueryContext(
        currentContractState.data,
        sampleContractAddress(),
      ),
    };
  }

  public switchUser(secretKey: Uint8Array, creditScore: bigint, agencySignature: Uint8Array) {
    this.circuitContext.currentPrivateState = {
      secretKey,
      creditScore,
      agencySignature
    };
  }

  public getLedger(): Ledger {
    return ledger(this.circuitContext.currentQueryContext.state);
  }

  public getPrivateState(): CreditPrivateState {
    return this.circuitContext.currentPrivateState;
  }

  public registerAgency(agencyPk: Uint8Array): Ledger {
    this.circuitContext = this.contract.impureCircuits.registerAgency(
      this.circuitContext,
      agencyPk,
    ).context;
    return this.getLedger();
  }

  public verifyCredit(): boolean {
    const result = this.contract.circuits.verifyCredit(
      this.circuitContext,
    );
    return result.result;
  }

  public publicKey(sk: Uint8Array): Uint8Array {
    return this.contract.circuits.publicKey(
      this.circuitContext,
      sk,
    ).result;
  }
}
