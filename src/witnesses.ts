import { Ledger } from "../contracts/managed/credit_gate/contract/index.js";
import { WitnessContext } from "@midnight-ntwrk/compact-runtime";

export type CreditPrivateState = {
  readonly secretKey: Uint8Array;
  readonly creditScore: bigint;
  readonly credentialSalt: Uint8Array;
};

export const createCreditPrivateState = (secretKey: Uint8Array, creditScore: bigint, credentialSalt: Uint8Array) => ({
  secretKey,
  creditScore,
  credentialSalt,
});

export const witnesses = {
  localSecretKey: ({ privateState }: WitnessContext<Ledger, CreditPrivateState>): [CreditPrivateState, Uint8Array] => [privateState, privateState.secretKey],
  creditScore: ({ privateState }: WitnessContext<Ledger, CreditPrivateState>): [CreditPrivateState, bigint] => [privateState, privateState.creditScore],
  credentialSalt: ({ privateState }: WitnessContext<Ledger, CreditPrivateState>): [CreditPrivateState, Uint8Array] => [privateState, privateState.credentialSalt],
};
