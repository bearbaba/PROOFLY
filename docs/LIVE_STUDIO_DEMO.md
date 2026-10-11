# PROOFLY — Live Studio Order #1: verification result

**Observed 2026-10-11.** This is a manual **GenLayer Studio demo**
reconstructed from the user's pasted Studio readbacks and screenshot. The
repository preserves the exact reported Proof Receipt JSON in
[`docs/evidence/studionet-order-1-receipt.json`](evidence/studionet-order-1-receipt.json).
**No Explorer transaction hash, independently authenticated chain read or
deployed bytecode attestation has been collected yet.**

## Deployed demo instance reported by the owner

- Studio: https://studio.genlayer.com/?import-contract=0xEbb6E4D791299E79317DE796232029194e0F0aCb
- Contract: `0xEbb6E4D791299E79317DE796232029194e0F0aCb`
- Chain ID reported inside receipt: `61999` (Studionet)
- Owner: `0x4c7cb73ac8f8999af21cfc9ff4cf2333a9508dcb`
- Contributor: `0xd6b8a3a5eb329410d9504784812b8569afa8c2af`
- Order ID/version: `1` / `1`

## Observed workflow

| Step | User-supplied Studio evidence |
| --- | --- |
| `create_order` | `get_order("1")` showed `PROPOSED`, created_at 1791711441 |
| `accept_order` | contributor's readback showed `ACTIVE`, accepted_at 1791712092 |
| `submit_evidence` | readback showed `SUBMITTED`, submitted_at 1791712317 |
| `evaluate_submission` | Studio transaction history showed green FINALIZED and consensus ACCEPTED |
| `get_receipt("1", 1)` | **Nonempty returned receipt**: business outcome **ACCEPTED**, 3/3 SATISFIED, evaluated_at 1791712496 |
| `get_order("1")` after evaluation | **PENDING READBACK**; expected `COMPLETED` and first submission outcome `ACCEPTED` |

### Actual per-requirement verdicts

| ID | Requirement | Verdict | Reason |
| --- | --- | --- | --- |
| R1 | Declare trial environment without real money | SATISFIED | EVIDENCE_SUPPORTS |
| R2 | Explain three saved-draft reading steps in order | SATISFIED | EVIDENCE_SUPPORTS |
| R3 | Two reference-supported troubleshooting remedies | SATISFIED | EVIDENCE_SUPPORTS |

Quotes for all three criteria are in the exact JSON receipt archive.

## Integrity checks against pinned public fixture bytes

The reported receipt and the previously reported work order were checked
offline against the matching repository fixture text:

- `reference.txt`: SHA-256
  `9edf98b490eeb1b64f5e3f0b71a368ce38e9ba0e79070818eae3b2c70bb48527` — MATCH.
- `pass.txt`: SHA-256
  `8a087bffcffd9809daff7c53e56940b3974398ca58976693100b723bd015da1a` — MATCH.
- Canonical spec envelope (policy, chain ID, contract, order ID, parties,
  title and spec): SHA-256
  `e4aac1e77ba1c291394f053893dcd0488381dfcbe13bafe95659018282e21f19` — MATCH.
- Each `artifact_quote` and `reference_quote` occurs in the correct
  original TXT document.
- Three `SATISFIED` classifications aggregate deterministically to
  `ACCEPTED` per `proofly.work-order.v1`.

**Scope:** these are offline structural/integrity checks using user-provided
Studio JSON and repository fixture bytes. They do not establish whether a
validator's interpretation is semantically correct, independently verify
transaction provenance or replace an authenticated finalized state read.
The fixtures are **fictional documentation**, not real customers or funds.

## Reviewer follow-up / release gates

1. Read `get_order("1")` after evaluation, and preserve the complete JSON.
   Confirm `status=COMPLETED` and `submissions[0].outcome=ACCEPTED`.
2. Capture the **complete** deployment, create, accept, submit and evaluate
   transaction hashes; verify onchain FINALIZED **and GenVM execution SUCCESS**.
3. Confirm deployed source matches the pinned `work_order.py` candidate.
4. Run full `packages.receipt` verification with the final readback,
   receipt JSON and source bytes, and retain output.
5. Test `CHANGES_REQUIRED`, `EVIDENCE_REQUIRED` and an injection fixture
   live, and record any failure as observed.
6. This is a usable **Studio manual demo**, not proof of a complete hosted
   wallet-connected product or security audit.

For the historical first-deployment ABI error, see
[DEPLOYMENT_EVIDENCE.md](DEPLOYMENT_EVIDENCE.md).
