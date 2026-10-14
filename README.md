# PROOFLY

**AI-verified milestone acceptance with explainable on-chain evidence, built on GenLayer.**

PROOFLY is an experimental Studionet application for teams, independent contributors, and project owners who need a verifiable way to agree on deliverables and inspect whether submitted documents meet the agreed requirements.

[**Launch PROOFLY**](https://proofly-lovat.vercel.app/) · [**Inspect completed milestone #2**](https://proofly-lovat.vercel.app/?order=2) · [**Watch the full YouTube demo**](https://youtu.be/O7_tr9w0peQ) · [**Steward verification guide**](REVIEWER_EVIDENCE.md)

## Live application and Intelligent Contract

| Item | Current V3 deployment |
| --- | --- |
| Network | GenLayer **Studionet** — chain ID **61999** |
| Website | https://proofly-lovat.vercel.app/ |
| Public completed example | https://proofly-lovat.vercel.app/?order=2 |
| Intelligent Contract | `0xb8305F15336a79761157b86e214d3d3DeaDFc1ce` |
| GenLayer Explorer | [Contract address](https://explorer-studio.genlayer.com/address/0xb8305F15336a79761157b86e214d3d3DeaDFc1ce) |
| GenLayer Studio | [Open deployed contract](https://studio.genlayer.com/?import-contract=0xb8305F15336a79761157b86e214d3d3DeaDFc1ce) |
| Current contract source | [`contracts/proofly/milestone_gate_v3_indexed.py`](contracts/proofly/milestone_gate_v3_indexed.py) |
| Frontend | [`apps/web`](apps/web) |
| Full demo video | https://youtu.be/O7_tr9w0peQ |
| Live verification and open gates | [Issue #20](https://github.com/bearbaba/PROOFLY/issues/20) |

The production URL was confirmed by Vercel as **READY** at frontend commit `c6d072035505027e6f4364dfe5737d3b304bca48` on October 14, 2026. Subsequent documentation commits do not redeploy or modify the Intelligent Contract.

## What GenLayer does

1. **Agree:** A project owner creates a work order with a designated contributor, three explicit criteria, deadlines, and a public GitHub commit-pinned reference whose bytes are checked against SHA-256.
2. **Accept:** The assigned contributor accepts the contract- and order-bound specification with MetaMask.
3. **Submit:** The contributor submits a public, commit-pinned evidence document and its SHA-256 hash.
4. **Evaluate:** A GenLayer Intelligent Contract reads the pinned reference and artifact, invokes GenLayer AI consensus, and stores an outcome and criterion-specific supporting quotations in a publicly readable **Proof Receipt**.
5. **Authorize:** After an `ACCEPTED` receipt, only the assigned contributor may record a **one-time release authorization**, bound to the order and evidence hashes.

GenLayer is not an optional label here: the on-chain Intelligent Contract performs the semantic evaluation and saves the resulting verdict. The website displays validated finalized-state readbacks; it does not invent its own AI verdict.

Outcomes distinguish **SATISFIED**, **UNSATISFIED**, and **UNVERIFIABLE**, which aggregate to **ACCEPTED**, **CHANGES_REQUIRED**, and **EVIDENCE_REQUIRED** as applicable.

## Live positive-path evidence — Work Order #2

On October 14, 2026, the project owner supplied successive production-page screenshots showing the complete Indexed V3 workflow on Studionet:

| Operation | Finalized contract state shown | Explorer transaction |
| --- | --- | --- |
| Owner creates order | `PROPOSED` | [create_order](https://explorer-studio.genlayer.com/tx/0x8f47b96b3e5bcfb024f2c6e8825ca79eca4f18d7a4a87aa0e12ac4f8d4f0e7b2) |
| Contributor accepts | `ACTIVE` | [accept_order](https://explorer-studio.genlayer.com/tx/0x36fb532dee690ffa2c01d19c54b373fe68ad2c5c02164f1914f851bd4bf1d429) |
| Contributor submits evidence | `SUBMITTED`, one submission | [submit_evidence](https://explorer-studio.genlayer.com/tx/0x05724461bc7cd7ba16b7bee9897e2af0aa349f143d8560c9fd1d176eb98e5a72) |
| AI evaluates evidence | `COMPLETED`, `ACCEPTED`, **3/3 SATISFIED** | [evaluate_submission](https://explorer-studio.genlayer.com/tx/0xa95b6d96d78360825cabe707cfeb97e2669580c01cd8dd73666973dfabfa75a6) |
| Contributor claims release | **RELEASE AUTHORIZED** | [claim_milestone_release](https://explorer-studio.genlayer.com/tx/0x90cc1573894a5003e2ed87ad60d04d60b445f426d28a395aeacca6ba1e2dc693) |

The displayed authorization is for **Order #2**, receipt version **1**, recipient `0xd6b8a3a5eb329410d9504784812b8569afa8c2af`, spec SHA-256 `d3db2e96bc20ea6fcd6feb64c08104d279a47f4562405c89595c1afbbf9bdbf3`, and artifact SHA-256 `397cd4f89a3fb861f52b804b4ebeafe29f91382e8aee226e0cf4abb8d8925894`.

**Evidence scope:** the five state transitions and matching release grant were observed in user-provided screenshots of the production app reading finalized contract state. These readbacks are meaningful evidence of the completed workflow, but they are **not independent authentication of each linked transaction's GenVM execution details**. The demo video offers an additional user-recorded demonstration. Detailed evidence and limitations: [REVIEWER_EVIDENCE.md](REVIEWER_EVIDENCE.md) and [issue #20](https://github.com/bearbaba/PROOFLY/issues/20).

## How a steward can verify without a wallet

1. Open [the public Work Order #2](https://proofly-lovat.vercel.app/?order=2).
2. Use **Load from chain** and verify the order status is **COMPLETED**.
3. Inspect **Proof receipt**, **ACCEPTED**, the three **SATISFIED** rows, and the literal artifact/reference quotes.
4. Inspect **Milestone release**. Confirm **RELEASE AUTHORIZED**, recipient, order ID, receipt version and both matching SHA-256 digests.
5. Follow the linked contract in Explorer, the [source](contracts/proofly/milestone_gate_v3_indexed.py), and the [full demo video](https://youtu.be/O7_tr9w0peQ).

To reproduce new signed writes, the owner and contributor need separate authorized MetaMask wallets on Studionet. Review wallet fees before signing, and do not resubmit unresolved transactions.

## Website functionality

- Explicit **Connect Wallet / Disconnect** and wallet-independent public read-only inspection.
- Indexed work discovery for the connected owner or contributor; contextual action for the current finalized state.
- Browser-local, collapsible transaction history with Explorer links and pending-state recovery without automatic resubmission.
- Public completion banner only when the contract provides a validated `COMPLETED` order, accepted Proof Receipt, and matching release grant.
- Standalone draft/preflight and portable receipt-checking utilities retained in the repository for developers.

## Reproduce the source tests

```bash
python -m unittest discover -s tests -p "test_*.py" -v
cd apps/web
npm ci
npm test
npm run build
npx playwright test
```

GitHub CI verifies contract/domain checks, frontend behavior, and browser regressions; mocked CI must not be substituted for real GenLayer transaction evidence.

## Scope and outstanding gates

**Experimental network only.** PROOFLY verifies *document conformity against agreed criteria*, not arbitrary real-world delivery, authenticity of every off-chain statement, or operational status of an external service. The release is a **nontransferable on-chain authorization record**, **not** custody, escrow, token transfer, payment, or automatic external unlock.

Public evidence must currently be hosted as GitHub commit-pinned `.txt` files; PROOFLY has no general-purpose private file hosting. Browser-local transaction history is not an exhaustive blockchain history and may be cleared with site data. The app is **not security audited**.

Remaining work: independently verify each transaction-level GenVM execution result and deployed source identity, perform fresh Indexed V3 negative/adversarial tests (including rejected or duplicate releases), and complete manual RPC/mobile/account-switch reliability checks. These are **open verification gates**, not failures of the observed positive flow.

This README documents **only the current Indexed V3 application and its actual evidence**. It does not use previous deployments to claim proof for this contract.
