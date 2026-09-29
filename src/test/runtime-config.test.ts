import { describe, expect, it } from 'vitest';
import { verifyCreditGateDeployment, validateCreditGateDeploymentRuntime } from '../runtimeConfig';

const deployment = {
  contractName: 'credit_gate',
  contractAddress: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  network: 'preview',
  transactionHash: '000000000000000000000000000000000000000000000000000000000000000000',
  deployedAt: '2026-08-03T18:00:00.000Z',
};

describe('Lending Credit Verification production configuration', () => {
  it('accepts matching Preview deployment evidence', () => {
    expect(verifyCreditGateDeployment(deployment).contractName).toBe('credit_gate');
  });

  it('rejects evidence copied from another project', () => {
    expect(() => verifyCreditGateDeployment({ ...deployment, contractName: 'foreign_contract' })).toThrow(/different contract/);
  });

  it('rejects malformed contract and transaction identifiers', () => {
    expect(() => verifyCreditGateDeployment({ ...deployment, contractAddress: 'preview1bad' })).toThrow(/32-byte/);
    expect(() => verifyCreditGateDeployment({ ...deployment, transactionHash: 'pending' })).toThrow(/transaction evidence/);
  });

  it('prevents demo mode and network drift in production', () => {
    expect(validateCreditGateDeploymentRuntime({ networkId: 'preprod' }).networkId).toBe('preprod');
    expect(() => validateCreditGateDeploymentRuntime({ production: true, demoMode: 'true' })).toThrow(/forbidden/);
  });
});
