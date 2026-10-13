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
- [ ] Direct Studionet negative test: rejected/insufficient evidence cannot claim — prepared [negative-case runbook](V2_NEGATIVE_MILESTONE_TEST.md) and immutable incomplete artifact; no live result yet
- [ ] Independently capture full write hashes and verify GenVM execution status in Explorer
- [ ] Verify new v2 website with wallet signing and finalized RPC reads, in browser
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
