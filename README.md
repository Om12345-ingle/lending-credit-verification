# Lending Credit Verification

![Frontend CI](https://github.com/Om12345-ingle/lending-credit-verification/actions/workflows/frontend-ci.yml/badge.svg?branch=main) ![Contract CI](https://github.com/Om12345-ingle/lending-credit-verification/actions/workflows/contract-ci.yml/badge.svg?branch=main)

A lender-side decision gate that proves a borrower meets a credit policy without disclosing the underlying score.

## Underwriter’s due-diligence file

Open [PROPOSAL.md](./PROPOSAL.md) for the lending thesis, [credit.test.ts](./src/test/credit.test.ts) for threshold and issuer checks, [TESTING.md](./TESTING.md) for repeatability, and [deployment.json](./deployment.json) for the Preview receipt.

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

## Preview deployment

| Network | Midnight Preview |
| --- | --- |
| Address | `0c4bbb7dc537f0d17c5cc7a8df2c93c385fbf8e5c2ff4216d9a964207ffeed0c` |
| Transaction | `00c0b1d5f34206c1cc894e193c762d1ba78548b667dcfb193cd18bee0a474455f3` |
| Underwriting deployer | `mn_addr_preview1htenx2hpt3uklqt6dx3qnyz0u5u20e4lh3nygtxqg2y3kdz9c2tq5tcyfd` |
| Confirmed at | `2026-08-03T19:03:44.831Z` |
| Indexer status | Confirmed |
| Contract | `credit_gate` |

## Local development

Underwriting test wallets are funded with the [official Preview faucet](https://faucet.preview.midnight.network/).

```bash
npm install
npm run compile
npm test
npm run build
npm run dev
```

Run `npm run deploy` only after configuring a dedicated Preview wallet/provider. Never test with real credit files or live customer information.

## CI/CD notes

The frontend job builds the Vite app. The Compact job installs the compiler, recompiles `credit_gate`, and runs the test suite. Tag releases include a deployment manifest and generated contract artifacts. Dependency checks run on schedule.

Demo video: [open the underwriting walkthrough](https://drive.google.com/file/d/1oEU7aEx0xq81FQRpsN-AnyRTKnLDoaIG/view?usp=sharing).

## Verification

Privacy is the product feature: the lender learns only whether the policy is met, while the borrower’s exact score and report details remain private. Run `npm test`, `npm run compile`, and `npm run build`; the five contract scenarios are documented in [TESTING.md](./TESTING.md), the product scope is in [PROPOSAL.md](./PROPOSAL.md), and both CI workflows run on every push and pull request.
