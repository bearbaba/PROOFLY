# PROOFLY

**Agree on the work. Verify the evidence.**

PROOFLY is an evidence-based work verification application built for GenLayer.

Project owners and contributors agree on clear requirements before work begins. Contributors submit deliverables and supporting evidence, and verification produces a result for each requirement.

## Core workflow

Create a work order → Accept requirements → Submit evidence →
Verify → Revise when needed → View the verification receipt.

## Verification outcomes

- **SATISFIED** — evidence supports the requirement.
- **UNSATISFIED** — evidence shows the requirement was not met.
- **UNVERIFIABLE** — available evidence is insufficient to decide.

Technical errors are handled separately from work evaluation.

## Initial scope

- Documentation and tutorial deliverables
- One assigned contributor per work order
- Versioned requirements and evidence
- Requirement-level verification through GenLayer
- Public verification receipts

## Project structure

- `apps/web` — application interface
- `apps/api` — drafts, evidence storage and indexing
- `contracts/proofly` — GenLayer Intelligent Contracts
- `packages/schema` — shared data models
- `packages/genlayer-adapter` — network integration
- `fixtures/evidence` — evaluation fixtures
- `tests/integration` — integration tests
- `docs` — product and architecture documentation

## Development status (October 2026)

PROOFLY is a **pre-release prototype**. The develop branch includes a pure
Python domain model, a standalone GenLayer verification spike, offline
requirements/evidence preflight, deterministic unit tests and CI.

**No contract deployment, live consensus, wallet integration, escrow or
public app has been verified yet.** The spike is NOT the full owner/contributor
work-order contract.

### Run every offline test

```bash
python -m unittest discover -s tests -p "test_*.py" -v
```

### Offline evidence preflight

```bash
python -m packages.preflight --requirements fixtures/evidence/requirements.json --artifact fixtures/evidence/pass.txt --reference fixtures/evidence/reference.txt
```

Preflight emits machine-readable JSON with local hashes, issues and
ready_for_studio_attempt. It performs no wallet, web or LLM requests. Passing
does **not** mean the document was accepted, source URLs were verified, or a
GenLayer transaction finalized.

Documentation: [Preflight](docs/PREFLIGHT.md) ·
[GenLayer spike](docs/GENLAYER_SPIKE.md) ·
[Phase 1 release gates](docs/PHASE1_RELEASE_GATES.md).

Next: execute the verifier on real GenLayer Studio/Studionet and publish
observed receipts, fees, validator decisions and finality before describing
this project as a functional production application.
