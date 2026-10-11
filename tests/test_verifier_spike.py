"""Unit tests with a deliberately small fake SDK.

These exercise our Python code, not GenVM, storage rollback, real AI quality,
real validator scheduling, fees or network finality. Live checks are required.
"""
from pathlib import Path
from types import ModuleType, SimpleNamespace
from unittest.mock import patch
from itertools import product
import hashlib
import json
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "contracts/proofly/verifier_spike.py"
BASE = "https://raw.githubusercontent.com/bearbaba/PROOFLY/" + "a" * 40 + "/fixtures/evidence/"


class UserError(Exception):
    pass


class Return:
    def __init__(self, value):
        self.calldata = value


class Address:
    def __init__(self, value):
        self.as_hex = value


class ContractTests(unittest.TestCase):
    def setUp(self):
        self.owner = Address("0x" + "1" * 40)
        self.fetches = []
        self.prompts = []
        self.validator = None
        self.independent_status = None
        self.legitimate_grounding = True
        self.criterion_text = json.dumps([
            {"id": f"R{i}", "text": f"Requirement {i}"} for i in (1, 2, 3)])
        self.blobs = {BASE + "reference.txt": b"Reference supports the statement.",
                      BASE + "pass.txt": b"Artifact includes the statement."}
        self.sdk = ModuleType("genlayer")
        self.gl = SimpleNamespace(
            Contract=object,
            public=SimpleNamespace(view=lambda f: f, write=lambda f: f),
            message=SimpleNamespace(sender_address=self.owner, contract_address=Address("0x" + "2" * 40), chain_id=1),
            message_raw={"datetime": "2026-10-10T00:00:00Z"},
            vm=SimpleNamespace(UserError=UserError, Return=Return, run_nondet_unsafe=self.consensus),
            nondet=SimpleNamespace(web=SimpleNamespace(get=self.fetch), exec_prompt=self.prompt),
        )
        self.sdk.gl, self.sdk.Address, self.sdk.TreeMap = self.gl, Address, dict
        self.sdk.__all__ = ["gl", "Address", "TreeMap"]
        self.ns = {"__name__": "proofly_spike_unit_subject"}
        with patch.dict(sys.modules, {"genlayer": self.sdk}):
            exec(compile(SOURCE.read_text(encoding="utf-8"), str(SOURCE), "exec"), self.ns)
        self.contract = self.ns["ProoflyVerifierSpike"](
            self.criterion_text, BASE + "reference.txt", self.digest("reference.txt"))
        # Real TreeMap is provisioned by GenVM. This dict does NOT emulate it.
        self.contract.records = {}

    def digest(self, name):
        return hashlib.sha256(self.blobs[BASE + name]).hexdigest()

    def fetch(self, url):
        self.fetches.append(url)
        return SimpleNamespace(status=200, body=self.blobs[url])

    def answer(self, status="SATISFIED"):
        return {"results": [{"id": f"R{i}", "status": status,
                             "artifact_quote": "Artifact includes the statement.",
                             "reference_quote": "Reference supports the statement."} for i in (1, 2, 3)]}

    def prompt(self, prompt, response_format):
        self.assertEqual(response_format, "json")
        self.prompts.append(prompt)
        if prompt.startswith("Validate a proposed"):
            return {"valid": self.legitimate_grounding}
        if len(self.prompts) == 2 and self.independent_status:
            return self.answer(self.independent_status)
        return self.answer()

    def consensus(self, leader, validator):
        self.validator = validator
        value = leader()
        self.assertTrue(validator(Return(value)), "Simulated validator disagreed")
        return value

    def verify(self):
        self.contract.verify("case-pass", BASE + "pass.txt", self.digest("pass.txt"))

    def test_accept_and_bind_record(self):
        self.verify()
        result = json.loads(self.contract.get_record("case-pass"))
        self.assertEqual(result["outcome"], "ACCEPTED")
        self.assertEqual(result["artifact_sha256"], self.digest("pass.txt"))
        self.assertEqual(result["spec_hash"], self.contract.spec_hash)
        self.assertEqual(result["submitter"], self.owner.as_hex)
        self.assertEqual(result["scope"], "VERIFICATION_SPIKE")
        self.assertNotIn("finalized", result)

    def test_independent_refetch_and_reclassification(self):
        self.verify()
        self.assertEqual(self.fetches.count(BASE + "pass.txt"), 2)
        self.assertEqual(self.fetches.count(BASE + "reference.txt"), 2)
        self.assertEqual(len(self.prompts), 3)

    def test_valid_schema_with_opposite_decision_is_rejected(self):
        self.independent_status = "UNSATISFIED"
        with self.assertRaises(AssertionError):
            self.verify()
        self.assertEqual(self.contract.records, {})

    def test_irrelevant_citation_is_rejected_by_grounding_check(self):
        self.legitimate_grounding = False
        with self.assertRaises(AssertionError):
            self.verify()
        self.assertEqual(self.contract.records, {})

    def test_all_27_aggregations_match_domain(self):
        from contracts.proofly.domain import Requirement, EvidenceStatus, aggregate
        criteria = tuple(Requirement(f"R{i}", "x") for i in (1, 2, 3))
        for values in product(self.ns["STATUSES"], repeat=3):
            with self.subTest(values=values):
                rows = [{"id": f"R{i}", "status": value} for i, value in enumerate(values, 1)]
                expected = aggregate(criteria, {r["id"]: EvidenceStatus(r["status"]) for r in rows}).value
                self.assertEqual(self.ns["_outcome"](rows), expected)

    def test_failed_fetch_leaves_no_record(self):
        self.gl.nondet.web.get = lambda url: SimpleNamespace(status=404, body=b"not found")
        with self.assertRaisesRegex(UserError, "HTTP"):
            self.verify()
        self.assertEqual(self.contract.records, {})

    def test_bad_hash_is_rejected_before_llm(self):
        with self.assertRaisesRegex(UserError, "HASH_MISMATCH"):
            self.contract.verify("bad-hash", BASE + "pass.txt", "0" * 64)
        self.assertEqual(self.prompts, [])
        self.assertEqual(self.contract.records, {})

    def test_network_exception_leaves_no_verdict(self):
        def fail(url):
            raise TimeoutError("simulated")
        self.gl.nondet.web.get = fail
        with self.assertRaises(TimeoutError):
            self.verify()
        self.assertEqual(self.contract.records, {})

    def test_retry_same_case_after_technical_failure(self):
        self.gl.nondet.web.get = lambda url: SimpleNamespace(status=503, body=b"")
        with self.assertRaises(UserError):
            self.verify()
        self.gl.nondet.web.get = self.fetch
        self.verify()
        self.assertEqual(len(self.contract.records), 1)

    def test_case_cannot_be_overwritten(self):
        self.verify()
        before = self.contract.get_record("case-pass")
        with self.assertRaisesRegex(UserError, "ALREADY_RECORDED"):
            self.verify()
        self.assertEqual(before, self.contract.get_record("case-pass"))

    def test_only_deployer_can_submit_spike_cases(self):
        self.gl.message.sender_address = Address("0x" + "3" * 40)
        with self.assertRaisesRegex(UserError, "ONLY_SPIKE_OWNER"):
            self.verify()
        self.assertEqual(self.fetches, [])

    def test_url_allowlist_and_commit_pin(self):
        for url in ("http://127.0.0.1/", BASE.replace("a" * 40, "main") + "pass.txt",
                    BASE + "../secret.txt", BASE + "pass.txt?token=x",
                    BASE.replace("raw.githubusercontent.com", "raw.githubusercontent.com.evil.com") + "pass.txt",
                    BASE.replace("bearbaba", "other") + "pass.txt"):
            with self.subTest(url=url), self.assertRaises(UserError):
                self.ns["_url"](url)

    def test_input_duplicate_criteria_rejected(self):
        raw = json.dumps([{"id": "R1", "text": "x"}] * 3)
        with self.assertRaisesRegex(UserError, "DUPLICATE"):
            self.ns["_requirements"](raw)

    def test_fabricated_quote_rejected(self):
        answer = self.answer()
        answer["results"][0]["artifact_quote"] = "Invented quote"
        with self.assertRaisesRegex(UserError, "QUOTE_NOT_FOUND"):
            self.ns["_normalize"](answer, json.loads(self.criterion_text),
                                  self.blobs[BASE + "pass.txt"].decode(),
                                  self.blobs[BASE + "reference.txt"].decode())

    def test_empty_pass_quote_rejected(self):
        answer = self.answer()
        answer["results"][0]["artifact_quote"] = ""
        with self.assertRaisesRegex(UserError, "PASS_REQUIRES"):
            self.ns["_normalize"](answer, json.loads(self.criterion_text),
                                  self.blobs[BASE + "pass.txt"].decode(),
                                  self.blobs[BASE + "reference.txt"].decode())

    def test_duplicate_output_id_rejected(self):
        answer = self.answer()
        answer["results"][1]["id"] = "R1"
        with self.assertRaisesRegex(UserError, "INVALID_ID"):
            self.ns["_normalize"](answer, json.loads(self.criterion_text),
                                  self.blobs[BASE + "pass.txt"].decode(),
                                  self.blobs[BASE + "reference.txt"].decode())

    def test_oversized_and_non_utf8_sources_rejected(self):
        for body in (b"x" * 16001, b"\xff", b"a\x00b", b""):
            with self.subTest(size=len(body)), self.assertRaises(UserError):
                self.gl.nondet.web.get = lambda url: SimpleNamespace(status=200, body=body)
                self.ns["_fetch_text"](BASE + "pass.txt", hashlib.sha256(body).hexdigest())

    def test_validator_errors_mean_disagree(self):
        self.verify()
        self.assertFalse(self.validator(object()))
        self.assertFalse(self.validator(Return({"results": []})))

    def test_missing_record_returns_empty_string(self):
        self.assertEqual(self.contract.get_record("absent"), "")


if __name__ == "__main__":
    unittest.main()
