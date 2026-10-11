
# PROOFLY — Phase 2 Work Order Contract Candidate

**STATUS: UNIT TESTS (FAKE SDK); LIVE GENLAYER VALIDATION PENDING.**

This is a GenLayer Studio candidate, not a deployed or audited contract.
It does not accept money or perform escrow, payout, refund or transfers.
Only publicly accessible, commit-pinned GitHub raw TXT documents are supported.

## Work order lifecycle

PROPOSED -> ACTIVE -> SUBMITTED -> COMPLETED (ACCEPTED)

PROPOSED -> CANCELLED (only by owner, before acceptance)

SUBMITTED -> REVIEWED (CHANGES_REQUIRED or EVIDENCE_REQUIRED)
REVIEWED -> SUBMITTED (one revised evidence version)

PROPOSED / ACTIVE / REVIEWED -> CLOSED_NOT_ACCEPTED after expiry

An order waiting for consensus in SUBMITTED cannot be closed merely because
the deadline passed, and a failed evaluation never produces a negative verdict.

## Contract entry points

- create_order(contributor, title, criteria_json, reference_url, reference_sha256, submit_deadline, revision_deadline)
- accept_order(order_id, spec_sha256)
- cancel_order(order_id)
- submit_evidence(order_id, artifact_url, artifact_sha256)
- evaluate_submission(order_id)
- close_expired(order_id)
- get_order(order_id)
- get_receipt(order_id, version)
- next_order()

Only the contributor may accept and submit evidence; only the owner may cancel.
Any account can trigger evaluation or closure when state allows it.
The accepted spec digest binds policy version, network, contract, order ID,
owner, contributor, title, criteria, source URL/hash and deadlines.

## GenLayer evaluation design

1. The leader reads the reference and submitted artifact. Each must have the
   exact expected SHA-256, UTF-8 encoding and bounded size.
2. The leader classifies each criterion as SATISFIED, UNSATISFIED or
   UNVERIFIABLE with literal artifact and reference quotations.
3. Validators independently fetch and hash both documents, reclassify every
   criterion, compare status vectors, and reject unsupported quotations
   using a separate grounding review.
4. Only after successful custom Equivalence Principle consensus does the
   contract store the result and issue a public versioned receipt.
5. Missing evidence is not treated as evidence of failure. A technical error
   does not create a business verdict.

URL restrictions: HTTPS GitHub raw URLs pinned to a full 40-hex-character
commit with a TXT suffix. No credentials, query parameters, arbitrary hosts
or path traversal. The 16 KB application cap applies after web fetching,
NOT at the transport boundary. Redirect behaviour requires live verification.

## Portable receipt validation

Export actual order and receipt snapshots from get_order and get_receipt,
download the original artifact and reference bytes, then run:

    python -m packages.receipt --order order.json --receipt receipt.json --artifact artifact.txt --reference reference.txt

This checks specification digest binding, order/receipt/version correspondence,
hashes, literal citations and deterministic aggregate outcomes. The checker
cannot establish whether the supplied JSON really came from GenLayer.
Independently compare it with a finalized record from a trusted RPC/explorer.
It also does not certify the semantic truth of the LLM classification.

Run all offline regression tests with:

    python -m unittest discover -s tests -p "test_*.py" -v

## Mandatory live release gates — NOT YET PASSED

- [ ] Actual GenVM compile and deploy using the pinned SDK version.
- [ ] Verify Address decoding, TreeMap persistence, transaction timestamp.
- [ ] Two-wallet create -> accept -> submit -> evaluate live flow.
- [ ] Finalized network receipts for ACCEPTED, CHANGES_REQUIRED and EVIDENCE_REQUIRED.
- [ ] Real adversarial tests for prompt injection, irrelevant citations,
      false acceptance, altered hashes and validator disagreement.
- [ ] Attempt double evaluations, version overwrite, role bypass, replay,
      expired deadlines and pending transaction recovery.
- [ ] Validate exported order/receipt against finalized chain state and
      original bytes. Record actual tx IDs and contract address.
- [ ] Measure fees, latency, consensus agreement over holdout corpus.
- [ ] Security review prior to releasing a public beta; no mainnet money.
- [ ] Wallet frontend and storage/indexing with SSRF protections,
      E2E browser checks and finality-aware transaction reconciliation.

A green mocked test suite does not prove successful deployment, semantic
quality, consensus robustness, rollback or finality.


## Browser-based offline receipt inspection

A complementary inspector is available at `apps/web/receipt.html` via the
static web preview. It checks the integrity of the supplied four-file bundle
without uploads or wallet access. It is independently tested using Node and
Playwright. It never authenticates provenance or finality and should not be
presented as an onchain explorer.

The authoritative offline reference remains `python -m packages.receipt`.
The browser verifies the core digest, quote, status and version invariants
using browser Web Crypto. For network-authenticated evidence, compare records
against a trusted finalized GenLayer RPC/explorer result manually until a
separately tested network adapter is available.


## Live Studio address ABI fix — 2026-10-11

The first live `create_order` attempt on an earlier candidate deployed at
`0x6F773E2e249D08a00509E4EC96d13C71c0e657d7` failed with
`OverflowError: cannot fit 'int' into an index-sized integer`, originating
from `Address(value)` while decoding an `Address`-typed contributor argument.
This is an **observed failure**, not a successful work order.

The revised candidate accepts `contributor: str` (a complete 0x-prefixed
40-hex-digit address), normalizes it without wrapping already-decoded
`Address` objects, and uses the GenVM transaction timestamp from
`gl.message_raw["datetime"]` rather than host wall-clock time. New regression
tests cover the previous integer failure, both supported address forms and
transaction time source. **The prior deployed instance is not updated by a
GitHub commit. Deploy a NEW instance from the patched contract.**

After new deployment, first verify `next_order()`; next call `create_order`
with a real second wallet address entered as a STRING (no unquoted numeric
literal), actual SHA-256 and deadlines relative to transaction time. Confirm
finalized GenVM execution success before recording it as working.
