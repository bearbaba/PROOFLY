"""Reproducible checks for USER-REPORTED Studio readback artifacts.

This verifies internal consistency, never proves authenticated RPC data,
actual finality, validator identity or semantic correctness.
"""
import json
import unittest
from pathlib import Path
from packages.receipt import validate

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / "docs" / "evidence"


class StudioEvidenceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.order = json.loads((EVIDENCE / "studionet-order-1-completed.json").read_text(encoding="utf-8"))
        cls.receipt = json.loads((EVIDENCE / "studionet-order-1-receipt.json").read_text(encoding="utf-8"))
        cls.artifact = (ROOT / "fixtures" / "evidence" / "pass.txt").read_bytes()
        cls.reference = (ROOT / "fixtures" / "evidence" / "reference.txt").read_bytes()

    def test_completed_studio_order_and_accepted_receipt_consistent(self):
        order, receipt = self.order, self.receipt
        self.assertEqual(order["id"], "1")
        self.assertEqual(order["status"], "COMPLETED")
        self.assertEqual(order["submissions"][0]["version"], 1)
        self.assertEqual(order["submissions"][0]["outcome"], "ACCEPTED")
        self.assertEqual(receipt["outcome"], "ACCEPTED")
        self.assertEqual([row["status"] for row in receipt["results"]], ["SATISFIED"] * 3)
        self.assertEqual(receipt["chain_id"], 61999)
        self.assertEqual(receipt["contract"], "0xebb6e4d791299e79317de796232029194e0f0acb")
        result = validate(order, receipt, self.artifact, self.reference)
        self.assertTrue(result["valid"], result)
        self.assertFalse(result["chain_finality_verified"])
        self.assertFalse(result["semantic_correctness_verified"])

    def test_tampered_completion_or_bytes_are_rejected(self):
        import copy
        bad = copy.deepcopy(self.order)
        bad["submissions"][0]["outcome"] = "CHANGES_REQUIRED"
        self.assertFalse(validate(bad, self.receipt, self.artifact, self.reference)["valid"])
        self.assertFalse(validate(self.order, self.receipt, self.artifact + b"tampered", self.reference)["valid"])
        self.assertFalse(validate(self.order, self.receipt, self.artifact, self.reference + b"tampered")["valid"])


if __name__ == "__main__":
    unittest.main()
