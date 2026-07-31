# Product Proposal: Lending Credit Verification

## Problem

Lenders need a threshold decision, not a borrower’s full score and history.

## Proposed product

Lending Credit Verification registers trusted agencies and evaluates a minimum-credit policy from a signed credential without publishing the underlying score.

## Privacy model

Threshold configuration and proof outcome can be audited. Borrower identity, exact score, bureau history, and signature payload remain private.

## User journey

1. Administrator registers an agency.
2. Agency-backed credential is supplied.
3. Contract checks the credit policy.
4. Underwriting dashboard reports eligibility and confirmed activity.

## Success criteria

- Only trusted agencies can produce accepted credentials.
- Valid scores pass the configured threshold.
- Invalid agency or score inputs fail.
- No real financial records are used in testing.

