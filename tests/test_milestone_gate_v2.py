"""Offline simulated GenLayer tests for the isolated milestone v2 contract.

These tests intentionally do not claim deployed code, live consensus or chain finality.
"""
import json
from pathlib import Path
from unittest.mock import patch
import test_work_order as legacy

V2_SOURCE = Path(__file__).resolve().parents[1] / "contracts" / "proofly" / "milestone_gate_v2.py"


class MilestoneGateV2Tests(legacy.WorkOrderTests):
    def setUp(self):
        with patch.object(legacy, "SOURCE", V2_SOURCE):
            super().setUp()
        self.contract.release_grants = {}

    def complete(self):
        self.accept()
        self.submit()
        self.contract.evaluate_submission("1")

    def test_release_cannot_be_claimed_before_consensus(self):
        self.accept()
        self.submit()
        with self.assertRaisesRegex(legacy.UserError, "MILESTONE_NOT_ACCEPTED"):
            self.contract.claim_milestone_release("1")
        self.assertEqual(self.contract.get_milestone_release("1"), "")

    def test_only_contributor_can_claim_release_once(self):
        self.complete()
        self.as_actor(legacy.OTHER)
        with self.assertRaisesRegex(legacy.UserError, "ONLY_CONTRIBUTOR"):
            self.contract.claim_milestone_release("1")
        self.as_actor(legacy.CONTRIBUTOR)
        self.contract.claim_milestone_release("1")
        grant = json.loads(self.contract.get_milestone_release("1"))
        receipt = json.loads(self.contract.get_receipt("1", 1))
        self.assertEqual(grant["recipient"], legacy.CONTRIBUTOR)
        self.assertEqual(grant["spec_sha256"], receipt["spec_sha256"])
        self.assertEqual(grant["artifact_sha256"], receipt["artifact_sha256"])
        self.assertEqual(grant["receipt_version"], 1)
        self.assertEqual(grant["policy"], "AGREED_SPEC_ONLY_V1")
        with self.assertRaisesRegex(legacy.UserError, "RELEASE_ALREADY_CLAIMED"):
            self.contract.claim_milestone_release("1")

    def test_negative_verdict_does_not_unlock_release(self):
        self.status = "UNSATISFIED"
        self.accept()
        self.submit()
        self.contract.evaluate_submission("1")
        with self.assertRaisesRegex(legacy.UserError, "MILESTONE_NOT_ACCEPTED"):
            self.contract.claim_milestone_release("1")

    def test_unverifiable_verdict_does_not_unlock_release(self):
        self.status = "UNVERIFIABLE"
        self.accept()
        self.submit()
        self.contract.evaluate_submission("1")
        with self.assertRaisesRegex(legacy.UserError, "MILESTONE_NOT_ACCEPTED"):
            self.contract.claim_milestone_release("1")

    def test_cannot_claim_with_tampered_stored_receipt(self):
        self.complete()
        receipt = json.loads(self.contract.receipts["1:1"])
        receipt["artifact_sha256"] = "0" * 64
        self.contract.receipts["1:1"] = json.dumps(receipt)
        with self.assertRaisesRegex(legacy.UserError, "INVALID_RELEASE_EVIDENCE"):
            self.contract.claim_milestone_release("1")

    def test_release_rejects_receipt_provenance_mismatch(self):
        for field, wrong in (
            ("schema", "proofly.work-order.v1"),
            ("order_id", "999"),
            ("version", 2),
            ("chain_id", 999),
            ("contract", legacy.OTHER),
        ):
            with self.subTest(field=field):
                self.setUp()
                self.complete()
                record = json.loads(self.contract.receipts["1:1"])
                record[field] = wrong
                self.contract.receipts["1:1"] = json.dumps(record)
                with self.assertRaisesRegex(legacy.UserError, "INVALID_RELEASE_EVIDENCE"):
                    self.contract.claim_milestone_release("1")
                self.assertEqual(self.contract.get_milestone_release("1"), "")

    def test_release_rejects_changed_source_policy(self):
        self.complete()
        order = json.loads(self.contract.orders["1"])
        order["spec"]["source_policy"] = "UNRESTRICTED"
        self.contract.orders["1"] = json.dumps(order)
        with self.assertRaisesRegex(legacy.UserError, "INVALID_RELEASE_EVIDENCE"):
            self.contract.claim_milestone_release("1")

    def test_acceptance_commits_to_source_policy(self):
        order = self.create()
        self.assertEqual(order["spec"]["source_policy"], "AGREED_SPEC_ONLY_V1")
        self.assertEqual(order["spec"]["policy"], "proofly.milestone-acceptance.v2")


if __name__ == "__main__":
    import unittest
    unittest.main()
