# PROOFLY

> **PROOFLY V2 REVIEWER UPDATE — OCTOBER 13, 2026 (experimental Studionet candidate)**
>
> The v2 deployment is separate from the v1 production app. [Open v2 Preview, positive order #1](https://proofly-atboqi1pu-khaiptk1998-8088s-projects.vercel.app/milestones.html?order=1) or [negative order #2](https://proofly-atboqi1pu-khaiptk1998-8088s-projects.vercel.app/milestones.html?order=2). [V2 contract on Explorer](https://explorer-studio.genlayer.com/address/0xD67245387dF5448671235CE00c8969664b5aF8bd).
>
> **Observed live:** Order #1 COMPLETED/ACCEPTED (3/3 satisfied) with one-time contributor-bound release authorization. Order #2 REVIEWED/CHANGES_REQUIRED (R3 unsatisfied); [claim rollback](https://explorer-studio.genlayer.com/tx/0xca2a98c928199f1b35f38c3e478cd74aae9dd58df546814a217636c21671ca6f) with MILESTONE_NOT_ACCEPTED. Additional [duplicate-claim](https://explorer-studio.genlayer.com/tx/0x0e435e25a54b86048644394051d061f76c710e07dcdef93975409f23edd8a7e3) and [wrong-caller](https://explorer-studio.genlayer.com/tx/0x58c988fd241e854f198c78f6cbc5b33b36b475bb8488b045506220dd8aa09619) rollbacks observed. [Full v2 evidence](docs/V2_STUDIONET_EVIDENCE.md) · [Submission packet](docs/V2_SUBMISSION_PACKET.md) · [Video checklist](docs/V2_VIDEO_SUBMISSION_CHECKLIST.md).
>
> **Important:** v2 release means **nontransferable authorization record**, not escrow, a token transfer, or real-world delivery proof. Preview wallet signing succeeded for create/accept/submit on an earlier build; latest transaction-recovery UI has automated CI but needs fresh real-browser smoke verification. Historical v1 sections below describe earlier development stages and are not the current v2 candidate status.


**2026-10-12 production evidence update:** The hosted Contributor workflow for Work Order #2 now displays `COMPLETED`, `ACCEPTED`, and a version-1 Proof Receipt with `3 / 3 SATISFIED` according to the user's live website readback. Vercel confirmed Production READY at `8d11604`. See [Order #2 production reviewer evidence](docs/ORDER_2_PRODUCTION_EVIDENCE.md). The historical status sections below describe earlier stages and are not the current deployment status. Independent Explorer GenVM execution confirmation and full transaction provenance remain outstanding.


**Agree on the work. Verify the evidence.**

PROOFLY is an evidence-based work verification application built for GenLayer.

Project owners and contributors agree on clear requirements before work begins. Contributors submit deliverables and supporting evidence, and verification produces a result for each requirement.

**For Builder reviewers:** [Reviewer evidence and reproduction](REVIEWER_EVIDENCE.md) · [Submission draft](docs/BUILDER_SUBMISSION.md) · [Live Studio evidence](docs/LIVE_STUDIO_DEMO.md).

[**Open PROOFLY live on Studionet**](https://proofly-lovat.vercel.app/) · [Builder submission](docs/BUILDER_SUBMISSION.md).

**Production update (2026-10-11):** Vercel confirmed READY on commit
`c3290e0`, including the direct Create Work Order form and corrected SDK
transaction-verdict handling. A real browser-originated Owner
`create_order` transaction succeeded on Studionet according to the
[Explorer details](https://explorer-studio.genlayer.com/tx/0x38807bdccf485b5da0a0bb4f640db619d1e3c74a317c95be43bb822ee3a9c59b).
Further signed Contributor/AI operations and the new order readback
remain to be verified. See [reviewer evidence](REVIEWER_EVIDENCE.md).

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

PROOFLY is a **pre-release prototype**. The main branch includes a pure
Python domain model, a standalone GenLayer verification spike, offline
requirements/evidence preflight, deterministic unit tests and CI.

**Manual Studio evidence is now available:** on 2026-10-11, a PROOFLY
work-order instance on Studionet (chain ID 61999) returned a user-reported
Proof Receipt with three SATISFIED criteria and ACCEPTED business outcome,
and a subsequent Accepted-state `get_order("1")` returned `COMPLETED`.
See [Live Studio demo](docs/LIVE_STUDIO_DEMO.md), archived
[completed order](docs/evidence/studionet-order-1-completed.json) and
[receipt JSON](docs/evidence/studionet-order-1-receipt.json).
Independent Explorer proof, hosted *signed-write* end-to-end validation, and a security audit remain pending. Live Owner wallet connection and finalized order/receipt *reads* have been verified by the user on an earlier Vercel production build. The separate verifier spike
is NOT the full owner/contributor work-order contract.

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

Next: capture complete transaction hashes, independently validate GenVM
execution and chain state, test negative/unverifiable cases, then connect the
wallet-enabled application. Do not describe this as a production release yet.


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

**A real Studio manual workflow and receipt have been observed via user-provided
readbacks and a Studio screenshot.** See [live evidence](docs/LIVE_STUDIO_DEMO.md).
Independent Explorer verification, full tx hashes, negative verdict runs,
fees and end-user wallet-connected UI are still pending. This contract is
NOT an audited escrow or payment system.


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


## Studio create_order export and SDK workflow boundary

The static Spec Builder can now export an **unsigned** `create_order` call
plan containing the exact seven method arguments, suitable for manual review
and entry into GenLayer Studio. The source data is not uploaded and no
transaction is sent. A client-injected SDK gateway validates allowed methods,
requests finalized-state reads, estimates fees before a single write, and
tracks finalization separately from contract execution success.

**The gateway uses test doubles in CI and is not connected to a real wallet.**
Read [SDK and Studio integration runbook](docs/SDK_WORKFLOW.md) before any
attempt to deploy or submit a transaction. Neither the export nor the tests
establish a live GenLayer deployment, finality, or an accepted work order.


### Studio ABI correction (2026-10-11)

The first Studio `create_order` execution exposed an address ABI bug in the
older deployed contract: `Address(value)` received a large integer and
raised `OverflowError`. The develop candidate now takes the contributor
as a **hex string**, recognizes existing SDK `Address` values separately,
and reads timestamp from GenVM transaction context. Deploy a **new instance**
from the updated source; the previous deployment is not patched onchain.
See [Work Order contract notes](docs/WORK_ORDER_CONTRACT.md) and
[Deployment evidence](docs/DEPLOYMENT_EVIDENCE.md).


### Reproduce first successful Studio evidence bundle offline

A full owner-create → contributor-accept → submit-evidence → AI-evaluate →
completed-order demonstration was reported from Studio on Studionet.
Both actual Studio JSON readbacks are archived with original public fixture
bytes in the repo. Recheck the bundle locally:

```bash
python -m unittest discover -s tests -p "test_studio_evidence.py" -v
python -m packages.receipt --order docs/evidence/studionet-order-1-completed.json --receipt docs/evidence/studionet-order-1-receipt.json --artifact fixtures/evidence/pass.txt --reference fixtures/evidence/reference.txt
```

**This validates offline integrity; not chain finality or semantic correctness.**
The Studio screenshot shows the evaluation as FINALIZED but complete tx IDs,
independent Explorer validation, other verdict branches and wallet-enabled
hosted app integration remain unfinished.


## Web GenLayer Studionet integration (experimental)

\`apps/web/live.html\` and \`live-app.mjs\` now provide a browser
wallet-backed GenLayerJS console for the real deployed work-order
contract on chain 61999, with finalized reads, owner/contributor
actions, explicit fee confirmation, signed writes, transaction hash
tracking and versioned Proof Receipts. The original Spec Builder and
offline Receipt Inspector are preserved as separate tools.

\`npm --prefix apps/web install && npm --prefix apps/web run bundle\`
generates the static live client. GitHub Actions checks syntax, bundle,
offline tests and browser rendering. Owner wallet signing and an actual browser-originated `create_order` are now
confirmed against Explorer, but the full two-wallet E2E workflow remains
pending. Do not confuse successful Owner creation with the complete app flow.


### Browser RPC acceptance check (2026-10-11)

The user confirmed that the Vercel production site connects their
Studionet Owner MetaMask account, reads order #1 as
`COMPLETED`/`ACCEPTED`, and reads Proof Receipt v1 as
`ACCEPTED` with **3/3 SATISFIED** and **CONSISTENT** aggregation.
The receipt timestamp matches the archived Studio result.
See [manual evidence](docs/LIVE_STUDIO_DEMO.md) and
[Builder handoff](docs/BUILDER_SUBMISSION.md).
An Owner `create_order` was signed via the Vercel Preview and confirmed
as GenVM SUCCESS in [Explorer](https://explorer-studio.genlayer.com/tx/0x38807bdccf485b5da0a0bb4f640db619d1e3c74a317c95be43bb822ee3a9c59b). No full
new two-wallet workflow, negative-case live evaluation or deployed-bytecode
attestation is yet verified.

### Guided workspace release (pending deployment)

The newest main implementation improves the end-user flow: the wallet
and contextual action lead the screen; connected users see recent
wallet-linked work automatically, while technical transaction details
are hidden behind a disclosure. The app selects a safe next action from
the finalized status, automatically checks a pasted pinned document,
resumes submitted transactions **without resending**, and reads the
verification receipt when completion is independently verified.

**Deployment note:** the feature must not be described as live until
the production Vercel alias is checked against its exact commit. Browser
CI and unit tests are reproducible in GitHub Actions, but actual
MetaMask signing of the full new release must be smoke-tested by a
human user. The finite recent-25-work discovery is not a full indexer.
