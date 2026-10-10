# GenLayer verification spike — live validation pending

## Scope

`contracts/proofly/verifier_spike.py` is a standalone Studio candidate. It is
separate from `domain.py`; local CPython dataclasses are not assumed to be
GenVM storage types. The deployer fixes 3–5 criteria, a reference URL and its
SHA-256 at construction. Only that deployer can submit spike cases. Each case
id is write-once. There is no public result-setting method, funds or payment.

The contract pins the py-genlayer runtime identifier currently shown in the
official first-contract documentation. Runtime availability and compatibility
must still be confirmed in the target Studio network. Do not silently switch
runtime versions to bypass errors.

This is not the owner/contributor work-order contract. It deliberately isolates
web retrieval, evidence integrity, semantic classification and consensus before
porting the full lifecycle to contract storage.

## Verification path

The leader fetches artifact and reference bytes, checks their SHA-256 and size,
requests per-requirement classifications, and validates output ids and citations.
Each validator independently fetches and classifies, compares the complete
status vector, and judges whether the leader's citations support the result.
Exact citation text need not match between validators. The aggregate is code,
not an LLM score. A single UNSATISFIED produces CHANGES_REQUIRED; otherwise any
UNVERIFIABLE produces EVIDENCE_REQUIRED; only all SATISFIED produces ACCEPTED.

This costs two web fetches and one classification call per leader; two fetches,
one classification call and one grounding call per validator. Measure actual
fees and convergence before optimizing. A failed fetch/hash/LLM/consensus
attempt writes no record and does not label the work unsuccessful. Retry the
same case id only after confirming the previous transaction failed; do not
spam retries while pending. The three-attempt budget in the domain model is
not yet onchain-enforced by this isolated spike.

## Evidence boundary

Only public raw.githubusercontent.com/bearbaba/PROOFLY URLs under a full
40-character commit SHA and fixtures/evidence/*.txt are accepted. No branch
names, arbitrary hosts, query strings or credentials. The GenVM web API shown
in docs has no redirect-control option: response redirect behavior and maximum
download behavior still require live inspection. The application byte cap is
checked AFTER fetching; it is not a network-level response-size guarantee.

Hash checks verify content integrity, not authenticity or authorship. The
reference is a deployer-selected fixture. This is not an independent oracle
for historical truth. Fixtures describe a fictional service, not real GenLayer
operating instructions. Prompt-injection defenses need actual adversarial LLM
runs; a Python test with canned responses cannot prove model resistance.

## Local checks

```bash
python -m unittest discover -s tests -p "test_*.py" -v
```

The new tests use an explicitly fake SDK. They check authorization, overwrite
protection, URL restrictions, hash checks, strict output parsing, stale/invalid
leader rejection, independent reclassification, grounding rejection and parity
with the 27 domain result vectors. They do not test actual GenVM compilation,
TreeMap storage, consensus scheduling, real LLM quality, rollback or finality.

## Next: prepare actual Studio parameters

After reviewing, committing and pushing this step on develop:

```bash
python scripts/prepare_studio_cases.py
```

The script reads committed Git bytes, checks that all five public URLs return
those bytes, and writes `build/proofly-studio-cases.json` (ignored by Git).
If the repo is private, this intentionally fails. Stop there and choose a
public fixture host; do not disclose private credentials or change repository
visibility automatically. The contract allowlist must be deliberately updated
if a different fixture host is chosen.

In GenLayer Studio, load only `verifier_spike.py`. Use the three constructor
arguments from the generated JSON. Deploy a new PROOFLY spike only; existing
SplitSignal/ProofSpec contracts are unrelated and must not be modified.
Read get_config, then execute verify with pass-v1, changes-v1, unknown-v1 and
injection-v1 using the generated arguments, one transaction at a time.

Expected outcomes are hypotheses to measure, not values supplied to the model:
pass → ACCEPTED; changes → CHANGES_REQUIRED; unknown → EVIDENCE_REQUIRED;
injection → CHANGES_REQUIRED. Record the actual vector and source quotes.
Also attempt a wrong hash and a repeated successful case id: both must fail
without replacing the existing record. Confirm via get_record.

Read network transaction status/receipt separately and wait for finality before
calling anything finalized. get_record alone is insufficient. Capture network,
runtime, contract address, transaction ids, fees, durations, verdicts and failures
in a live-run log. Do not claim a live deployment or release until these checks
have actually completed.

## Authoritative references consulted 2026-10-10

- https://docs.genlayer.com/developers/intelligent-contracts/first-contract
- https://docs.genlayer.com/developers/intelligent-contracts/equivalence-principle
- https://docs.genlayer.com/developers/intelligent-contracts/examples/user-storage
- https://docs.genlayer.com/developers/intelligent-contracts/features/transaction-context
- https://docs.genlayer.com/developers/intelligent-contracts/features/calling-llms
- https://sdk.genlayer.com/main/_modules/genlayer/gl/nondet/web.html

Where general LLM examples only validate schema, this spike follows the more
specific independent-verification requirement in the Equivalence Principle
documentation instead. Consensus on formatting alone is insufficient.
