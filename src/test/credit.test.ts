import { CreditSimulator } from "./credit-simulator.js";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { describe, expect, it } from "vitest";
import { randomBytes } from "./utils.js";

setNetworkId("undeployed");

describe("Credit credential commitment contract", () => {
  const adminSecret = randomBytes(32);
  const minScore = 650n;
  const setup = (score: bigint, salt: Uint8Array) => {
    const bootstrap = new CreditSimulator(adminSecret, 0n, new Uint8Array(32), minScore, new Uint8Array(32));
    return new CreditSimulator(randomBytes(32), score, salt, minScore, bootstrap.publicKey(adminSecret));
  };

  it("initializes the minimum score", () => {
    expect(setup(700n, randomBytes(32)).getLedger().min_credit_score).toBe(650n);
  });

  it("allows only the administrator to issue score commitments", () => {
    const salt = randomBytes(32);
    const sim = setup(700n, salt);
    const commitment = sim.credentialCommitment(700n, salt);
    expect(() => sim.issueCredential(commitment)).toThrow(/Only admin/);
    sim.switchUser(adminSecret, 0n, new Uint8Array(32));
    expect(sim.issueCredential(commitment).issued_credentials.member(commitment)).toBe(true);
  });

  it("verifies an issued score at or above the threshold", () => {
    const salt = randomBytes(32);
    const sim = setup(680n, salt);
    const commitment = sim.credentialCommitment(680n, salt);
    sim.switchUser(adminSecret, 0n, new Uint8Array(32));
    sim.issueCredential(commitment);
    sim.switchUser(randomBytes(32), 680n, salt);
    expect(sim.verifyCredit()).toBe(true);
  });

  it("rejects an issued score below the threshold", () => {
    const salt = randomBytes(32);
    const sim = setup(620n, salt);
    const commitment = sim.credentialCommitment(620n, salt);
    sim.switchUser(adminSecret, 0n, new Uint8Array(32));
    sim.issueCredential(commitment);
    sim.switchUser(randomBytes(32), 620n, salt);
    expect(() => sim.verifyCredit()).toThrow(/below/);
  });

  it("rejects an unissued score credential", () => {
    expect(() => setup(700n, randomBytes(32)).verifyCredit()).toThrow(/not issued/);
  });
});
