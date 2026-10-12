# PROOFLY — Production Work Order #2: reviewer evidence (2026-10-12)

> Evidence classification: **user-supplied live production readback**, corroborated by a separately inspected Vercel deployment record. This document does not claim an independent Explorer/GenVM execution attestation.

## What reviewers can reproduce

- Production: https://proofly-lovat.vercel.app/?order=2
- Source: https://github.com/bearbaba/PROOFLY
- Studionet chain ID: `61999` (experimental; no payments/escrow).
- Contract: `0xEbb6E4D791299E79317DE796232029194e0F0aCb`
- Studio: https://studio.genlayer.com/?import-contract=0xEbb6E4D791299E79317DE796232029194e0F0aCb
- Work Order: `2`, title `PROOFLY Demo - User Guide Verification`
- Owner: `0x4c7cb73ac8f8999af21cfc9ff4cf2333a9508dcb`
- Contributor: `0xd6b8a3a5eb329410d9504784812b8569afa8c2af`

## Reported live output

The connected Contributor wallet's production UI displayed a work-order read in finalized on-chain state, with `status=COMPLETED`, one submission, version 1, and submission outcome `ACCEPTED`.

The read-only **Proof Receipt / v1** panel displayed:

| Field | Website output |
| --- | --- |
| Outcome | `ACCEPTED` |
| Criteria | `3 / 3 SATISFIED` |
| Aggregation | `CONSISTENT` |
| Chain | `61999` |
| Evaluated (browser locale) | `18:27:39 12/10/2026` |
| R1 | `SATISFIED` — trial environment, no real money |
| R2 | `SATISFIED` — connect demo account, open draft, select Read |
| R3 | `SATISFIED` — D01 reconnect demo account; D02 reopen draft, retry Read |

The submitted artifact hash shown in the website readback was:
`8a087bffcffd9809daff7c53e56940b3974398ca58976693100b723bd015da1a`.

The reported specification hash was:
`89d9aab213aa4b447ece715e600be95568cb45d7087b0ec60800c30f326a5a68`.

These observations provide a **live hosted two-role workflow result as reported by the user** and are materially stronger than the earlier standalone Studio-only Order #1 evidence. They do *not* by themselves certify deployed source identity or independently prove each transaction's GenVM execution success.

## Transaction audit boundary

The verification transaction tracked by the website is:

https://explorer-studio.genlayer.com/tx/0xee1c89f94341e15455bd25c0705c878a80f3906798d3393c551f8f88ca0acb2c

The website's advanced tracker displayed `CONSENSUS=FINALIZED` but `EXECUTION=UNKNOWN` and `FINALIZED / EXECUTION NOT VERIFIED`. This is **not** a confirmed execution failure or proof of execution success. Inspect GenVM execution and exact method/receipt in Explorer before claiming transaction-level success. **Do not sign or resend** the original verification transaction merely because a simplified SDK receipt is incomplete.

## Production deployment corroboration

The Vercel deployment API identified the production alias `proofly-lovat.vercel.app` as **READY**, with deployed GitHub SHA:
`8d11604fe048aa42e11818aee0230ba59c5a92f3`.

This establishes the deployment SHA/alias reported by Vercel; it is separate from blockchain execution and live browser interaction assertions.

## Recommended 60-second demo

1. Open the public production link with `?order=2`; show the small wallet/network status.
2. Open Work Order #2 and show `COMPLETED`, `ACCEPTED`, and matching criteria.
3. Click **View proof receipt**; show R1/R2/R3, `3 / 3 SATISFIED`, and supporting quotations.
4. Open source/contract in GitHub and Studio; distinguish actual on-chain readback from local integrity checks.
5. State limitations plainly: experimental Studionet, no payments or escrow, no security audit, and independent full GenVM transaction attestation pending.

## Remaining reviewer gates

- [x] Website renders `COMPLETED` and `ACCEPTED` for production Order #2 (user-provided readback).
- [x] Hosted read shows Proof Receipt v1 with three SATISFIED criteria (user-provided readback).
- [x] Production URL resolves to Vercel READY deployment at stated source SHA (Vercel API).
- [ ] Independently inspect GenVM execution receipt for the verification transaction.
- [ ] Archive full authenticated transaction chain for create/accept/submit/evaluate.
- [ ] Attest deployed contract source to reviewed repository bytes.
- [ ] Record live negative/unverifiable and adversarial evaluations.
- [ ] Capture/supply demo recording and obtain submission portal confirmation.
