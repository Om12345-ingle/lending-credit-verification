import { CreditSimulator } from "./credit-simulator.js";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { describe, it, expect } from "vitest";
import { randomBytes } from "./utils.js";

setNetworkId("undeployed");

describe("Credit Score Gate Smart Contract Tests", () => {
  const adminSecret = randomBytes(32);
  const minScore = 650n;

  // Setup helper to create a simulator
  const setupSimulator = (userSecret: Uint8Array, creditScore: bigint, agencySig: Uint8Array) => {
    const tempSim = new CreditSimulator(adminSecret, 0n, new Uint8Array(32), minScore, new Uint8Array(32));
    const adminPk = tempSim.publicKey(adminSecret);
    return new CreditSimulator(userSecret, creditScore, agencySig, minScore, adminPk);
  };

  it("1. Properly initializes contract parameters and min credit score", () => {
    const userSecret = randomBytes(32);
    const simulator = setupSimulator(userSecret, 700n, new Uint8Array(32));
    const ledgerState = simulator.getLedger();

    expect(ledgerState.min_credit_score).toEqual(650n);
  });

  it("2. Lets admin register a trusted credit agency", () => {
    const userSecret = randomBytes(32);
    const simulator = setupSimulator(userSecret, 700n, new Uint8Array(32));
    const agencyPk = randomBytes(32);

    // Switch to admin to register
    simulator.switchUser(adminSecret, 0n, new Uint8Array(32));
    const ledgerState = simulator.registerAgency(agencyPk);
    expect(ledgerState.trusted_agencies.member(agencyPk)).toEqual(true);
  });

  it("3. Returns true when credit score is equal or higher than target and signature matches", () => {
    const userSecret = randomBytes(32);
    const agencyPk = randomBytes(32);
    const score = 680n;

    const simulator = setupSimulator(userSecret, score, agencyPk);

    // Register agency
    simulator.switchUser(adminSecret, 0n, new Uint8Array(32));
    simulator.registerAgency(agencyPk);

    // User runs check
    simulator.switchUser(userSecret, score, agencyPk);
    const isEligible = simulator.verifyCredit();
    expect(isEligible).toEqual(true);
  });

  it("4. Throws when user score is below the min score requirement", () => {
    const userSecret = randomBytes(32);
    const agencyPk = randomBytes(32);
    const score = 620n; // Under 650

    const simulator = setupSimulator(userSecret, score, agencyPk);

    // Register agency
    simulator.switchUser(adminSecret, 0n, new Uint8Array(32));
    simulator.registerAgency(agencyPk);

    // User runs check
    simulator.switchUser(userSecret, score, agencyPk);
    expect(() => simulator.verifyCredit()).toThrow("failed assert: Credit score is below requirement");
  });

  it("5. Throws when the credit report was signed by an untrusted agency", () => {
    const userSecret = randomBytes(32);
    const untrustedAgencyPk = randomBytes(32);
    const score = 700n;

    const simulator = setupSimulator(userSecret, score, untrustedAgencyPk);

    // User runs check without whitelisting agency
    expect(() => simulator.verifyCredit()).toThrow("failed assert: Credit report not signed by trusted agency");
  });
});
