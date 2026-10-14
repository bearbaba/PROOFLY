# PROOFLY

### Verified work. Provable release.

**PROOFLY** brings milestone agreements, evidence assessment, and explainable on-chain outcomes into one GenLayer-powered workspace.

Project owners define what success looks like. Contributors accept the agreement and submit evidence. A GenLayer Intelligent Contract evaluates that evidence against the original requirements and publishes a **Proof Receipt** with a result and supporting quotations. Accepted milestones can then generate a contributor-bound **release authorization**.

[**Launch App ↗**](https://proofly-lovat.vercel.app/) · [**Watch Full Demo ↗**](https://youtu.be/O7_tr9w0peQ) · [**Explore Completed Milestone ↗**](https://proofly-lovat.vercel.app/?order=2)

## The workflow

| Stage | What happens |
| --- | --- |
| **01 · Agreement** | An owner defines a milestone, contributor, acceptance criteria, deadlines, and a SHA-256-bound reference document. |
| **02 · Acceptance** | The assigned contributor accepts the immutable specification using MetaMask. |
| **03 · Evidence** | The contributor submits a commit-pinned public artifact with its SHA-256 digest. |
| **04 · AI verification** | GenLayer evaluates each criterion and records an explainable **Proof Receipt** with supporting citations. |
| **05 · Release** | An accepted milestone enables a **one-time, contributor-bound release authorization** on-chain. |

## Built around GenLayer Intelligent Contracts

PROOFLY uses GenLayer where ordinary deterministic contracts cannot make the full decision: **interpreting whether submitted work satisfies written acceptance criteria**.

The Intelligent Contract binds the agreement and submitted documents to their hashes, reads the pinned public sources, evaluates the requirements through GenLayer's AI consensus workflow, and records results as contract state.

Each requirement can be marked **SATISFIED**, **UNSATISFIED**, or **UNVERIFIABLE**. The milestone receipt communicates an aggregate outcome such as **ACCEPTED**, **CHANGES_REQUIRED**, or **EVIDENCE_REQUIRED**, along with excerpts from the artifact and agreed reference.

The interface reads the contract's saved state; it does not generate an independent AI verdict.

## Live GenLayer demo

**Work Order #2 — Sandbox API Integration Handoff**

The recorded Studionet workflow progressed through all five stages:

| Action | Recorded order state | Transaction |
| --- | --- | --- |
| Create milestone | `PROPOSED` | [Explorer ↗](https://explorer-studio.genlayer.com/tx/0x8f47b96b3e5bcfb024f2c6e8825ca79eca4f18d7a4a87aa0e12ac4f8d4f0e7b2) |
| Accept agreement | `ACTIVE` | [Explorer ↗](https://explorer-studio.genlayer.com/tx/0x36fb532dee690ffa2c01d19c54b373fe68ad2c5c02164f1914f851bd4bf1d429) |
| Submit evidence | `SUBMITTED` | [Explorer ↗](https://explorer-studio.genlayer.com/tx/0x05724461bc7cd7ba16b7bee9897e2af0aa349f143d8560c9fd1d176eb98e5a72) |
| Run AI evaluation | `COMPLETED` · **ACCEPTED, 3/3 SATISFIED** | [Explorer ↗](https://explorer-studio.genlayer.com/tx/0xa95b6d96d78360825cabe707cfeb97e2669580c01cd8dd73666973dfabfa75a6) |
| Claim release | **RELEASE AUTHORIZED** | [Explorer ↗](https://explorer-studio.genlayer.com/tx/0x90cc1573894a5003e2ed87ad60d04d60b445f426d28a395aeacca6ba1e2dc693) |

**[View the completed on-chain milestone ↗](https://proofly-lovat.vercel.app/?order=2)** · **[Watch the end-to-end demo on YouTube ↗](https://youtu.be/O7_tr9w0peQ)**

The completed receipt contains three satisfied requirements with supporting quotations. Its release record is bound to the same milestone, contributor, and accepted artifact.

[**Detailed demo evidence and transaction links**](REVIEWER_EVIDENCE.md)

## Product experience

- **One workspace** for owners and contributors, with context-aware actions for each milestone stage.
- **Connect / Disconnect Wallet** with explicit user control and MetaMask signing.
- **My Work** discovery for wallet-associated milestones.
- **Transaction History** with saved local activity and links to GenLayer Explorer.
- **Public read-only access** to milestone state, Proof Receipts, and release authorizations.
- **Milestone completion banner** backed by a completed order, accepted receipt, and matching release record.
- **Commit-pinned GitHub sources + SHA-256** for reproducible agreement and evidence references.

## Deployment and source

| Resource | Link |
| --- | --- |
| **Live app** | [proofly-lovat.vercel.app](https://proofly-lovat.vercel.app/) |
| **Network** | GenLayer Studionet · Chain ID **61999** |
| **Intelligent Contract** | `0xb8305F15336a79761157b86e214d3d3DeaDFc1ce` |
| **Explorer** | [View contract ↗](https://explorer-studio.genlayer.com/address/0xb8305F15336a79761157b86e214d3d3DeaDFc1ce) |
| **Studio** | [Open contract ↗](https://studio.genlayer.com/?import-contract=0xb8305F15336a79761157b86e214d3d3DeaDFc1ce) |
| **Contract source** | [milestone_gate_v3_indexed.py](contracts/proofly/milestone_gate_v3_indexed.py) |
| **Frontend source** | [apps/web](apps/web) |
| **Video** | [PROOFLY V3 — End-to-End Demo](https://youtu.be/O7_tr9w0peQ) |

## Development

```bash
# Contract and domain regressions
python -m unittest discover -s tests -p "test_*.py" -v

# Web app checks
cd apps/web
npm ci
npm test
npm run build
npx playwright install chromium
npx playwright test
```

**Network note:** PROOFLY currently runs on GenLayer **Studionet**. A release authorization is an on-chain record, **not** an escrow payment or token transfer.
