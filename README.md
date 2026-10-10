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

## Status

Initial project setup. Contract implementation and live network
integration are planned; no application or contract is deployed yet.
