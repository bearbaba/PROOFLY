# PROOFLY — Reviewer Evidence

> **Latest evidence — 2026-10-12:** [Hosted Order #2 verification and exact limitations](docs/ORDER_2_PRODUCTION_EVIDENCE.md). The user-provided live production readback shows `COMPLETED / ACCEPTED`, Proof Receipt v1, and `3/3 SATISFIED`; the verified Vercel production SHA is `8d11604`. Historical sections below are retained as a dated audit trail, not the current feature/deployment status. The verification transaction's GenVM execution is still independently unconfirmed.


**Submission state: NOT YET SUBMITTED / NOT YET ACCEPTED.**

This reviewer handoff maps the project's GenLayer-specific value, working
code, reproducible tests and observed Studionet behavior to direct evidence.
It deliberately distinguishes a user-reported manual demo from independently
verified chain finality, and the *main-branch* UI from the currently
deployed Vercel version.

## Project at a glance

PROOFLY verifies delivery of documented work against **agreed objective
requirements**. The owner creates a work order, the contributor accepts the
exact specification and submits public evidence, and GenLayer AI
adjudication produces a **per-criterion on-chain Proof Receipt**.

- Code: https://github.com/bearbaba/PROOFLY
- Current Intelligent Contract source:
  [`contracts/proofly/work_order.py`](contracts/proofly/work_order.py)
- Vercel public URL: https://proofly-lovat.vercel.app/
- Studionet chain ID: `61999`
- Reported deployed contract: `0xEbb6E4D791299E79317DE796232029194e0F0aCb`
- Studio import:
  https://studio.genlayer.com/?import-contract=0xEbb6E4D791299E79317DE796232029194e0F0aCb
- Explorer contract entry:
  https://explorer-studio.genlayer.com/address/0xEbb6E4D791299E79317DE796232029194e0F0aCb
- Deep-dive and archived readbacks: [Live Studio demo](docs/LIVE_STUDIO_DEMO.md)
- [Builder contribution draft](docs/BUILDER_SUBMISSION.md)

## Why GenLayer, not a normal smart contract?

The meaningful judgment is **semantic**: whether an artifact genuinely
satisfies text requirements in an independent reference. Validators
must read public documents, verify their byte hashes, compare
submissions with an agreed rubric, and check literal citations.
Deterministic contract code then aggregates per-criterion classifications:

| Criterion verdict | Meaning |
| --- | --- |
| `SATISFIED` | Evidence supports the requirement |
| `UNSATISFIED` | Evidence shows the requirement is not met |
| `UNVERIFIABLE` | Evidence does not support a reliable decision |

The resulting work-order outcomes are `ACCEPTED`,
`CHANGES_REQUIRED` or `EVIDENCE_REQUIRED`. Crucially,
**unverifiable is not the same thing as failure**.
Neither the client nor an off-chain admin chooses the final receipt.
The current prototype involves **no escrow or real-money custody**.

Implementation: [contract](contracts/proofly/work_order.py) and
[specification](docs/WORK_ORDER_CONTRACT.md).

## Actual manual Studio demonstration — user-provided observations

On 2026-10-11, separate Owner and Contributor wallets performed the
following manual flow in GenLayer Studio on Studionet:

| Method / read | Reported observed result |
| --- | --- |
| `create_order` → `get_order("1")` | `PROPOSED` |
| `accept_order` → `get_order("1")` | `ACTIVE` |
| `submit_evidence` → `get_order("1")` | `SUBMITTED`, version 1 |
| `evaluate_submission("1")` | Studio history showed transaction `FINALIZED` and consensus reached |
| `get_receipt("1", 1)` | Business outcome **`ACCEPTED`** and R1/R2/R3 **`SATISFIED`** |
| Final `get_order("1")` | **`COMPLETED`**, first submission outcome **`ACCEPTED`** |

The complete normalized artifacts are committed, not just screenshots:

- [Finalized-state order JSON, v1](docs/evidence/studionet-order-1-completed.json)
- [Proof Receipt JSON, v1](docs/evidence/studionet-order-1-receipt.json)
- [Pinned reference](fixtures/evidence/reference.txt)
- [Pinned submitted artifact](fixtures/evidence/pass.txt)

The reference SHA-256, artifact SHA-256 and scoped spec hash were
recalculated offline and matched the reported values. All six
reference/artifact quotes were present in their respective documents.
These checks verify **internal integrity of the evidence bundle**,
not authenticated transaction provenance or semantic truth.

## Live website reading — owner-supplied browser results

A Vercel production version deployed at commit `f14305f1` was verified
by the owner to connect an EIP-1193 wallet on Studionet 61999 and read:

- `get_order("1")`: role Owner, status `COMPLETED`,
  submission version 1 outcome `ACCEPTED`.
- `get_receipt("1", 1)`: `ACCEPTED`, `3 / 3 SATISFIED`,
  `CONSISTENT`, chain `61999`, timestamp `2026-10-11 16:54:56`
  (the displayed locale time).

**Deployment update:** The owner successfully used the direct human-facing
form on Vercel Preview to sign `create_order`; its transaction finalized
successfully according to the Explorer. GenLayerJS transaction-result
normalization was then merged, and Vercel production was confirmed READY
on commit `c3290e0`. The creation step worked on Preview; a separate
complete two-wallet production flow is not yet confirmed.

A later browser screenshot displayed an empty finalized read for
order #1. Whether that was transient network state, RPC behavior or
another issue remains **unresolved**; keep this visible as a gate.

## Website-signed Work Order creation — Explorer evidence (2026-10-11)

The owner supplied the actual GenLayer Explorer transaction details for
a new **browser-originated, MetaMask-signed** transaction. This is the
first linked transaction-level proof of a website write, separate from
the prior manual Studio Order #1 demonstration:

- [View Explorer transaction](https://explorer-studio.genlayer.com/tx/0x38807bdccf485b5da0a0bb4f640db619d1e3c74a317c95be43bb822ee3a9c59b)
- Hash: `0x38807bdccf485b5da0a0bb4f640db619d1e3c74a317c95be43bb822ee3a9c59b`
- Chain: GenLayer Studionet `61999`
- Sender: `0x4c7cb73ac8f8999af21cfc9ff4cf2333a9508dcb` (Owner)
- Recipient: `0xEbb6E4D791299E79317DE796232029194e0F0aCb`
- Method: `create_order` with all seven decoded arguments
- Contributor: `0xd6b8a3a5eb329410d9504784812b8569afa8c2af`
- Title: `PROOFLY Demo - User Guide Verification`
- Reference: pinned [reference text](fixtures/evidence/reference.txt);
  SHA-256 `9edf98b490eeb1b64f5e3f0b71a368ce38e9ba0e79070818eae3b2c70bb48527`
- Deadlines submitted: `1791901511` and `1792333511`
- Value: `0 GEN` (not a fee statement)
- Explorer status **FINALIZED**, consensus result **Accepted**,
  GenVM execution result **SUCCESS**, result code **Return**,
  return value `null` (expected for `create_order(...)->None`)

**Observed issue and response:** the original website's tracking panel
incorrectly displayed `FINALIZED / EXECUTION FAILED` while missing
the actual SDK execution fields. Root cause identified in the
`genlayer-js@1.1.8` simplified receipt: the SDK can rename
`statusName` to `status_name` and omit execution details. A
[normalization regression](apps/web/tx-verdict.test.mjs) and
[full transaction lookup fallback](apps/web/live-app.mjs) were merged
in [PR #6](https://github.com/bearbaba/PROOFLY/pull/6), release
`c3290e0`. Vercel confirmed a READY production deployment of this
commit. This fix is covered by CI, but the owner has not yet
reported a successful repeat of the website's **Track finality** view
for the specific hash.

**Scope:** Explorer confirms a successful `create_order` write; the
new **order number and its `PROPOSED` state are not yet confirmed by
a subsequent `get_order` read**. No Contributor acceptance, evidence
submission or GenLayer AI evaluation has yet been reported for this
new website-originated work order. No second transaction should be
sent until its state is read and confirmed. The previous Studio demo
Order #1 remains a separate completed workflow.

## Repository tests and security boundaries

- [Work-order contract regressions](tests/test_work_order.py) cover
  state and caller constraints using SDK test doubles.
- [Receipt integrity regression](tests/test_studio_evidence.py) checks
  archived order, receipt and original fixture bytes, and detects
  tampered evidence.
- [Receipt verifier](packages/receipt.py) reports separately whether
  integrity, chain finality and semantic correctness were verified.
- [Browser tests](apps/web/tests/live.spec.mjs) cover layout, basic
  form usability and untrusted URL rejection.
- [Web integration tests](apps/web/sdk-workflow.test.mjs) test
  capabilities of the pinned `genlayer-js@1.1.8` client,
  explicit wallet-cost review, and no automatic retry.
- [UI source](apps/web/live-app.mjs) uses DOM `textContent` for
  untrusted contract text, not dynamic `innerHTML`.

Earlier UI foundation: `1caf425ef76afa1ab159231c2e16cb341de89edc`.
Transaction-status decoding fix merged at `c3290e0`.

- [Python CI PASS](https://github.com/bearbaba/PROOFLY/actions/runs/38141230278)
- [Web and Playwright CI PASS](https://github.com/bearbaba/PROOFLY/actions/runs/38141230138)

### Repeat the integrity checks

```bash
python -m unittest discover -s tests -p "test_*.py" -v
python -m packages.receipt \
  --order docs/evidence/studionet-order-1-completed.json \
  --receipt docs/evidence/studionet-order-1-receipt.json \
  --artifact fixtures/evidence/pass.txt \
  --reference fixtures/evidence/reference.txt
```

The archived data is user-provided. The tests do not replace
third-party Explorer checks or a live validator-consensus transcript.

## How a steward can review the deployed contract

1. Open the Studio import URL above and set Read Methods state to **Accepted**.
2. Query `get_order("1")`. Check the accepted spec hash and
   `status = COMPLETED`.
3. Query `get_receipt("1", 1)`. Compare three `SATISFIED`
   decisions and literal quotes with the archive.
4. Compare the public reference and submitted artifact contents
   to their archived SHA-256 digests.
5. On the production website, use `Load order` and
   `Read finalized Proof Receipt` to reproduce reads when the
   Studionet RPC responds consistently.
6. Check every transaction's complete hash, chain and GenVM execution
   via the Explorer when that evidence is collected.

## Release gates before claiming a production-ready app

- [x] Deploy the human-readable `Create a work order` UI
      (production READY on `c3290e0`), and record one
      successful website-originated `create_order` in Explorer.
- [ ] Diagnose and fix the intermittent `No work order found`
      website read before presenting the demo.
- [x] Owner signed `create_order` from web Preview; full hash,
      FINALIZED/Accepted and GenVM SUCCESS documented above.
- [ ] Read back the created order's actual ID and `PROPOSED` state.
- [ ] Contributor signed accept and submit, finalized AI evaluation,
      and recorded Proof Receipt for this new order. Save full hashes.
- [ ] Test negative (`CHANGES_REQUIRED`), unverifiable
      (`EVIDENCE_REQUIRED`) and injection fixtures **live** on Studionet.
- [ ] Independently verify deployed source and transaction evidence
      via Explorer; do not invent tx IDs.
- [ ] Record an authentic 60–90s video from the verified hosted UI
      and Studio showing the whole two-wallet result.
- [ ] Provide a normal-user document-upload path if claiming broadly
      accessible file-based verification; currently documents must be
      public commit-pinned GitHub raw `.txt` URLs.
- [ ] Submit under the correct, *currently open* GenLayer Builder
      **Projects** category and preserve the portal confirmation.

**Why this is not a copy of another project:** PROOFLY adjudicates a
written specification against a submitted artifact and returns
requirement-level quoted evidence; it is not source-divergence
monitoring or a bounty escrow. No token payout is claimed.

## Suggested reviewer video (after live writes have been verified)

1. Problem: two parties disagree about whether work met a specification.
2. Show PROOFLY project page, connect Owner wallet, create work order.
3. Show Contributor wallet accept and submit public evidence.
4. Run the AI evaluation and await FINALIZED + GenVM execution success.
5. Show `COMPLETED`, `ACCEPTED` and 3 criterion quotes in Proof Receipt.
6. Close with the public contract, source, test evidence and stated limits.

This document is a reviewer evidence **index**, not a claim that every
release gate has already been met.
