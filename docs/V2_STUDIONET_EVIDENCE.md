# PROOFLY V2 — Studionet milestone acceptance evidence

Status: **Observed on-chain through user-supplied GenLayer Studio finalized-state reads**, October 13, 2026. Not an independently reproduced deployment receipt or complete attack-surface audit.

## Deployment identity
- Chain: GenLayer Studionet, chain ID **61999**
- V2 contract: `0xD67245387dF5448671235CE00c8969664b5aF8bd`
- Owner: `0x4c7cb73ac8f8999af21cfc9ff4cf2333a9508dcb`
- Contributor: `0xd6b8a3a5eb329410d9504784812b8569afa8c2af`
- V1 contract remains separate and unchanged: `0xEbb6E4D791299E79317DE796232029194e0F0aCb`
- Explorer: https://explorer-studio.genlayer.com/address/0xD67245387dF5448671235CE00c8969664b5aF8bd

## Work Order #1: sandbox integration handoff

- `id`: `1`
- Title: `Sandbox API Integration Handoff`
- Policy: `proofly.milestone-acceptance.v2`
- Source policy: `AGREED_SPEC_ONLY_V1`
- Spec SHA-256: `90910a50b3c96a831d13f8a5a085063c4aeb44b91c0e474d12cee8d2bb5c94cd`
- Reference: https://raw.githubusercontent.com/bearbaba/PROOFLY/4671020f77d3193f9ceacc635b1fa0dd352c6598/fixtures/evidence/milestone-v2-acceptance-reference.txt
- Reference SHA-256: `0b39481c3ca9bff673adb40d08eb2d0b04cb27ab4510255d3b699778826f1aec`
- Artifact: https://raw.githubusercontent.com/bearbaba/PROOFLY/b5c70fbb95bd03f9e65d630292c9ac0af2f38eb0/fixtures/evidence/milestone-v2-sandbox-handoff.txt
- Artifact SHA-256: `397cd4f89a3fb861f52b804b4ebeafe29f91382e8aee226e0cf4abb8d8925894`

## Observed state transitions

1. `create_order`: subsequent `get_order("1")` returned `PROPOSED` with agreed immutable rubric.
2. `accept_order`: subsequent read returned `ACTIVE`, `accepted_at=1791857211`.
3. `submit_evidence`: subsequent read returned `SUBMITTED`, one submission version 1, `submitted_at=1791857476`.
4. `evaluate_submission`: subsequent read returned `COMPLETED`; submission outcome `ACCEPTED`.
5. `get_receipt("1", 1)`: version 1; schema `proofly.milestone-acceptance.v2`; chain ID 61999; matching contract/digests; evaluated_at `1791857650`. All three criteria `R1`, `R2`, `R3` returned `SATISFIED`, `reason_code=EVIDENCE_SUPPORTS`, grounded artifact and reference quotes.
6. `claim_milestone_release("1")`: subsequent `get_milestone_release("1")` returned a grant with:
   - `order_id=1`
   - `recipient=0xd6b8a3a5eb329410d9504784812b8569afa8c2af`
   - `policy=AGREED_SPEC_ONLY_V1`
   - `receipt_version=1`
   - `spec_sha256=90910a50b3c96a831d13f8a5a085063c4aeb44b91c0e474d12cee8d2bb5c94cd`
   - `artifact_sha256=397cd4f89a3fb861f52b804b4ebeafe29f91382e8aee226e0cf4abb8d8925894`
   - `authorized_at=1791858161`

## What the demonstration proves — and does not

The state transition and receipt demonstrate **documentation conformance to a bounded, mutually agreed specification**, and a **consequential one-time on-chain authorization** based on that accepted verdict. The AI is not trusted to certify arbitrary real-world truth. The release authorization **does not transfer assets, unlock escrow, or prove that any real API was deployed**.

## Remaining release gates

- [x] Positive manual Studio flow, including release claim and final-state readback
- [x] Scoped immutable reference and submission digests observed on-chain
- [x] Quote-backed receipt with three satisfied criteria
- [x] Direct Studionet negative test: Owner (non-Contributor) claiming release — FINALIZED / GenVM ERROR / Rollback / ONLY_CONTRIBUTOR
- [x] Direct Studionet negative test: duplicate release claim — FINALIZED / GenVM ERROR / Rollback / RELEASE_ALREADY_CLAIMED
- [x] Direct Studionet negative test: deficient evidence results in CHANGES_REQUIRED, release claim rolled back with MILESTONE_NOT_ACCEPTED (Work Order #2; links below)
- [x] Capture complete Explorer hashes and GenVM execution results for Work Order #2 create, accept, submit, evaluate, and denied claim
- [x] User-observed website wallet signing for create_order, accept_order and submit_evidence, with subsequent finalized-state readbacks; older transaction tracking was unreliable and a separate recovery fix has passed CI
- [ ] Perform adversarial security review and launch checklist

**Do not** treat a green GitHub CI or Vercel READY deployment as proof of live signing behavior or completion of the negative Studionet tests.

## Live adversarial test: duplicate milestone release blocked

Source: [GenLayer Explorer transaction](https://explorer-studio.genlayer.com/tx/0x0e435e25a54b86048644394051d061f76c710e07dcdef93975409f23edd8a7e3), transcribed from the Explorer page supplied by the tester, October 13, 2026 at 09:45:58 local time.

- Transaction: `0x0e435e25a54b86048644394051d061f76c710e07dcdef93975409f23edd8a7e3`
- From: `0xd6b8a3a5eb329410d9504784812b8569afa8c2af` (assigned contributor)
- To: `0xD67245387dF5448671235CE00c8969664b5aF8bd`
- Method: `claim_milestone_release`, parameter `order_id=1`
- Value: `0 GEN`; Execution mode: `Normal`; validators: 5
- Transaction status: `FINALIZED`; consensus result: `Accepted`
- **GenVM execution result: `ERROR`**, result code **`Rollback`**
- **Contract error message: `RELEASE_ALREADY_CLAIMED`**

**Interpretation:** Consensus accepted/finalized the transaction, but the contract **rejected its execution and rolled back**. This is a successful *negative test*, not a successful second claim. The previously observed release grant had already been recorded; the duplicate attempt did not issue another authorization. A separate post-attempt finalized-state read may additionally confirm that the grant remains unchanged.

## Live adversarial test: unauthorized Owner claim blocked

Source: [GenLayer Explorer transaction](https://explorer-studio.genlayer.com/tx/0x58c988fd241e854f198c78f6cbc5b33b36b475bb8488b045506220dd8aa09619), transaction details provided by the tester, October 13, 2026 at 09:50:53 local time.

- Transaction: `0x58c988fd241e854f198c78f6cbc5b33b36b475bb8488b045506220dd8aa09619`
- From: `0x4c7cb73ac8f8999af21cfc9ff4cf2333a9508dcb` (**Owner, not the Contributor**)
- To: `0xD67245387dF5448671235CE00c8969664b5aF8bd`
- Method: `claim_milestone_release`; `order_id=1`
- Value: `0 GEN`; execution mode: `Normal`; initial validators: 5
- Transaction: `FINALIZED`; consensus: `Accepted`
- **GenVM execution: `ERROR` / `Rollback`**
- **Error: `ONLY_CONTRIBUTOR`**

**Interpretation:** The Owner's transaction was finalized by consensus, but contract execution rolled back because the caller was not the assigned Contributor. This validates the role authorization guard on the live deployment for this tested non-Contributor address. It is not evidence of a successfully issued release, nor a proof that every other address was tested.

## Live Preview wallet write: create_order succeeded

User-provided GenLayer Explorer transaction: https://explorer-studio.genlayer.com/tx/0xa7c782f969c88e726b13b527ba0299d7bf92af9c6f758376736797c0fd1ec012

- From Owner: `0x4c7cb73ac8f8999af21cfc9ff4cf2333a9508dcb`
- To V2 contract: `0xD67245387dF5448671235CE00c8969664b5aF8bd`
- Method: `create_order`, title: `Sandbox Integration Negative Acceptance Test`
- Contributor: `0xd6b8a3a5eb329410d9504784812b8569afa8c2af`
- Reference digest: `0b39481c3ca9bff673adb40d08eb2d0b04cb27ab4510255d3b699778826f1aec`
- Deadline timestamps: submission `1792035036`, revision `1792467036`
- Transaction `FINALIZED`, consensus `Accepted`, **GenVM execution `SUCCESS`, result code `Return`**, return `null`.
- MetaMask and preview signing was user-observed. **Work Order #2 was verified** by `next_order` and `get_order(2)` finalized-state reads. Acceptance, submission, evaluation, and release denial were subsequently verified; see below.

This demonstrates a real website-originated write path. The separate negative milestone workflow was later verified with on-chain execution and finalized-state readbacks below.

## Work Order #2: real negative artifact submission

Tester-provided [Explorer transaction](https://explorer-studio.genlayer.com/tx/0x281a2d0e2924231e5d9717c1f5b8222d151507e5b9e9cdcf50313b7aff5c0602): `0x281a2d0e2924231e5d9717c1f5b8222d151507e5b9e9cdcf50313b7aff5c0602`. Contributor `0xd6b8a3a5eb329410d9504784812b8569afa8c2af` called `submit_evidence(2, https://raw.githubusercontent.com/bearbaba/PROOFLY/5a98c6be3d74b110ca711e46a30349cb8914e6e1/fixtures/evidence/milestone-v2-incomplete-handoff.txt, 72a9056d2846be017eceb017746860e31c82abe8f9f131a866c02823f71bd5a6)`.

Transaction **FINALIZED**, consensus **Accepted**, GenVM execution **SUCCESS / Return**. This proves the intended incomplete artifact was submitted successfully; **it does not yet establish** that the finalized order shows `SUBMITTED`, what AI consensus outcome is, or that a release attempt was denied. Read `get_order("2")` next, then evaluate the submission exactly once.

The old frontend showed `FINALIZED_VERDICT_UNKNOWN` even though Explorer proved successful execution. Never re-submit the same evidence due to a frontend timeout.

## Complete negative acceptance workflow — Work Order #2 (13 October 2026)

The following are **tester-provided Explorer transaction details and accepted-state Studio readbacks**. The claims are limited to this contract, these addresses, and this tested workflow. Studio's empty result display for the release read should be interpreted alongside, not in place of, the explicit claim rollback.

| Step | Explorer | Observed execution and finalized state |
| --- | --- | --- |
| Owner creates order #2 | [create_order](https://explorer-studio.genlayer.com/tx/0xa7c782f969c88e726b13b527ba0299d7bf92af9c6f758376736797c0fd1ec012) | FINALIZED, GenVM SUCCESS; `get_order(2)` PROPOSED |
| Contributor accepts spec | [accept_order](https://explorer-studio.genlayer.com/tx/0x1984f4b9545f6685fb699fc572668f696fc84295089cc227533e7f6622fc62e4) | FINALIZED, GenVM SUCCESS; `get_order(2)` ACTIVE |
| Contributor submits incomplete handoff | [submit_evidence](https://explorer-studio.genlayer.com/tx/0x281a2d0e2924231e5d9717c1f5b8222d151507e5b9e9cdcf50313b7aff5c0602) | FINALIZED, GenVM SUCCESS; `get_order(2)` SUBMITTED, version 1 |
| GenLayer evaluates evidence | [evaluate_submission](https://explorer-studio.genlayer.com/tx/0x2f17900df6961efa6a81eca16f449d2a0b6aa99027d15c834c2d1f4b2775dbbb) | FINALIZED, GenVM SUCCESS; equivalence output R1 SATISFIED, R2 SATISFIED, R3 **UNSATISFIED** / REQUIREMENT_NOT_MET |
| Contributor attempts release | [claim_milestone_release](https://explorer-studio.genlayer.com/tx/0xca2a98c928199f1b35f38c3e478cd74aae9dd58df546814a217636c21671ca6f) | FINALIZED, consensus Accepted, but **GenVM ERROR / Rollback: MILESTONE_NOT_ACCEPTED** |

Final `get_order("2")` read: **REVIEWED**; `submissions[0].outcome = "CHANGES_REQUIRED"`; artifact SHA-256 `72a9056d2846be017eceb017746860e31c82abe8f9f131a866c02823f71bd5a6`; spec SHA-256 `da625e875772ac92517adb1c1e33d3807e77318a68f8d8f03b53c18472a842ee`. The tester reported `get_milestone_release("2")` showed no authorization; Studio's empty output alone is not sufficient to establish a typed null.

For the **evaluated artifact**, R3 intentionally omits practical recovery instructions: `AUTH_401` credential refresh/retry, `RATE_429` Retry-After, and shutdown/log preservation. The equivalence output cites the omission, while R1 and R2 were supported by matching quotations. This demonstrates a grounded **negative acceptance** result; it does not establish correctness on arbitrary unseen documents.

**Finality warning:** `FINALIZED` and `Consensus Result: Accepted` are transaction-level states. A denied contract call can have both while GenVM reports an execution rollback. The on-chain claim did not succeed.

## Frontend limitation and remediation

The original Preview wallet transactions succeeded on-chain but sometimes left the browser at `TRACKING_UNRESOLVED`, due to incomplete local transaction context, receipt variability, and a busy-state refresh bug. The subsequent v2 frontend change records method/account/order/evidence metadata, reconciles exact finalized-state effects, and has CI tests for mismatched hashes, users, submissions, and versions. **CI and deployment status do not substitute for fresh real-browser recovery verification**. Earlier browser localStorage entries containing only a hash are deliberately not auto-cleared.

## Reviewer-safe claim

"PROOFLY v2 is an experimental GenLayer Studionet milestone acceptance gate. In the observed positive workflow, a quote-backed ACCEPTED document verdict allowed a contributor-bound, one-time on-chain authorization. In the observed negative workflow, AI identified an unsatisfied agreed criterion, stored CHANGES_REQUIRED, and the contract rolled back an attempted release. Duplicate and unauthorized claims also rolled back. This is not escrow, a token payout, or a security audit."
