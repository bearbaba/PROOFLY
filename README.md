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


## Phase 2 — Work Order Contract candidate and Proof Receipts

The develop branch now includes a new **candidate** Intelligent Contract:
[contracts/proofly/work_order.py](contracts/proofly/work_order.py).

It supports owner creation, contributor acceptance of a chain/contract/order-
bound spec digest, submission, one revision, permissionless GenLayer
evaluation, public per-version receipts, cancellation and expiry.

Its custom validator independently fetches/hash-checks evidence and
reference, reclassifies every requirement, and checks whether the
leader's quotations actually support the proposed conclusions.
A failed evaluation does not issue a work-failure verdict.

The offline [portable receipt checker](packages/receipt.py) recomputes
spec commitments, evidence SHA-256 hashes, required quotations and aggregate
outcome from supplied local documents. **It does not prove chain finality,
authenticity of supplied chain data, or semantic correctness.**

The full offline unit test command:

    python -m unittest discover -s tests -p "test_*.py" -v

Portable receipt verification of *exported* order/receipt JSON and original
text bytes:

    python -m packages.receipt --order order.json --receipt receipt.json --artifact artifact.txt --reference reference.txt

Read [Phase 2 contract and release gates](docs/WORK_ORDER_CONTRACT.md).

**Live deployment and real consensus NOT VERIFIED.** GenVM compatibility,
wallet E2E, validator convergence, fees, network finality and end-user UI are
still pending. This contract is NOT an audited escrow or payment system.


## Browser Spec Builder preview (Phase 3 foundation)

The repository now has an interactive, responsive static application in
[apps/web](apps/web/README.md). It creates an **unsigned** draft, checks
criteria, pinned source syntax, source digest format and deadlines, warns
about vague requirements and exports JSON for review.

Run locally:

    python -m http.server 4173 --directory apps/web

JavaScript unit and syntax checks (Node 22+):

    cd apps/web && npm test && npm run build

It can be deployed to a Vercel static preview using the root vercel.json,
but **it has no wallet, backend, stored user data, real LLM verdict, or
GenLayer RPC integration yet**. This UI is not a production verification app.


## Offline Receipt Inspector — browser

The static preview also includes a **Proof Receipt Inspector** at
`/receipt.html`. Upload work-order JSON, receipt JSON and both source
documents to verify local SHA-256 commitments, quote presence, version
binding and result aggregation. All files are processed in the browser
without uploading them to a server. The inspector rejects duplicate JSON
keys and renders untrusted text using safe DOM text nodes.

Run the static preview from the repository root:

    python -m http.server 4173 --directory apps/web

Then open `http://localhost:4173/receipt.html`.
Run unit and browser tests using the commands in
[apps/web/README.md](apps/web/README.md).

**A consistent receipt bundle is NOT proof of GenLayer deployment, authenticity,
consensus, finality or semantic truth.** Live network verification remains an
explicit unfinished release gate.
