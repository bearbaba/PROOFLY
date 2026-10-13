# PROOFLY V2 — Submission Packet (reviewer-facing)

## Project
**Name:** PROOFLY V2 — Consensus-Gated Milestone Acceptance

**Repository:** https://github.com/bearbaba/PROOFLY

**Pull request (candidate, Draft):** https://github.com/bearbaba/PROOFLY/pull/16

**Latest preview:** Deployments are ephemeral; obtain the current READY URL from the PR / Vercel. Open `/milestones.html?order=1` on that URL.

**Deployed GenLayer Studionet contract:** https://explorer-studio.genlayer.com/address/0xD67245387dF5448671235CE00c8969664b5aF8bd

**Chain ID:** 61999

## Problem solved

Agreement disputes around document-based delivery should not depend on a classifier making unsupported truth claims or on an operator manually declaring payment eligibility. Both parties agree to an immutable rubric and reference first; the contributor submits evidence; GenLayer produces a quote-grounded consensus receipt; the assigned contributor can claim a single on-chain milestone release authorization only if the latest receipt is ACCEPTED. This is an actionable state change within the smart contract.

**Scope disclaimer:** This evaluates *whether a public delivered document conforms to an agreed written specification*. It does not prove a production API is running, adjudicate external legal facts, transfer USDC/GEN, or escrow user funds.

## Real demonstration — observed on Studionet
- Contract: `0xD67245387dF5448671235CE00c8969664b5aF8bd`
- Work Order: `#1`, “Sandbox API Integration Handoff”
- State transitions: `PROPOSED → ACTIVE → SUBMITTED → COMPLETED`
- AI receipt: `ACCEPTED`, R1/R2/R3 `SATISFIED`, with exact artifact/reference quotes
- Consequence: `get_milestone_release("1")` returned a stored authorization for Contributor `0xd6b8a3a5eb329410d9504784812b8569afa8c2af` matching spec and artifact hashes, version 1.
- Preview was observed displaying the finalized-state order, criterion receipt and on-chain release.

## Adversarial live execution proof

**Duplicate claim**: [Transaction 0x0e435e25…](https://explorer-studio.genlayer.com/tx/0x0e435e25a54b86048644394051d061f76c710e07dcdef93975409f23edd8a7e3) — `FINALIZED` by consensus; **GenVM ERROR / Rollback**, error `RELEASE_ALREADY_CLAIMED`.

**Wrong caller**: [Transaction 0x58c988fd…](https://explorer-studio.genlayer.com/tx/0x58c988fd241e854f198c78f6cbc5b33b36b475bb8488b045506220dd8aa09619) — Owner called contributor-only release; `FINALIZED` by consensus; **GenVM ERROR / Rollback**, error `ONLY_CONTRIBUTOR`.

In neither negative transaction does FINALIZED mean execution success.

## Technical boundaries

- Agree to `proofly.milestone-acceptance.v2` and `AGREED_SPEC_ONLY_V1`.
- Public commit-pinned GitHub .txt reference and delivery are bound to SHA-256.
- Spec commitment binds contract, chain, order, owner, contributor and rubric.
- Evidence is fetched in nondeterministic execution; validators check document identity and citation grounding.
- Only the assigned Contributor can claim once, after an ACCEPTED receipt matching the latest submission.
- The release is a **nontransferable stored authorization**, not a payment.

## Final uncompleted checks: do not fabricate

- [ ] Non-ACCEPTED milestone cannot claim: [runbook](V2_NEGATIVE_MILESTONE_TEST.md); new Work Order live tx and receipt still required.
- [ ] Verify Vercel Preview **wallet write** (EIP-1193 MetaMask) on a fresh order, and capture execution status; only read-back on Preview has been witnessed so far.
- [ ] Capture complete successful write transaction hashes if demanded by reviewers.
- [ ] Production merge/release review. V1 remains the current production app.

## Suggested submission text (edit once final negative test is completed)

> PROOFLY V2 uses GenLayer consensus to evaluate immutable, mutually agreed delivery criteria against commit-pinned evidence, producing a criterion-level, quote-backed receipt. An ACCEPTED receipt activates a one-time contributor-bound milestone release authorization on Studionet. The complete positive flow has been observed live on Work Order #1; independent transactions demonstrate that duplicate claims and unauthorized Owner claims roll back on-chain. Evidence is explicitly scoped to document conformance, not real-world API truth or token payments. Source, deployed address, Explorer proofs and the functional preview are linked above.

Video instructions: [V2_VIDEO_SUBMISSION_CHECKLIST.md](V2_VIDEO_SUBMISSION_CHECKLIST.md); live-test sources: [V2_STUDIONET_EVIDENCE.md](V2_STUDIONET_EVIDENCE.md).
