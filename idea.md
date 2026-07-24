# Project Idea: Age / Eligibility Gate (Credit Score Lending Gate)

An eligibility check system that lets users prove their creditworthiness (e.g., credit score >= 700) to DeFi lending pools without exposing their actual credit score, outstanding debt, or personal financial details.

## 1. Midnight Network Specialty (ZK & Privacy Features)
*   **Threshold Assertions:** Allows financial platforms to verify compliance rules (credit score >= 700) without receiving the actual score, preserving user financial privacy.
*   **Decoupled Auditing:** The user imports a signed credit record from a credit bureau. The ZK circuit checks the bureau's signature and verifies the score threshold entirely off-chain on the borrower's local machine.
*   **On-Chain Verification:** The lending contract only receives a yes/no proof of eligibility, preventing the recording of sensitive financial data.

## 2. Technical Architecture (Compact Contract)
*   **Public State:**
    *   `min_score_required`: Public minimum score limit (e.g., 700).
    *   `registered_bureaus`: Public keys of accredited credit scoring agencies.
*   **Private State (Borrower Wallet):**
    *   `credit_score`: The user's actual numerical credit score.
    *   `bureau_signature`: Signature from an agency in `registered_bureaus` confirming the score.
*   **Circuits (ZK Proofs):**
    *   `verify_credit_eligibility(credit_score, bureau_signature)`:
        1. Checks that the `bureau_signature` matches a public key in `registered_bureaus`.
        2. Asserts that `credit_score >= min_score_required`.
        *Output:* A boolean assertion proof validating lending eligibility.

## 3. Frontend & Integration (Level 3 Focus)
*   **User Interface:** A lending portal. Borrowers connect their wallets, import their credit certificate (JSON file), select a lending pool, generate the ZK proof, and click "Request Loan".
*   **Lace/Midnight Wallet Integration:**
    *   Saves the credit record securely in local wallet storage.
    *   Calculates ZK threshold proofs.

## 4. Verification & Testing Plan
*   **Unit Tests:**
    *   Assert that a credit score of 720 successfully generates a loan eligibility proof.
    *   Assert that a credit score of 680 fails the ZK circuit.
    *   Verify that forged bureau signatures are rejected.

---

## 5. How to Build & Deploy on Midnight
To build this project without errors, refer to the master build guide located at the root of the workspace: [BUILD_GUIDE.md](file:///Users/neelsubhashpote/moonlight/BUILD_GUIDE.md). It details how to:
1. Fix language pragma version mismatches.
2. Resolve SDK `4.x` dependency issues.
3. Start the Docker-based local ZK proof server.
4. Deploy the contract using a custom `deploy.mjs` script.
5. Prevent DUST gas errors.
