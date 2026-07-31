# Verification checklist

The executable contract suite is `src/test/credit.test.ts`.

```bash
npm test
npm run compile
npm run build
```

Five passing scenarios cover initialization, trusted-agency registration, a valid private credit proof, below-threshold rejection, and untrusted-agency rejection. The tests verify eligibility without exposing the applicant’s exact credit score.

CI runs the contract and frontend verification jobs on every push and pull request.
