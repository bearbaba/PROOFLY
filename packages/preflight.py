"""Offline, deterministic preflight for PROOFLY's documentation-verification spike.

This module does NOT use GenLayer, make network requests, evaluate quality, or
claim blockchain finality. It is a reusable guardrail for the future API/UI.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re
from typing import Any

MAX_DOCUMENT_BYTES = 16_000
MAX_DOCUMENT_CHARS = 10_000
MAX_REQUIREMENTS_BYTES = 4_000
REQUIREMENT_ID = re.compile(r"R[1-9][0-9]*\Z")
VAGUE = re.compile(
    r"\b(?:high[- ]quality|good|nice|professional|beautiful|intuitive|"
    r"excellent|user[- ]friendly|best[- ]in[- ]class)\b", re.IGNORECASE
)
INJECTION = re.compile(
    r"(?:ignore (?:all |any )?(?:previous|earlier|prior) instructions|"
    r"system message|override (?:the )?(?:rubric|verdict))", re.IGNORECASE
)


def issue(level: str, code: str, detail: str, field: str) -> dict[str, str]:
    return {"level": level, "code": code, "field": field, "detail": detail}


def inspect_requirements(data: Any) -> list[dict[str, str]]:
    """Validate verifier-spike requirements; warn, never auto-grade, on ambiguity."""
    findings: list[dict[str, str]] = []
    if type(data) is not list:
        return [issue("error", "REQUIREMENTS_TYPE", "Expected a JSON array.", "requirements")]
    if not 3 <= len(data) <= 5:
        findings.append(issue("error", "REQUIREMENTS_COUNT", "Provide 3 to 5 requirements.", "requirements"))
    seen: set[str] = set()
    for index, entry in enumerate(data):
        field = f"requirements[{index}]"
        if type(entry) is not dict or set(entry) != {"id", "text"}:
            findings.append(issue("error", "REQUIREMENT_SCHEMA", "Each entry needs exactly id and text.", field))
            continue
        ident, text = entry["id"], entry["text"]
        if not isinstance(ident, str) or not REQUIREMENT_ID.fullmatch(ident):
            findings.append(issue("error", "REQUIREMENT_ID", "Use IDs R1, R2, ... (no duplicates).", field + ".id"))
        elif ident in seen:
            findings.append(issue("error", "DUPLICATE_ID", "Requirement ID repeated.", field + ".id"))
        else:
            seen.add(ident)
        if not isinstance(text, str) or not 1 <= len(text.strip()) <= 500:
            findings.append(issue("error", "REQUIREMENT_TEXT", "Text must be 1–500 characters.", field + ".text"))
            continue
        if VAGUE.search(text):
            findings.append(issue("warning", "VAGUE_CRITERION",
                                  "Replace subjective adjectives with observable acceptance conditions.",
                                  field + ".text"))
    return findings


def inspect_document(path: str | Path, role: str) -> tuple[dict[str, Any], list[dict[str, str]]]:
    """Read at most max+1 bytes; never send evidence to a network service."""
    name = Path(path).name
    info: dict[str, Any] = {"name": name, "sha256": None, "bytes": None, "characters": None}
    try:
        with Path(path).open("rb") as handle:
            raw = handle.read(MAX_DOCUMENT_BYTES + 1)
    except OSError:
        return info, [issue("error", "FILE_UNAVAILABLE", "Document could not be read.", role)]
    info["bytes"] = len(raw)
    if not raw or len(raw) > MAX_DOCUMENT_BYTES:
        return info, [issue("error", "DOCUMENT_SIZE", "Document must be 1–16000 UTF-8 bytes.", role)]
    try:
        content = raw.decode("utf-8", "strict")
    except UnicodeDecodeError:
        return info, [issue("error", "DOCUMENT_ENCODING", "Document must contain valid UTF-8.", role)]
    info["characters"] = len(content)
    if len(content) > MAX_DOCUMENT_CHARS or "\x00" in content:
        return info, [issue("error", "DOCUMENT_TEXT", "Document contains NUL or exceeds 10000 characters.", role)]
    info["sha256"] = hashlib.sha256(raw).hexdigest()
    warnings = []
    if INJECTION.search(content):
        warnings.append(issue("warning", "UNTRUSTED_INSTRUCTIONS",
                              "Possible instructions inside evidence are data, not evaluator commands.", role))
    return info, warnings


def build_report(
    requirements: Any,
    artifact: str | Path | None = None,
    reference: str | Path | None = None,
) -> dict[str, Any]:
    findings = inspect_requirements(requirements)
    evidence: dict[str, Any] = {}
    for role, path in (("artifact", artifact), ("reference", reference)):
        if path is None:
            evidence[role] = None
            findings.append(issue("warning", "MISSING_DOCUMENT",
                                  "Provide this document before a Studio verification attempt.", role))
        else:
            evidence[role], extra = inspect_document(path, role)
            findings.extend(extra)
    errors = sum(x["level"] == "error" for x in findings)
    warnings = sum(x["level"] == "warning" for x in findings)
    return {
        "schema_version": "proofly.preflight.v1",
        "stage": "OFFLINE_ONLY",
        "requirements_valid": not any(x["level"] == "error" and x["field"].startswith("requirements")
                                      for x in findings),
        "ready_for_studio_attempt": errors == 0 and artifact is not None and reference is not None,
        "counts": {"errors": errors, "warnings": warnings},
        "documents": evidence,
        "issues": findings,
        "disclaimer": "Local structural checks only; no semantic verdict, consensus, fee or finality claim.",
    }


def load_requirements(path: str | Path) -> Any:
    """Reject duplicate JSON object keys and oversized rubric files."""
    raw = Path(path).read_bytes()
    if not raw or len(raw) > MAX_REQUIREMENTS_BYTES:
        raise ValueError("Requirements JSON must be 1–4000 bytes.")
    def unique_keys(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
        result = {}
        for key, value in pairs:
            if key in result:
                raise ValueError("Duplicate JSON key in requirements.")
            result[key] = value
        return result
    return json.loads(raw.decode("utf-8"), object_pairs_hook=unique_keys)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Offline PROOFLY verifier preflight")
    parser.add_argument("--requirements", required=True, type=Path)
    parser.add_argument("--artifact", type=Path)
    parser.add_argument("--reference", type=Path)
    args = parser.parse_args(argv)
    try:
        requirements = load_requirements(args.requirements)
    except (OSError, ValueError, UnicodeError) as exc:
        print(json.dumps({
            "schema_version": "proofly.preflight.v1", "stage": "OFFLINE_ONLY",
            "ready_for_studio_attempt": False, "counts": {"errors": 1, "warnings": 0},
            "issues": [issue("error", "INVALID_REQUIREMENTS_FILE", str(exc), "requirements")],
        }, indent=2))
        return 2
    report = build_report(requirements, args.artifact, args.reference)
    print(json.dumps(report, indent=2, ensure_ascii=False))
    return 0 if report["ready_for_studio_attempt"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
