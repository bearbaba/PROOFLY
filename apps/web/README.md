# PROOFLY V3 — Indexed Milestone Web Workspace

This directory contains the **current GenLayer Studionet web application** for PROOFLY and its developer utilities. The canonical public entry point is **https://proofly-lovat.vercel.app/**, not a preview website or an archived deploy.

[Launch](https://proofly-lovat.vercel.app/) · [Completed Work Order #2](https://proofly-lovat.vercel.app/?order=2) · [Full demo](https://youtu.be/O7_tr9w0peQ) · [Reviewer guide](../../REVIEWER_EVIDENCE.md)

## Current contract and network

- GenLayer Studionet chain ID: **61999**.
- Indexed V3 Intelligent Contract: `0xb8305F15336a79761157b86e214d3d3DeaDFc1ce`.
- Contract source: [milestone_gate_v3_indexed.py](../../contracts/proofly/milestone_gate_v3_indexed.py).
- Explorer: https://explorer-studio.genlayer.com/address/0xb8305F15336a79761157b86e214d3d3DeaDFc1ce.
- Full observed finalized-state workflow: `PROPOSED → ACTIVE → SUBMITTED → COMPLETED/ACCEPTED → RELEASE AUTHORIZED`, documented under [Work Order #2](https://proofly-lovat.vercel.app/?order=2).

## What this frontend actually does

- **Read-only by default**: anybody may inspect finalized work orders, their requirements, AI Proof Receipts, quotes and on-chain release authorizations without connecting a wallet.
- **Owner signs creation**: the user provides criteria, contributor wallet, deadlines and a commit-pinned public reference. The app hashes and rechecks the document before asking MetaMask for a signature.
- **Contributor signs work actions**: the designated wallet accepts the agreement, then submits a public artifact and matching SHA-256.
- **GenLayer evaluates**: the contract performs AI consensus evaluation. The frontend requests evaluation and then reads the saved receipt; it cannot invent or overwrite a contract verdict.
- **One-time release gate**: an accepted milestone allows its contributor to claim the matching, nontransferable on-chain release authorization.
- **Wallet controls**: explicit Connect Wallet and Disconnect; intentional browser-local disconnect is maintained through refresh.
- **Transaction History**: collapsible list of transactions observed in the current browser, with Explorer links and cautious pending/error classifications.
- **Public completion banner**: shown only after validated finalized-state reads provide a completed milestone, an accepted Proof Receipt and its matching release record.

## Run and test

Node.js 22+ is recommended.

```bash
cd apps/web
npm ci
npm test
npm run build
npx playwright install chromium
npx playwright test
```

To serve a built frontend from the repository root:

```bash
python -m http.server 4173 --directory apps/web
```

The app is static, but the GenLayerJS wallet and RPC integration requires an HTTP(S) origin, browser wallet provider for signed writes, and access to Studionet. Vercel builds the frontend bundle from source; do not assume a local preview reflects the current production deployment.

## Implementation notes

PROOFLY is built for GenLayer Studionet (61999). The frontend performs finalized-state reads and displays criterion-level AI Proof Receipts and milestone release records directly from the Intelligent Contract.

Reference documents and submitted evidence use commit-pinned public GitHub sources with SHA-256 commitments. Transaction History preserves activity in the current browser and links to Explorer. A transaction hash can be inspected in Explorer for execution details.

Release authorization is an on-chain permission record, not a token transfer or escrow.

[**Application**](https://proofly-lovat.vercel.app/) · [**Contract source**](../../contracts/proofly/milestone_gate_v3_indexed.py) · [**Demo video**](https://youtu.be/O7_tr9w0peQ)
