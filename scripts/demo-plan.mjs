export const contractName = 'credit_gate';
export const target = 50;
const bytes = value => Uint8Array.from(Buffer.from(value, 'hex'));
const padded = value => { const result = new Uint8Array(32); result.set(new TextEncoder().encode(value)); return result; };
export function makePlan(pure, data) {
  const admin = bytes(data.adminSecret);
  const adminPk = pure.publicKey(admin);
  const id = bytes(data.id);
  const actors = data.actors.map((actor, index) => ({ secretKey: bytes(actor.secret), salt: bytes(actor.salt), index }));
  const steps = [];
  const add = (kind, circuit, state, args, verify) => steps.push({kind, circuit, state, args, verify});
  const adminState = {secretKey: admin, creditScore: 0n, credentialSalt: new Uint8Array(32)};
  for (const actor of actors.slice(0, target)) {
    const value = BigInt(700 + actor.index % 100);
    const commitment = pure.credentialCommitment(value, actor.salt);
    const state = {secretKey: actor.secretKey, creditScore: value, credentialSalt: actor.salt};
    add('setup', 'issueCredential', adminState, [commitment], live => live.issued_credentials.member(commitment));
    add('demo', 'verifyCredit', state, [], live => live.issued_credentials.member(commitment));
  }
  return {constructorArgs: [650n, adminPk], adminState, steps};
}
export const witnessFields = ["localSecretKey","creditScore","credentialSalt"];
