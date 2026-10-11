# PROOFLY — Phase 1 verification release gates

Status: **IN PROGRESS**. This is a checklist, not a report of a deployed app.
The current develop branch is a domain reference implementation and a
standalone verification spike. Do not describe a local mock as live consensus.

## Gate A — reproducible offline checks

- [x] Pure domain state machine with immutable accepted specs, versioned evidence, authorization and retry limits
- [x] Verifier spike with hash-pinned public fixture URLs, independent validator reclassification, quote checks, no client-set verdict
- [x] Offline Python unit tests for domain and verifier spike
- [x] Deterministic requirements/document preflight, with OFFLINE_ONLY report and warning/error distinction
- [x] GitHub Actions workflow configured for all offline tests
- [ ] Confirm Github Actions run is green on develop

CI runs: https://github.com/bearbaba/PROOFLY/actions

## Gate B — real GenLayer Studio / Studionet (NOT YET VERIFIED)

- [ ] Execute scripts/prepare_studio_cases.py after pushing public pinned fixtures and verify remote bytes match the committed bytes
- [ ] Deploy contracts/proofly/verifier_spike.py; capture runtime, chain ID, address and deployment transaction
- [ ] Confirm get_config() matches the locked spec and source hash
- [ ] Verify pass-v1 as ACCEPTED with correct citations
- [ ] Verify changes-v1 as CHANGES_REQUIRED
- [ ] Verify unknown-v1 as EVIDENCE_REQUIRED (not false failure)
- [ ] Verify injection-v1 does not redirect evaluation criteria
- [ ] Wrong hash: rejected without creating a record
- [ ] Duplicate case ID: rejected without overwriting accepted evidence
- [ ] Confirm transaction finality independently of UI acceptance
- [ ] Log fees, latency, consensus/validator results and network errors
- [ ] Repeat cases with new IDs to evaluate real convergence

**Never invent contract addresses, transactions, fees, validator decisions or
results.** Expected outcomes are hypotheses until observed on the real network.

## Gate C — full product MVP (separate milestone)

- [ ] Port state machine into contract-backed work orders: create, accept, submit, verify, revise and publish immutable receipt
- [ ] Build signed wallet adapter, versioned evidence store and offchain index
- [ ] Harden URL ingestion against SSRF, redirects and source drift
- [ ] Deliver web UI, network finality tracking and transaction reconciliation
- [ ] Add E2E tests for wallet/RPC errors, authorization and HTML injection
- [ ] Benchmark labeled examples for correctness, consensus, latency and cost
- [ ] Pilot real owner/contributor work orders and publish limitations
- [ ] Independent security review before introducing any escrow or payments

## Evidence packet template

When the live gate is complete, add REVIEWER_EVIDENCE.md with links and measured
data for every case. Record network, runtime, deployment hash, pinned commit,
case ID, transaction hash, expected vs actual requirement statuses, consensus
and finality proof, fees, timing and errors. Do not prefill fake successes.

## Boundaries

Local fake-SDK tests cannot prove live LLM correctness, consensus convergence,
rollback, network finality, privacy or data-source authenticity. Offline preflight
is not semantic grading and cannot establish source provenance.
This prototype does **not** accept real money and has no escrow functionality.
