import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
  localSecretKey(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  creditScore(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
  agencySignature(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  registerAgency(context: __compactRuntime.CircuitContext<PS>,
                 agency_pk_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  verifyCredit(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, boolean>;
}

export type ProvableCircuits<PS> = {
  registerAgency(context: __compactRuntime.CircuitContext<PS>,
                 agency_pk_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  verifyCredit(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, boolean>;
}

export type PureCircuits = {
  verifyCredential(score_0: bigint, sig_0: Uint8Array): Uint8Array;
  publicKey(sk_0: Uint8Array): Uint8Array;
}

export type Circuits<PS> = {
  registerAgency(context: __compactRuntime.CircuitContext<PS>,
                 agency_pk_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  verifyCredit(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, boolean>;
  verifyCredential(context: __compactRuntime.CircuitContext<PS>,
                   score_0: bigint,
                   sig_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  publicKey(context: __compactRuntime.CircuitContext<PS>, sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
}

export type Ledger = {
  readonly min_credit_score: bigint;
  trusted_agencies: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<[Uint8Array, boolean]>
  };
  readonly admin: Uint8Array;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>,
               min_score_0: bigint,
               admin_pk_0: Uint8Array): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
