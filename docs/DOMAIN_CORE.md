# Deterministic domain core

This is an executable reference model, not a deployed GenLayer contract.
Run from the repository root:

```bash
python -m unittest discover -s tests -p "test_*.py" -v
```

All 3–5 requirements are mandatory. Any UNSATISFIED requirement produces
CHANGES_REQUIRED; otherwise any UNVERIFIABLE requirement produces
EVIDENCE_REQUIRED; only all SATISFIED produces ACCEPTED. The full result vector
is retained, including mixed UNSATISFIED and UNVERIFIABLE cases.

Accepted specifications and submission snapshots are immutable. Each order
allows an initial submission and one revision. Each submission permits up to
three technical attempts. Technical failures do not consume revision slots
and never produce a work verdict. Version and attempt ids reject stale results.
Deadlines are inclusive for submission, exclusive for expiry closure.

The model accepts trusted actor/time inputs for deterministic testing. The
future GenLayer contract must derive these from transaction context and chain
time, enforce authorization in contract storage, verify fetched evidence bytes,
and validate classifications through consensus before recording them.

The record_result transition is internal. Never expose it as an endpoint
accepting client-provided verdicts. COMPLETED is a domain state, not proof of
transaction finality. Network finality tracking is a separate future adapter.

Not implemented yet: web evidence retrieval, provenance validation, evaluator,
GenLayer storage/wallet integration, finality, receipt UI or payments. Pending
evaluation recovery must be implemented against actual network transaction
status; a caller cannot close a still-pending submission using only wall time.

Python canonical JSON hashing here is a reference. Cross-language canonical
encoding and GenVM hashing compatibility must be verified before deployment.
