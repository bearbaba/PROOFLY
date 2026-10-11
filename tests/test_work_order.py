"""Fake-SDK tests. They DO NOT prove live GenVM execution or network finality."""
import hashlib
import json
from pathlib import Path
from types import ModuleType, SimpleNamespace
from unittest.mock import patch
import sys
import unittest

SOURCE = Path(__file__).resolve().parents[1] / "contracts" / "proofly" / "work_order.py"
OWNER = "0x" + "1" * 40
CONTRIBUTOR = "0x" + "2" * 40
OTHER = "0x" + "3" * 40
CONTRACT = "0x" + "4" * 40
BASE = "https://raw.githubusercontent.com/bearbaba/PROOFLY/" + "a" * 40 + "/fixtures/evidence/"
ARTIFACT = BASE + "pass.txt"
REFERENCE = BASE + "reference.txt"
ARTIFACT_V2 = BASE + "changes.txt"
CRITERIA = [{"id": "R1", "text": "Requirement 1"},
            {"id": "R2", "text": "Requirement 2"},
            {"id": "R3", "text": "Requirement 3"}]


class UserError(Exception):
    pass


class ConsensusError(Exception):
    pass


class Address:
    def __init__(self, raw):
        self.as_hex = raw.as_hex if isinstance(raw, Address) else str(raw)


class Return:
    def __init__(self, calldata):
        self.calldata = calldata


class WorkOrderTests(unittest.TestCase):
    def setUp(self):
        self.now = [1_800_000_000]
        self.blobs = {ARTIFACT: b"Evidence sentence.", REFERENCE: b"Reference sentence.",
                      ARTIFACT_V2: b"New Evidence sentence."}
        self.calls = []
        self.status = "SATISFIED"
        self.independent_status = None
        self.allow_grounding = True
        self.counter = 0
        sdk = ModuleType("genlayer")
        sdk.gl = sdk
        sdk.Contract = type("Contract", (), {})
        sdk.Address = Address
        sdk.TreeMap = dict
        sdk.u32 = int
        sdk.public = SimpleNamespace(write=lambda f: f, view=lambda f: f)
        sdk.vm = SimpleNamespace(UserError=UserError, Return=Return,
                                 run_nondet_unsafe=self.consensus)
        sdk.message = SimpleNamespace(sender_address=Address(OWNER),
                                      contract_address=Address(CONTRACT), chain_id=1337)
        sdk.message_raw = {"datetime": "2027-01-15T08:00:00Z"}
        sdk.nondet = SimpleNamespace(web=SimpleNamespace(get=self.fetch), exec_prompt=self.prompt)
        self.sdk = sdk
        with patch.dict(sys.modules, {"genlayer": sdk}):
            self.ns = {"__name__": "proofly_work_order_unit_subject"}
            exec(compile(SOURCE.read_text(encoding="utf-8"), str(SOURCE), "exec"), self.ns)
        self.contract = self.ns["ProoflyWorkOrder"]()
        self.contract.orders = {}
        self.contract.receipts = {}
        self.contract._now = lambda: self.now[0]

    def digest(self, url):
        return hashlib.sha256(self.blobs[url]).hexdigest()

    def as_actor(self, wallet):
        self.sdk.message.sender_address = Address(wallet)

    def fetch(self, url):
        self.calls.append(url)
        return SimpleNamespace(status=200, body=self.blobs[url])

    def prompt(self, prompt, response_format):
        self.assertEqual(response_format, "json")
        if prompt.startswith("Independently check"):
            return {"valid": self.allow_grounding}
        self.counter += 1
        status = self.independent_status if self.counter % 2 == 0 and self.independent_status else self.status
        return {"results": [{"id": c["id"], "status": status,
                 "artifact_quote": "Evidence sentence." if status != "UNVERIFIABLE" else "",
                 "reference_quote": "Reference sentence." if status != "UNVERIFIABLE" else ""}
                for c in CRITERIA]}

    def consensus(self, leader, validate):
        result = leader()
        if not validate(Return(result)):
            raise ConsensusError("Validators disagreed")
        return result

    def create(self):
        self.contract.create_order(CONTRIBUTOR, "Docs guide", json.dumps(CRITERIA),
                                   REFERENCE, self.digest(REFERENCE),
                                   self.now[0] + 3600, self.now[0] + 7200)
        return json.loads(self.contract.get_order("1"))

    def accept(self):
        spec = self.create()["spec_sha256"]
        self.as_actor(CONTRIBUTOR)
        self.contract.accept_order("1", spec)
        return spec

    def submit(self, artifact=ARTIFACT):
        self.contract.submit_evidence("1", artifact, self.digest(artifact))

    def test_complete_flow_and_receipt(self):
        self.accept()
        self.submit()
        self.as_actor(OTHER)
        self.contract.evaluate_submission("1")
        order = json.loads(self.contract.get_order("1"))
        receipt = json.loads(self.contract.get_receipt("1", 1))
        self.assertEqual(order["status"], "COMPLETED")
        self.assertEqual(order["submissions"][0]["outcome"], "ACCEPTED")
        self.assertEqual(receipt["chain_id"], 1337)
        self.assertEqual(receipt["contract"], CONTRACT)
        self.assertEqual(receipt["spec_sha256"], order["spec_sha256"])
        self.assertEqual([r["status"] for r in receipt["results"]], ["SATISFIED"] * 3)
        self.assertEqual(self.calls.count(ARTIFACT), 2)
        self.assertEqual(self.calls.count(REFERENCE), 2)
        self.assertEqual(self.contract.next_order(), "2")

    def test_authorization_for_accept_submit_and_cancel(self):
        order = self.create()
        with self.assertRaisesRegex(UserError, "ONLY_CONTRIBUTOR"):
            self.contract.accept_order("1", order["spec_sha256"])
        with self.assertRaisesRegex(UserError, "ONLY_CONTRIBUTOR"):
            self.contract.submit_evidence("1", ARTIFACT, self.digest(ARTIFACT))
        self.as_actor(OTHER)
        with self.assertRaisesRegex(UserError, "ONLY_OWNER"):
            self.contract.cancel_order("1")

    def test_signed_spec_hash_is_required(self):
        self.create()
        self.as_actor(CONTRIBUTOR)
        with self.assertRaisesRegex(UserError, "SPEC_MISMATCH"):
            self.contract.accept_order("1", "0" * 64)
        self.assertEqual(json.loads(self.contract.get_order("1"))["status"], "PROPOSED")

    def test_cannot_accept_after_deadline(self):
        spec = self.create()["spec_sha256"]
        self.as_actor(CONTRIBUTOR)
        self.now[0] += 3601
        with self.assertRaisesRegex(UserError, "ACCEPTANCE_EXPIRED"):
            self.contract.accept_order("1", spec)

    def test_cannot_submit_before_accept(self):
        self.create()
        self.as_actor(CONTRIBUTOR)
        with self.assertRaisesRegex(UserError, "SUBMISSION_NOT_ALLOWED"):
            self.submit()

    def test_cannot_fake_outcome_with_user_write(self):
        self.accept()
        self.submit()
        self.assertFalse(hasattr(self.contract, "record_result"))
        self.assertFalse(hasattr(self.contract, "set_verdict"))
        self.assertEqual(self.contract.get_receipt("1", 1), "")

    def test_independent_disagreement_stores_no_receipt(self):
        self.accept()
        self.submit()
        self.independent_status = "UNSATISFIED"
        with self.assertRaises(ConsensusError):
            self.contract.evaluate_submission("1")
        self.assertEqual(self.contract.get_receipt("1", 1), "")
        self.assertEqual(json.loads(self.contract.get_order("1"))["status"], "SUBMITTED")

    def test_grounding_rejection_stores_no_receipt(self):
        self.accept()
        self.submit()
        self.allow_grounding = False
        with self.assertRaises(ConsensusError):
            self.contract.evaluate_submission("1")
        self.assertFalse(self.contract.receipts)

    def test_source_hash_error_does_not_mark_work_failed(self):
        self.accept()
        self.submit()
        self.blobs[ARTIFACT] = b"tampered"
        with self.assertRaisesRegex(UserError, "EVIDENCE_HASH_MISMATCH"):
            self.contract.evaluate_submission("1")
        self.assertEqual(json.loads(self.contract.get_order("1"))["status"], "SUBMITTED")

    def test_unknown_produces_evidence_required_not_failure(self):
        self.accept()
        self.submit()
        self.status = "UNVERIFIABLE"
        self.contract.evaluate_submission("1")
        self.assertEqual(json.loads(self.contract.get_receipt("1", 1))["outcome"], "EVIDENCE_REQUIRED")

    def test_unsatisfied_produces_changes_required(self):
        self.accept()
        self.submit()
        self.status = "UNSATISFIED"
        self.contract.evaluate_submission("1")
        self.assertEqual(json.loads(self.contract.get_receipt("1", 1))["outcome"], "CHANGES_REQUIRED")

    def test_revision_keeps_immutable_previous_receipt(self):
        self.accept()
        self.submit()
        self.status = "UNSATISFIED"
        self.contract.evaluate_submission("1")
        first = self.contract.get_receipt("1", 1)
        self.as_actor(CONTRIBUTOR)
        self.submit(ARTIFACT_V2)
        self.counter = 0
        self.status = "SATISFIED"
        self.contract.evaluate_submission("1")
        self.assertEqual(self.contract.get_receipt("1", 1), first)
        self.assertEqual(json.loads(self.contract.get_receipt("1", 2))["outcome"], "ACCEPTED")
        self.assertEqual(json.loads(self.contract.get_order("1"))["status"], "COMPLETED")

    def test_revision_limit_and_no_double_settlement(self):
        self.accept()
        self.submit()
        self.contract.evaluate_submission("1")
        with self.assertRaisesRegex(UserError, "NOT_PENDING_EVALUATION"):
            self.contract.evaluate_submission("1")
        self.as_actor(CONTRIBUTOR)
        with self.assertRaisesRegex(UserError, "SUBMISSION_NOT_ALLOWED"):
            self.submit(ARTIFACT_V2)

    def test_revisions_must_have_new_evidence(self):
        self.accept()
        self.submit()
        self.status = "UNSATISFIED"
        self.contract.evaluate_submission("1")
        self.as_actor(CONTRIBUTOR)
        with self.assertRaisesRegex(UserError, "REVISION_UNCHANGED"):
            self.submit()

    def test_cancellation_is_only_before_acceptance(self):
        self.create()
        self.contract.cancel_order("1")
        self.assertEqual(json.loads(self.contract.get_order("1"))["status"], "CANCELLED")
        self.as_actor(CONTRIBUTOR)
        with self.assertRaisesRegex(UserError, "ORDER_NOT_PROPOSED"):
            self.contract.accept_order("1", "a" * 64)

    def test_expiry_cannot_close_pending_work(self):
        self.accept()
        self.submit()
        self.now[0] += 7201
        with self.assertRaisesRegex(UserError, "CANNOT_CLOSE_PENDING_OR_COMPLETED"):
            self.contract.close_expired("1")

    def test_expiry_boundary_closes_unaccepted_order(self):
        self.create()
        self.now[0] += 7200
        with self.assertRaisesRegex(UserError, "REVISION_WINDOW_ACTIVE"):
            self.contract.close_expired("1")
        self.now[0] += 1
        self.as_actor(OTHER)
        self.contract.close_expired("1")
        self.assertEqual(json.loads(self.contract.get_order("1"))["status"], "CLOSED_NOT_ACCEPTED")

    def test_rejects_unsafe_urls_and_invalid_deadlines(self):
        for url in ("http://127.0.0.1/foo.txt", REFERENCE.replace("a" * 40, "main"),
                    REFERENCE + "?token=x", REFERENCE.replace("raw.githubusercontent.com", "attacker.com"),
                    REFERENCE.replace("fixtures/evidence", "fixtures/../evidence")):
            with self.subTest(url=url), self.assertRaises(UserError):
                self.contract.create_order(CONTRIBUTOR, "Docs", json.dumps(CRITERIA), url,
                                           self.digest(REFERENCE), self.now[0] + 1,
                                           self.now[0] + 3600)
        with self.assertRaisesRegex(UserError, "INVALID_DEADLINES"):
            self.contract.create_order(CONTRIBUTOR, "Docs", json.dumps(CRITERIA),
                                       REFERENCE, self.digest(REFERENCE), 1, 2)

    def test_rejects_same_actor_and_duplicate_criteria(self):
        with self.assertRaisesRegex(UserError, "SAME_OWNER_AND_CONTRIBUTOR"):
            self.contract.create_order(OWNER, "Docs", json.dumps(CRITERIA), REFERENCE,
                                       self.digest(REFERENCE), self.now[0] + 1, self.now[0] + 2)
        with self.assertRaisesRegex(UserError, "INVALID_CRITERION_ID"):
            self.contract.create_order(CONTRIBUTOR, "Docs", json.dumps([CRITERIA[0]] * 3),
                                       REFERENCE, self.digest(REFERENCE), self.now[0] + 1, self.now[0] + 2)

    def test_receipt_lookup_unknown_and_no_payment_api(self):
        self.assertEqual(self.contract.get_order("999"), "")
        self.assertEqual(self.contract.get_receipt("999", 1), "")
        self.assertFalse(hasattr(self.contract, "deposit"))
        self.assertFalse(hasattr(self.contract, "pay"))


if __name__ == "__main__":
    unittest.main()
