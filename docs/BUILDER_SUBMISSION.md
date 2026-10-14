# PROOFLY — GenLayer Projects

**Category:** Projects · AI & Agents  
**Focus:** Verifiable Inference · Source Verification

[**Live App**](https://proofly-lovat.vercel.app/) · [**Full Demo Video**](https://youtu.be/O7_tr9w0peQ) · [**Completed Milestone**](https://proofly-lovat.vercel.app/?order=2) · [**On-Chain Evidence**](../REVIEWER_EVIDENCE.md)

## Project summary

**PROOFLY uses GenLayer AI consensus to verify milestone evidence against agreed criteria, publish explainable Proof Receipts, and authorize on-chain release.**

## Project overview

PROOFLY is a GenLayer Studionet application for evidence-based milestone acceptance. An owner creates a work agreement with explicit criteria and a commit-pinned GitHub reference. A designated contributor accepts the immutable specification and submits a SHA-256-verified artifact. A GenLayer Intelligent Contract reads both documents, evaluates each criterion through AI consensus, and saves a public Proof Receipt with supporting quotations and an ACCEPTED, CHANGES_REQUIRED, or EVIDENCE_REQUIRED outcome. Only an accepted milestone permits a one-time, contributor-bound release authorization. The web app supports MetaMask signing, indexed Owner/Contributor work, transaction history, and wallet-free inspection of finalized contract state. Designed for freelance handoffs, documentation delivery, and other verifiable work. Live on Studionet (chain 61999). Release authorization does not transfer tokens, escrow funds, or certify real-world operations.

## Demonstrated functionality

The recorded positive workflow for Indexed V3 Work Order #2 covers:

**Agreement created → Contributor accepted → Evidence submitted → GenLayer AI verified (ACCEPTED, 3/3 SATISFIED) → Release authorized.**

The completed milestone and criterion-level Proof Receipt are publicly accessible at https://proofly-lovat.vercel.app/?order=2.

## Project links

| Resource | URL |
| --- | --- |
| Application | https://proofly-lovat.vercel.app/ |
| Demo | https://youtu.be/O7_tr9w0peQ |
| Source repository | https://github.com/bearbaba/PROOFLY |
| Intelligent Contract source | [milestone_gate_v3_indexed.py](../contracts/proofly/milestone_gate_v3_indexed.py) |
| Studionet contract | [GenLayer Explorer](https://explorer-studio.genlayer.com/address/0xb8305F15336a79761157b86e214d3d3DeaDFc1ce) |
| Live completion evidence | [Proof Receipt and release](../REVIEWER_EVIDENCE.md) |

**Network:** GenLayer Studionet (61999). Release authorization is a nontransferable on-chain permission record, not an escrow or payment.
