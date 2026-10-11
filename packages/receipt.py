"""Independent offline integrity checks for PROOFLY proof receipts.

Does NOT establish chain finality, provenance, or semantic correctness. Verify
the contract record independently with an authenticated RPC/explorer.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
from typing import Any

POLICY = "proofly.work-order.v1"
REASONS = {"SATISFIED": "EVIDENCE_SUPPORTS", "UNSATISFIED": "REQUIREMENT_NOT_MET",
           "UNVERIFIABLE": "INSUFFICIENT_EVIDENCE"}
MAX_BYTES = 16000
MAX_CHARS = 10000


def canonical(obj: Any) -> bytes:
    return json.dumps(obj, sort_keys=True, ensure_ascii=False,
                      separators=(",", ":")).encode("utf-8")


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _report(errors: list[str]) -> dict[str, Any]:
    return {"schema": "proofly.receipt-check.v1", "status": "STRUCTURALLY_CONSISTENT"
            if not errors else "INVALID", "valid": not errors, "errors": errors,
            "chain_finality_verified": False, "semantic_correctness_verified": False,
            "warning": "Offline integrity checks only. Independently verify onchain record and finality."}


def validate(order: Any, receipt: Any, artifact: bytes, reference: bytes) -> dict[str, Any]:
    """Check integrity relative to the SUPPLIED order and original evidence bytes."""
    errors: list[str] = []

    def check(ok: bool, code: str):
        if not ok:
            errors.append(code)

    if type(order) is not dict or type(receipt) is not dict:
        return _report(["INVALID_JSON_OBJECT"])

    check(receipt.get("schema") == POLICY, "UNKNOWN_RECEIPT_SCHEMA")
    check(type(receipt.get("chain_id")) is int and receipt.get("chain_id", 0) > 0,
          "INVALID_CHAIN_ID")
    check(type(receipt.get("contract")) is str and
          receipt.get("contract", "").startswith("0x") and
          len(receipt.get("contract", "")) == 42, "INVALID_CONTRACT_ADDRESS")
    check(type(order.get("id")) is str and receipt.get("order_id") == order.get("id"),
          "ORDER_ID_MISMATCH")
    version = receipt.get("version")
    check(type(version) is int and 1 <= version <= 2, "INVALID_VERSION")

    spec = order.get("spec")
    if type(spec) is not dict:
        return _report(errors + ["INVALID_SPEC"])
    criteria = spec.get("criteria")
    if type(criteria) is not list or not 3 <= len(criteria) <= 5 or any(
        type(row) is not dict or set(row) != {"id", "text"} for row in criteria
    ):
        return _report(errors + ["INVALID_CRITERIA"])
    ids = [row["id"] for row in criteria]
    check(all(type(x) is str for x in ids) and (len(set(ids)) == len(ids)
          if all(type(x) is str for x in ids) else False), "DUPLICATE_CRITERIA")

    envelope = {"policy": POLICY, "chain_id": receipt.get("chain_id"),
                "contract": receipt.get("contract"), "order_id": order.get("id"),
                "owner": order.get("owner"), "contributor": order.get("contributor"),
                "title": order.get("title"), "spec": spec}
    expected_spec_hash = digest(canonical(envelope))
    check(order.get("spec_sha256") == expected_spec_hash, "INVALID_ORDER_SPEC_HASH")
    check(receipt.get("spec_sha256") == expected_spec_hash, "RECEIPT_SPEC_HASH_MISMATCH")
    check(receipt.get("reference_url") == spec.get("reference_url"), "REFERENCE_URL_MISMATCH")
    check(receipt.get("reference_sha256") == spec.get("reference_sha256"),
          "REFERENCE_HASH_MISMATCH")

    submissions = order.get("submissions")
    if type(submissions) is not list or type(version) is not int or not 1 <= version <= len(submissions):
        return _report(errors + ["MISSING_SUBMISSION"])
    submission = submissions[version - 1]
    if type(submission) is not dict:
        return _report(errors + ["INVALID_SUBMISSION"])
    check(submission.get("version") == version, "VERSION_MISMATCH")
    check(submission.get("artifact_url") == receipt.get("artifact_url"), "ARTIFACT_URL_MISMATCH")
    check(submission.get("artifact_sha256") == receipt.get("artifact_sha256"), "ARTIFACT_HASH_MISMATCH")
    check(submission.get("submitted_at") == receipt.get("submitted_at"), "SUBMITTED_AT_MISMATCH")
    check(submission.get("outcome") == receipt.get("outcome"), "SUBMISSION_OUTCOME_MISMATCH")

    decoded = {}
    for key, raw in (("artifact", artifact), ("reference", reference)):
        if type(raw) is not bytes or not 0 < len(raw) <= MAX_BYTES:
            errors.append(key.upper() + "_SIZE_INVALID")
            continue
        try:
            text = raw.decode("utf-8")
        except UnicodeDecodeError:
            errors.append(key.upper() + "_UTF8_INVALID")
            continue
        if len(text) > MAX_CHARS or "\x00" in text:
            errors.append(key.upper() + "_TEXT_INVALID")
            continue
        decoded[key] = text
        check(digest(raw) == receipt.get(key + "_sha256"), key.upper() + "_BYTES_MISMATCH")

    rows = receipt.get("results")
    if type(rows) is not list or len(rows) != len(ids):
        return _report(errors + ["INVALID_RESULT_VECTOR"])
    statuses = []
    for i, (result, ident) in enumerate(zip(rows, ids)):
        if type(result) is not dict or set(result) != {
            "id", "status", "reason_code", "artifact_quote", "reference_quote"
        }:
            errors.append("INVALID_RESULT_SCHEMA_" + str(i))
            continue
        check(result["id"] == ident, "RESULT_ID_ORDER_MISMATCH_" + str(i))
        status = result["status"]
        check(type(status) is str and status in REASONS, "INVALID_STATUS_" + str(i))
        if type(status) is not str or status not in REASONS:
            continue
        statuses.append(status)
        check(result["reason_code"] == REASONS[status], "REASON_CODE_MISMATCH_" + str(i))
        for key in ("artifact", "reference"):
            quote = result.get(key + "_quote")
            if type(quote) is not str or len(quote) > 400:
                errors.append("INVALID_QUOTE_" + key.upper() + "_" + str(i))
            else:
                check(not quote or (key in decoded and quote in decoded[key]),
                      "FABRICATED_QUOTE_" + key.upper() + "_" + str(i))
                if status == "SATISFIED":
                    check(bool(quote.strip()), "PASS_WITHOUT_QUOTE_" + key.upper() + "_" + str(i))

    if len(statuses) == len(ids):
        outcome = ("CHANGES_REQUIRED" if "UNSATISFIED" in statuses else
                   "EVIDENCE_REQUIRED" if "UNVERIFIABLE" in statuses else "ACCEPTED")
        check(receipt.get("outcome") == outcome, "AGGREGATE_OUTCOME_MISMATCH")
    return _report(errors)


def unique_json(raw: bytes) -> Any:
    def no_duplicate_keys(pairs):
        result = {}
        for key, val in pairs:
            if key in result:
                raise ValueError("Duplicate JSON key: " + key)
            result[key] = val
        return result
    return json.loads(raw, object_pairs_hook=no_duplicate_keys)


def main(argv=None):
    parser = argparse.ArgumentParser(description="Offline proof integrity check (NOT finality)")
    parser.add_argument("--order", type=Path, required=True)
    parser.add_argument("--receipt", type=Path, required=True)
    parser.add_argument("--artifact", type=Path, required=True)
    parser.add_argument("--reference", type=Path, required=True)
    args = parser.parse_args(argv)
    try:
        order_bytes = args.order.read_bytes()
        receipt_bytes = args.receipt.read_bytes()
        if len(order_bytes) > 64000 or len(receipt_bytes) > 64000:
            raise ValueError("Metadata size exceeds limit")
        report = validate(unique_json(order_bytes), unique_json(receipt_bytes),
                          args.artifact.read_bytes()[:MAX_BYTES + 1],
                          args.reference.read_bytes()[:MAX_BYTES + 1])
    except (OSError, ValueError, UnicodeError) as exc:
        report = _report(["INPUT_ERROR:" + str(exc)])
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["valid"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
