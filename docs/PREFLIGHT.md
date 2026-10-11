# Deterministic Spec & Evidence Preflight

Run from repository root:

    python -m packages.preflight --requirements fixtures/evidence/requirements.json --artifact fixtures/evidence/pass.txt --reference fixtures/evidence/reference.txt

JSON output uses schema proofly.preflight.v1. It separates blocking errors
from advisory warnings and identifies its stage as OFFLINE_ONLY.

Checks:
- 3–5 rubric entries, exactly id and text per entry, unique R1-style IDs
- Each text is 1–500 characters; vague/subjective words trigger warnings
- Both local documents are nonempty, valid UTF-8, no NUL, 16000 bytes maximum
  and 10000 characters maximum, with reported SHA-256 hashes
- Obvious prompt-injection indicators yield warnings, not automated work verdicts
- Requirements-only preview is possible but never ready for a Studio attempt

A successful preflight is NOT a business verdict, proof of remote file
availability, protection against arbitrary prompt injection, or consensus
confirmation. It makes no network calls and never accesses wallets.

The contract must still perform all authorization, source hash, status and
consensus checks. See docs/GENLAYER_SPIKE.md for live reproduction steps.
