# Lending Credit Verification

A lender-side decision gate that proves a borrower meets a credit policy without disclosing the underlying score.

## Underwriting flow

This application is built for a credential agency and a lender:

1. register a trusted agency;
2. verify a signed credit credential;
3. evaluate the configured minimum score policy;
4. return eligibility and transaction evidence without publishing the score.

The cyan underwriting dashboard keeps threshold state, agency readiness, wallet connection, privacy notes, and deployment status together.

## Compact contract: `credit_gate`

Available circuits:

- `registerAgency(agency_pk)`
- `verifyCredential(score, sig)`
- `verifyCredit()`
- `publicKey(sk)`

The ledger stores the threshold, trusted agency set, and administrator identity. Exact score, borrower identity, and bureau history remain outside the public result.

## Preprod deployment

| Network | Midnight Preprod |
| --- | --- |
| Address | `cf19450394a3606d38a0880658d807017b6cd0613eef9e739669688e3aacb2f9` |
| Transaction | `4890f60cd7a5706b593615255727f88352ad32e437ff83b2e18e4bfc9f66744c` |
| Indexer status | Confirmed |
| Contract | `credit_gate` |

## Local development

```bash
npm install
npm run compile
npm test
npm run build
npm run dev
```

Run `npm run deploy` only after configuring a dedicated Preprod wallet/provider. Never test with real credit files or live customer information.

## CI/CD notes

The frontend job builds the Vite app. The Compact job installs the compiler, recompiles `credit_gate`, and runs the test suite. Tag releases include a deployment manifest and generated contract artifacts. Dependency checks run on schedule.

Demo video: [open the underwriting walkthrough](https://drive.google.com/file/d/1oEU7aEx0xq81FQRpsN-AnyRTKnLDoaIG/view?usp=sharing).

