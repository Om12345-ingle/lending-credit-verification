import { Ledger } from "../contracts/managed/credit_gate/contract/index.js";
import { WitnessContext } from "@midnight-ntwrk/compact-runtime";

export type CreditPrivateState = {
  readonly secretKey: Uint8Array;
  readonly creditScore: bigint;
  readonly agencySignature: Uint8Array;
};

export const createCreditPrivateState = (secretKey: Uint8Array, creditScore: bigint, agencySignature: Uint8Array) => ({
  secretKey,
  creditScore,
  agencySignature
});

export const witnesses = {
  localSecretKey: ({
    privateState,
  }: WitnessContext<Ledger, CreditPrivateState>): [
    CreditPrivateState,
    Uint8Array,
  ] => [privateState, privateState.secretKey],

  creditScore: ({
    privateState,
  }: WitnessContext<Ledger, CreditPrivateState>): [
    CreditPrivateState,
    bigint,
  ] => [privateState, privateState.creditScore],

  agencySignature: ({
    privateState,
  }: WitnessContext<Ledger, CreditPrivateState>): [
    CreditPrivateState,
    Uint8Array,
  ] => [privateState, privateState.agencySignature],
};
