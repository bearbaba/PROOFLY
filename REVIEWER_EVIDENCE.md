# PROOFLY V3 — Live Demo & On-Chain Evidence

**A complete milestone workflow on GenLayer Studionet, from agreement to AI-reviewed release authorization.**

[**Live Application**](https://proofly-lovat.vercel.app/) · [**Completed Milestone #2**](https://proofly-lovat.vercel.app/?order=2) · [**Full Demo Video**](https://youtu.be/O7_tr9w0peQ)

## Project links

| Resource | Link |
| --- | --- |
| Network | GenLayer Studionet · Chain ID 61999 |
| Deployed Intelligent Contract | `0xb8305F15336a79761157b86e214d3d3DeaDFc1ce` |
| Contract Explorer | [Open ↗](https://explorer-studio.genlayer.com/address/0xb8305F15336a79761157b86e214d3d3DeaDFc1ce) |
| Studio | [Open contract ↗](https://studio.genlayer.com/?import-contract=0xb8305F15336a79761157b86e214d3d3DeaDFc1ce) |
| Intelligent Contract source | [milestone_gate_v3_indexed.py](contracts/proofly/milestone_gate_v3_indexed.py) |
| Frontend source | [apps/web/milestones.mjs](apps/web/milestones.mjs) |
| Recorded walkthrough | [YouTube video](https://youtu.be/O7_tr9w0peQ) |

## Completed workflow — Work Order #2

The live Studionet demonstration shows an owner and a designated contributor completing the milestone lifecycle. The application displayed these finalized-state results and linked transaction hashes:

| Method | Milestone state | Transaction |
| --- | --- | --- |
| `create_order` | `PROPOSED` | [0x8f47b96b… ↗](https://explorer-studio.genlayer.com/tx/0x8f47b96b3e5bcfb024f2c6e8825ca79eca4f18d7a4a87aa0e12ac4f8d4f0e7b2) |
| `accept_order` | `ACTIVE` | [0x36fb532d… ↗](https://explorer-studio.genlayer.com/tx/0x36fb532dee690ffa2c01d19c54b373fe68ad2c5c02164f1914f851bd4bf1d429) |
| `submit_evidence` | `SUBMITTED` · 1 submission | [0x05724461… ↗](https://explorer-studio.genlayer.com/tx/0x05724461bc7cd7ba16b7bee9897e2af0aa349f143d8560c9fd1d176eb98e5a72) |
| `evaluate_submission` | `COMPLETED` · **ACCEPTED, 3/3 SATISFIED** | [0xa95b6d96… ↗](https://explorer-studio.genlayer.com/tx/0xa95b6d96d78360825cabe707cfeb97e2669580c01cd8dd73666973dfabfa75a6) |
| `claim_milestone_release` | **RELEASE AUTHORIZED** | [0x90cc1573… ↗](https://explorer-studio.genlayer.com/tx/0x90cc1573894a5003e2ed87ad60d04d60b445f426d28a395aeacca6ba1e2dc693) |

## Proof Receipt

The finalized-state readback for Order #2 contains:

| Attribute | Value |
| --- | --- |
| Status | `COMPLETED` |
| Verdict | **ACCEPTED** |
| Acceptance criteria | **3 / 3 SATISFIED** |
| Receipt version | `1` |
| Criterion-level evidence | Artifact quotations and matching agreed-reference quotations |
| Specification SHA-256 | `d3db2e96bc20ea6fcd6feb64c08104d279a47f4562405c89595c1afbbf9bdbf3` |
| Artifact SHA-256 | `397cd4f89a3fb861f52b804b4ebeafe29f91382e8aee226e0cf4abb8d8925894` |

### Release Authorization

The contract readback records **RELEASE AUTHORIZED** for the same Order #2 and receipt version 1, with contributor/recipient `0xd6b8a3a5eb329410d9504784812b8569afa8c2af`. The release record includes the same specification and artifact hashes as the accepted milestone.

[**Open the completed milestone and its Proof Receipt ↗**](https://proofly-lovat.vercel.app/?order=2)

## Why GenLayer matters

PROOFLY uses an **Intelligent Contract** to check the immutable reference and delivered document, evaluate each acceptance criterion through AI consensus, and persist an explainable outcome with supporting excerpts. The website is a user interface for contract-backed milestones, not a separate off-chain source of AI decisions.

The workflow covers agreement creation, contributor acceptance, evidence submission, AI evaluation, and a contributor-bound release record.

**Technical note:** This demonstration is on Studionet. The table reflects the finalized-state readbacks and transaction links shown in the application; transaction-level GenVM execution is independently inspectable in Explorer. Release authorization is a record, not a payment.

[**GitHub verification log**](https://github.com/bearbaba/PROOFLY/issues/20) · [**Project README**](README.md)
