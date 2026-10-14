# PROOFLY V3 — Steward Verification Guide

**The current GenLayer project is PROOFLY Indexed V3 on Studionet (chain ID 61999).**

- Website: https://proofly-lovat.vercel.app/
- Public verified example: https://proofly-lovat.vercel.app/?order=2
- Full user-recorded demo: https://youtu.be/O7_tr9w0peQ
- Deployed Intelligent Contract: `0xb8305F15336a79761157b86e214d3d3DeaDFc1ce`
- Contract in Explorer: https://explorer-studio.genlayer.com/address/0xb8305F15336a79761157b86e214d3d3DeaDFc1ce
- Studio import: https://studio.genlayer.com/?import-contract=0xb8305F15336a79761157b86e214d3d3DeaDFc1ce
- Reviewed source: [Indexed V3 Intelligent Contract](contracts/proofly/milestone_gate_v3_indexed.py)
- V3 transaction and verification log: [Issue #20](https://github.com/bearbaba/PROOFLY/issues/20)

## Why GenLayer is central

PROOFLY binds an owner, a contributor, three agreement criteria, a public commit-pinned reference and a submitted artifact to a milestone. A GenLayer Intelligent Contract fetches the original documents, checks SHA-256 digests, performs semantic assessment through AI consensus and saves a per-criterion Proof Receipt with supporting quotations. A one-time contributor-bound release authorization is available only following an accepted milestone. The frontend displays on-chain records rather than issuing verdicts of its own.

## Positive-path evidence: Work Order #2

The owner supplied consecutive screenshots of the production application on October 14, 2026, showing the following finalized-state readbacks:

| Operation | Observed state | Transaction |
| --- | --- | --- |
| `create_order` | #2 `PROPOSED` | [Explorer](https://explorer-studio.genlayer.com/tx/0x8f47b96b3e5bcfb024f2c6e8825ca79eca4f18d7a4a87aa0e12ac4f8d4f0e7b2) |
| `accept_order` | `ACTIVE` | [Explorer](https://explorer-studio.genlayer.com/tx/0x36fb532dee690ffa2c01d19c54b373fe68ad2c5c02164f1914f851bd4bf1d429) |
| `submit_evidence` | `SUBMITTED`, 1 submission | [Explorer](https://explorer-studio.genlayer.com/tx/0x05724461bc7cd7ba16b7bee9897e2af0aa349f143d8560c9fd1d176eb98e5a72) |
| `evaluate_submission` | `COMPLETED`, `ACCEPTED`, 3/3 `SATISFIED` | [Explorer](https://explorer-studio.genlayer.com/tx/0xa95b6d96d78360825cabe707cfeb97e2669580c01cd8dd73666973dfabfa75a6) |
| `claim_milestone_release` | `RELEASE AUTHORIZED` | [Explorer](https://explorer-studio.genlayer.com/tx/0x90cc1573894a5003e2ed87ad60d04d60b445f426d28a395aeacca6ba1e2dc693) |

The public result for Order #2 has receipt version **1**, outcome **ACCEPTED**, three **SATISFIED** criteria with literal evidence and reference quotations, and a release record for:

- Contributor/recipient: `0xd6b8a3a5eb329410d9504784812b8569afa8c2af`
- Specification digest: `d3db2e96bc20ea6fcd6feb64c08104d279a47f4562405c89595c1afbbf9bdbf3`
- Artifact digest: `397cd4f89a3fb861f52b804b4ebeafe29f91382e8aee226e0cf4abb8d8925894`

## Exact read-only path for stewards

1. Open https://proofly-lovat.vercel.app/?order=2 (a wallet is not required).
2. Click **Load from chain** and read Order #2 as `COMPLETED`.
3. Inspect **Proof receipt**. Confirm `ACCEPTED` and three `SATISFIED` results, each with its supporting evidence/reference quotations.
4. Inspect **Milestone release**. Confirm `RELEASE AUTHORIZED`, the recipient, Order #2, version 1 and both matching digests.
5. Review the deployed [contract](https://explorer-studio.genlayer.com/address/0xb8305F15336a79761157b86e214d3d3DeaDFc1ce), [source](contracts/proofly/milestone_gate_v3_indexed.py) and [full video](https://youtu.be/O7_tr9w0peQ).

## If reproducing with a new signed milestone

Connect an Owner wallet on Studionet 61999. Use the built-in positive demo template, verify the commit-pinned reference and sign `create_order`. With the designated Contributor wallet, accept the agreement and submit the pinned demo artifact. Request GenLayer verification, inspect the returned receipt, and claim release only when accepted. Do not send a duplicate transaction while a prior hash remains unresolved.

## Verification scope and open gates

The five state transitions above are **observed production finalized-state readbacks reported by the user**. The linked hashes were displayed by the web app. This is **not independent authentication of each individual transaction's full GenVM execution record** or an attestation of deployed contract byte-for-byte source identity. Real negative/adversarial cases remain open for Indexed V3, including insufficient evidence, unauthorized caller, duplicate claim, deadlines and prompt-injection resistance. See [the active checklist](https://github.com/bearbaba/PROOFLY/issues/20).

PROOFLY is **experimental testnet software**, not audited mainnet software. It assesses document conformity, not arbitrary off-chain facts. Public evidence must be commit-pinned GitHub text with verified SHA-256. A release authorization is **not a token transfer, payment, escrow or real-world service unlock**. Transaction history is browser-local, not an exhaustive blockchain index.

Frontend production was verified **READY** by Vercel for `c6d072035505027e6f4364dfe5737d3b304bca48` on October 14, 2026. See [README](README.md) for architecture and regression commands.
