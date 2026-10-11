"""Adversarial tests for the independent offline receipt integrity checker."""
import json
import tempfile
from pathlib import Path
import subprocess
import sys
import unittest

from packages.receipt import POLICY, canonical, digest, validate, unique_json

ROOT = Path(__file__).resolve().parents[1]
CONTRACT = "0x" + "4" * 40
OWNER = "0x" + "1" * 40
CONTRIBUTOR = "0x" + "2" * 40
ARTEFACT = b"Evidence sentence."
REFERENCE = b"Reference sentence."


def fixture():
    criteria = [{"id": "R1", "text": "a"}, {"id": "R2", "text": "b"},
                {"id": "R3", "text": "c"}]
    spec = {"policy": POLICY, "criteria": criteria, "reference_url": "https://example.test/ref",
            "reference_sha256": digest(REFERENCE), "submit_deadline": 100,
            "revision_deadline": 200}
    envelope = {"policy": POLICY, "chain_id": 1337, "contract": CONTRACT,
                "order_id": "1", "owner": OWNER, "contributor": CONTRIBUTOR,
                "title": "Docs guide", "spec": spec}
    spec_hash = digest(canonical(envelope))
    order = {"id": "1", "title": "Docs guide", "owner": OWNER, "contributor": CONTRIBUTOR,
             "spec": spec, "spec_sha256": spec_hash, "status": "COMPLETED",
             "submissions": [{"version": 1, "artifact_url": "https://example.test/a",
                              "artifact_sha256": digest(ARTEFACT), "submitted_at": 120,
                              "outcome": "ACCEPTED"}]}
    rows = [{"id": c["id"], "status": "SATISFIED", "reason_code": "EVIDENCE_SUPPORTS",
             "artifact_quote": "Evidence sentence.", "reference_quote": "Reference sentence."}
            for c in criteria]
    receipt = {"schema": POLICY, "order_id": "1", "version": 1,
               "spec_sha256": spec_hash, "reference_url": spec["reference_url"],
               "reference_sha256": digest(REFERENCE), "artifact_url": "https://example.test/a",
               "artifact_sha256": digest(ARTEFACT), "submitted_at": 120,
               "results": rows, "outcome": "ACCEPTED", "evaluated_at": 123,
               "chain_id": 1337, "contract": CONTRACT}
    return order, receipt


class ReceiptTests(unittest.TestCase):
    def test_legitimate_consistent_receipt(self):
        o, r = fixture()
        report = validate(o, r, ARTEFACT, REFERENCE)
        self.assertTrue(report["valid"], report)
        self.assertFalse(report["chain_finality_verified"])
        self.assertFalse(report["semantic_correctness_verified"])

    def test_tampered_document_rejected(self):
        o, r = fixture()
        self.assertIn("ARTIFACT_BYTES_MISMATCH", validate(o, r, b"tampered", REFERENCE)["errors"])

    def test_fake_satisfied_quote_rejected(self):
        o, r = fixture()
        r["results"][0]["artifact_quote"] = "not in the document"
        self.assertIn("FABRICATED_QUOTE_ARTIFACT_0", validate(o, r, ARTEFACT, REFERENCE)["errors"])

    def test_empty_satisfied_quote_rejected(self):
        o, r = fixture()
        r["results"][0]["artifact_quote"] = ""
        self.assertIn("PASS_WITHOUT_QUOTE_ARTIFACT_0", validate(o, r, ARTEFACT, REFERENCE)["errors"])

    def test_cross_order_replay_rejected(self):
        o, r = fixture()
        o["id"] = "2"
        self.assertIn("ORDER_ID_MISMATCH", validate(o, r, ARTEFACT, REFERENCE)["errors"])
        self.assertIn("INVALID_ORDER_SPEC_HASH", validate(o, r, ARTEFACT, REFERENCE)["errors"])

    def test_other_chain_does_not_validate(self):
        o, r = fixture()
        r["chain_id"] = 1
        self.assertIn("RECEIPT_SPEC_HASH_MISMATCH", validate(o, r, ARTEFACT, REFERENCE)["errors"])

    def test_outcome_cannot_override_failed_criterion(self):
        o, r = fixture()
        r["results"][0]["status"] = "UNSATISFIED"
        r["results"][0]["reason_code"] = "REQUIREMENT_NOT_MET"
        self.assertIn("AGGREGATE_OUTCOME_MISMATCH", validate(o, r, ARTEFACT, REFERENCE)["errors"])

    def test_unknown_is_valid_without_fabricated_failure(self):
        o, r = fixture()
        o["status"] = "REVIEWED"
        o["submissions"][0]["outcome"] = "EVIDENCE_REQUIRED"
        r["outcome"] = "EVIDENCE_REQUIRED"
        r["results"][0] = {"id": "R1", "status": "UNVERIFIABLE", "reason_code": "INSUFFICIENT_EVIDENCE",
                            "artifact_quote": "", "reference_quote": ""}
        self.assertTrue(validate(o, r, ARTEFACT, REFERENCE)["valid"])

    def test_reordered_ids_detected(self):
        o, r = fixture()
        r["results"].reverse()
        self.assertIn("RESULT_ID_ORDER_MISMATCH_0", validate(o, r, ARTEFACT, REFERENCE)["errors"])

    def test_malformed_object_fails_closed(self):
        self.assertFalse(validate([], {}, b"", b"")["valid"])
        self.assertFalse(validate({}, {}, b"", b"")["valid"])

    def test_duplicate_json_object_keys_fail(self):
        with self.assertRaises(ValueError):
            unique_json(b'{"id":"1","id":"2"}')

    def test_cli_can_verify_supplied_snapshot(self):
        o, r = fixture()
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)
            for name, data in (("order.json", json.dumps(o).encode()),
                               ("receipt.json", json.dumps(r).encode()),
                               ("artifact.txt", ARTEFACT), ("reference.txt", REFERENCE)):
                (path / name).write_bytes(data)
            proc = subprocess.run([sys.executable, "-m", "packages.receipt",
                                   "--order", str(path / "order.json"),
                                   "--receipt", str(path / "receipt.json"),
                                   "--artifact", str(path / "artifact.txt"),
                                   "--reference", str(path / "reference.txt")],
                                  cwd=ROOT, text=True, capture_output=True)
            self.assertEqual(proc.returncode, 0, proc.stderr + proc.stdout)
            self.assertTrue(json.loads(proc.stdout)["valid"])


if __name__ == "__main__":
    unittest.main()
