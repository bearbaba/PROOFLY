# PROOFLY — Studionet deployment verification

**Status: LIVE STUDIO RECEIPT REPORTED (3/3 SATISFIED); EXPLORER INDEPENDENT VERIFICATION PENDING**

A PROOFLY Studio import link was provided by the project owner on
2026-10-11. This is an **unverified lead**, not independently confirmed
deployment, finalization, execution success, or compatibility with
`contracts/proofly/work_order.py` at HEAD.

## Candidate address (user supplied)

- Network to inspect: GenLayer Studio / Studionet (confirm chain ID **61999**)
- Candidate contract: `0x6F773E2e249D08a00509E4EC96d13C71c0e657d7`
- Import: https://studio.genlayer.com/?import-contract=0x6F773E2e249D08a00509E4EC96d13C71c0e657d7
- Explorer: https://explorer-studio.genlayer.com/address/0x6F773E2e249D08a00509E4EC96d13C71c0e657d7
- Deployment tx: **NOT YET VERIFIED**
- Deployed source / class / dependency: **NOT YET VERIFIED**
- Deployment status + GenVM execution result: **NOT YET VERIFIED**
- Live contract read: **NOT YET VERIFIED**
- Full owner/contributor work-order lifecycle: **NOT YET VERIFIED**

Do not mark these items successful until a matching finalized transaction,
execution success, contract code, and observable read/write state are collected.

## Release evidence checklist

1. [ ] Open the Explorer contract page: identify deployment tx, finalized
   status, SUCCESS GenVM result, chain ID, deployer and contract address.
2. [ ] Compare the transaction's deployed contract code and class against
   the reviewed `contracts/proofly/work_order.py` candidate.
3. [ ] In Studio Run & Debug, call `next_order()` as a read method. On a
   brand-new deployment with no orders it should be the string `"1"`.
4. [ ] Create an order with public commit-pinned reference source + digest,
   realistic deadlines, and another wallet as contributor. Record its tx hash.
5. [ ] Wait for FINALIZED and SUCCESS; inspect `get_order(order_id)`.
6. [ ] Switch to contributor wallet. Confirm the stored spec hash, then call
   `accept_order(order_id, spec_sha256)`. Capture finalized SUCCESS.
7. [ ] Call `submit_evidence` from contributor wallet using a commit-pinned
   artifact and its actual SHA-256. Capture finalized SUCCESS.
8. [ ] Call `evaluate_submission(order_id)`; verify consensus and execution
   SUCCESS, then inspect `get_receipt(order_id, 1)`.
9. [ ] Repeat representative CHANGES_REQUIRED, EVIDENCE_REQUIRED and
   injection-adversarial cases. Record verdicts, quote snippets, failures,
   fees, latency and network data **as actually observed**.
10. [ ] Run portable receipt checks using authentic exported chain state;
    verify that the original source bytes match declared digests.
11. [ ] Only then update README and Builder submission description with
    confirmed deployment and live behavior.

## Evidence table — fill with verified values only

| Requirement | Current evidence |
| --- | --- |
| Deployment transaction URL | Pending |
| Finalized deployment SUCCESS | Pending |
| Deployed source matches reviewed code | Pending |
| `next_order()` read | Pending |
| `create_order` finalized SUCCESS | Pending |
| `accept_order` finalized SUCCESS | Pending |
| `submit_evidence` finalized SUCCESS | Pending |
| `evaluate_submission` finalized SUCCESS | Pending |
| `get_receipt` and per-requirement results | Pending |
| Independent verdict benchmark / injection case | Pending |

This deployment note is for auditability and **must not** be interpreted as
proof that the user-provided import address belongs to the current PROOFLY
contract or that GenLayer validators have verified any real deliverable.


## Live failure observed during manual create_order test — 2026-10-11

The owner provided a GenVM traceback from `create_order`:

```
OverflowError: cannot fit 'int' into an index-sized integer
contract.py:162 in create_order -> _address(contributor)
contract.py:47 in _address -> Address(value).as_hex.lower()
```

The current Studio-imported instance cannot be counted as a successful
end-to-end proof. **Do not report create_order as successful.** The source
fix changes the method's contributor ABI from `Address` to `str`; it
requires deployment of a fresh instance. The old candidate address remains
in this document only as historical evidence of the attempted deployment.
The newer contract address is documented below. Its deployment transaction hash and finality proof are still PENDING.


## Work Order #1 — live Studio readbacks reported by owner (2026-10-11)

**Source:** Full JSON responses pasted directly from GenLayer Studio by the
project owner in the project discussion. These are user-supplied state
readbacks; explorer transaction hashes, finalization receipts and bytecode
matching have **not** been independently confirmed. Do not treat the
following as an audited finality attestation.

- Patched contract import link:
  https://studio.genlayer.com/?import-contract=0xEbb6E4D791299E79317DE796232029194e0F0aCb
- New candidate address: `0xEbb6E4D791299E79317DE796232029194e0F0aCb`
- Order ID: `1`
- Owner: `0x4c7cb73ac8f8999af21cfc9ff4cf2333a9508dcb`
- Contributor: `0xd6b8a3a5eb329410d9504784812b8569afa8c2af`
- Scoped accepted spec SHA-256:
  `e4aac1e77ba1c291394f053893dcd0488381dfcbe13bafe95659018282e21f19`
- Pinned reference SHA-256:
  `9edf98b490eeb1b64f5e3f0b71a368ce38e9ba0e79070818eae3b2c70bb48527`
- Pinned pass artifact SHA-256:
  `8a087bffcffd9809daff7c53e56940b3974398ca58976693100b723bd015da1a`

Reported readback progression:

1. `get_order("1")` returned `PROPOSED`, `created_at=1791711441`,
   `accepted_at=null`, and no submissions.
2. A readback after the contributor's accept returned `ACTIVE`,
   `accepted_at=1791712092`, and no submissions.
3. The latest `get_order("1")` readback returned `SUBMITTED`,
   `submissions[0].version=1`, `submitted_at=1791712317`,
   the pinned pass fixture URL+SHA-256, and `outcome=null`.

**Latest JSON readback:** SUBMITTED. A subsequent Studio screenshot shows an
`evaluate_submission` transaction FINALIZED with consensus ACCEPTED, but
**no Proof Receipt or GenVM execution success has yet been verified.**
See the screenshot-based observation below. The earlier `0x6F773E2e...` contract remains a failed
pre-patch candidate.


## Studio screenshot: first AI evaluation transaction — 2026-10-11

The project owner supplied a screenshot of the **patched** Studio import
(`0xEbb6E4D791299E79317DE796232029194e0F0aCb`) showing:

- A transaction labelled `evaluate_submission` with a green **FINALIZED**
  label in the Studio history (displayed tx hash prefix: `0xe49c...`).
- Studio consensus logs displaying **ACCEPTED** and **Reached consensus**,
  together with GenVM execution-finished log entries.
- Previous `submit_evidence` and a later `accept_order` transaction
  also showing green **FINALIZED**; one older `accept_order` attempt was
  marked red **FINALIZED** (do not conceal this failed attempt).

**Interpretation:** the screenshot supports that the evaluation transaction
reached GenLayer consensus finality. The word ACCEPTED in **consensus logs is
NOT proof** that the business-level PROOFLY verdict is `ACCEPTED`.
It also does not disclose the GenVM execution result in detail.

**Next evidence required:** The user has subsequently provided a nonempty
`get_receipt("1", 1)` JSON with `outcome=ACCEPTED` and all three criteria
`SATISFIED`; see [LIVE_STUDIO_DEMO.md](LIVE_STUDIO_DEMO.md).
`get_order("1")` must still show the finalized resulting state. Record the
complete transaction hash/link and GenVM SUCCESS result.


## Proof Receipt received — 2026-10-11

The owner pasted the complete `get_receipt("1", 1)` response from Studio.
It reports **ACCEPTED, 3 SATISFIED out of 3** with chain ID 61999 and the
patched contract address. Both public evidence SHA-256 digests and the
chain/contract/order-scoped spec commitment match the original repository
fixtures and earlier user-supplied order readback. All six quotes occur in
their respective public documents. Full result:
[LIVE_STUDIO_DEMO.md](LIVE_STUDIO_DEMO.md) and
[receipt JSON](evidence/studionet-order-1-receipt.json).

**Still pending:** final `get_order("1")` readback, complete tx IDs,
explorer-authenticated finality/execution checks and adversarial live cases.
