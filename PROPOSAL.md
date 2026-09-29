# Product Proposal: Lending Credit Verification

**Submission category:** Confidential DeFi  
**Underwriting owner:** `Om12345-ingle`  
**Decision engine:** MVP verified on Preview

## Problem

Lenders need a threshold decision, not a borrower’s full score and history.

## Proposed product

Lending Credit Verification anchors administrator-issued score commitments and evaluates a minimum-credit policy without publishing the underlying score.

## Privacy model

Threshold configuration, issued commitment count, and proof outcome can be audited. Borrower identity, exact score, bureau history, and credential salt remain private.

## User journey

1. Administrator registers an agency.
2. Agency-backed credential is supplied.
3. Contract checks the credit policy.
4. Underwriting dashboard reports eligibility and confirmed activity.

## Success criteria

- Only commitments issued through the administrator circuit are accepted.
- Valid scores pass the configured threshold.
- Invalid agency or score inputs fail.
- No real financial records are used in testing.
