# PROOFLY V2 — Rejected / insufficient-evidence milestone runbook

**Status: prepared, NOT executed on Studionet.** Do not present this as a passed test until actual transaction hashes, GenVM results, and finalized reads have been recorded.

## Goal
Prove that the on-chain release authorization is unavailable when the submitted work does not meet the agreed R1/R2/R3 acceptance specification. The negative test must not depend on a UI-supplied verdict.

## Immutable documents

Agreed rubric (same content used in successful Order #1, but a **new order** must be created, accepted, and have its own unique spec commitment):
- URL: `https://raw.githubusercontent.com/bearbaba/PROOFLY/4671020f77d3193f9ceacc635b1fa0dd352c6598/fixtures/evidence/milestone-v2-acceptance-reference.txt`
- SHA-256: `0b39481c3ca9bff673adb40d08eb2d0b04cb27ab4510255d3b699778826f1aec`

Intentionally incomplete delivery:
- URL: `https://raw.githubusercontent.com/bearbaba/PROOFLY/5a98c6be3d74b110ca711e46a30349cb8914e6e1/fixtures/evidence/milestone-v2-incomplete-handoff.txt`
- SHA-256: `72a9056d2846be017eceb017746860e31c82abe8f9f131a866c02823f71bd5a6`
- Bytes: 923 (UTF-8, LF newline, including final LF).
- Why it fails: R3 instructions for `AUTH_401`, `RATE_429`, `Retry-After` and disabling on repeated errors are **not provided**. R1 and R2 are deliberately present. Mentioning error codes in a description of missing content must not count as providing the required remedies.

## Test in GenLayer Studio

Contract: `0xD67245387dF5448671235CE00c8969664b5aF8bd`; chain 61999; Normal (Full Consensus); Simulation OFF. Use only demo wallets with testnet GEN and check the fee before any signature. Every write should be submitted **once** and independently inspected for GenVM result; if finality/execution is unclear, do not retry.

1. **Owner** calls `create_order` with the same three acceptance criteria as successful Work Order #1, same immutable reference URL/hash, a new descriptive title (`Sandbox Integration Negative Acceptance Test`), Contributor `0xd6b8a3a5eb329410d9504784812b8569afa8c2af`, and **future** submission/revision deadlines. Derive exact UNIX seconds immediately before creating; never reuse expired deadlines. Read `next_order` and `get_order` afterwards. Do not assume the new ID is `2` until confirmed.
2. **Contributor** calls `accept_order(new_id, new_spec_sha256)`. Copy the **new** `spec_sha256` returned by `get_order`; never reuse the Order #1 digest.
3. **Contributor** calls `submit_evidence(new_id, incomplete_artifact_url, incomplete_artifact_sha256)`. Verify that the submission is bound to the expected pinned document.
4. Any wallet calls `evaluate_submission(new_id)` once, then reads `get_order` and `get_receipt(new_id,1)`. Expected: R3 not SATISFIED, so outcome is not ACCEPTED and order remains `REVIEWED`. **The AI/consensus determines the actual status; this is an expectation, not a guaranteed outcome.** If AI incorrectly accepts the incomplete document, record that as a failure and investigate; do not fabricate a passing negative result.
5. **Contributor** attempts `claim_milestone_release(new_id)` after a confirmed non-ACCEPTED verdict. Expected **GenVM ERROR / Rollback**, `MILESTONE_NOT_ACCEPTED`. Verify `get_milestone_release(new_id)` is empty afterwards; the Studio UI may render the empty return as no text. If the transaction is signed, it may incur testnet fees even though it rolls back.
6. For review, capture complete Explorer links/hash, chain/contract/from/method, transaction FINALIZED + **GenVM execution result** separately, and the final `get_order`, `get_receipt`, `get_milestone_release` reads. Never equate FINALIZED with successful execution.

## Integrity and scope
- This is **documentation conformance to a jointly agreed rubric**, not an independent claim about a live external API.
- Authorization is an **on-chain record only**; there is no GEN/USDC transfer or escrow.
- One passing test or a green CI cannot replace real adversarial transaction evidence.
- Successful execution on Order #1 does not prove these negative expectations on a new order.
