"""Regression tests for the deterministic preflight boundary."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

from packages.preflight import build_report, inspect_document, inspect_requirements, load_requirements


ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / "fixtures" / "evidence"
RUBRIC = [
    {"id": "R1", "text": "Include a trial-environment disclosure."},
    {"id": "R2", "text": "List three ordered instructions."},
    {"id": "R3", "text": "Give two source-supported troubleshooting steps."},
]


def codes(report):
    return [x["code"] for x in report["issues"]]


class PreflightTests(unittest.TestCase):
    def test_valid_documents_are_hash_pinned(self):
        report = build_report(RUBRIC, FIXTURES / "pass.txt", FIXTURES / "reference.txt")
        self.assertTrue(report["ready_for_studio_attempt"])
        self.assertEqual(report["counts"], {"errors": 0, "warnings": 0})
        self.assertEqual(len(report["documents"]["artifact"]["sha256"]), 64)
        self.assertEqual(report["stage"], "OFFLINE_ONLY")
        self.assertNotIn("verdict", report)

    def test_fixture_rubric_is_accepted(self):
        requirements = load_requirements(FIXTURES / "requirements.json")
        self.assertEqual(inspect_requirements(requirements), [])

    def test_spec_only_is_not_ready_for_verification(self):
        report = build_report(RUBRIC)
        self.assertTrue(report["requirements_valid"])
        self.assertFalse(report["ready_for_studio_attempt"])
        self.assertEqual(codes(report).count("MISSING_DOCUMENT"), 2)

    def test_duplicate_invalid_and_extra_fields(self):
        invalid = [RUBRIC[0], RUBRIC[0], {"id": "R?", "text": "a", "extra": 1}]
        errors = inspect_requirements(invalid)
        self.assertIn("DUPLICATE_ID", [x["code"] for x in errors])
        self.assertIn("REQUIREMENT_SCHEMA", [x["code"] for x in errors])

    def test_count_and_text_boundaries(self):
        self.assertIn("REQUIREMENTS_COUNT", [x["code"] for x in inspect_requirements([])])
        invalid = [dict(item) for item in RUBRIC]
        invalid[0]["text"] = " " * 501
        self.assertIn("REQUIREMENT_TEXT", [x["code"] for x in inspect_requirements(invalid)])

    def test_vague_criterion_is_warning_not_fake_failure(self):
        rubric = [dict(x) for x in RUBRIC]
        rubric[0]["text"] = "Write a professional and high-quality tutorial."
        report = build_report(rubric, FIXTURES / "pass.txt", FIXTURES / "reference.txt")
        self.assertTrue(report["ready_for_studio_attempt"])
        self.assertIn("VAGUE_CRITERION", codes(report))
        self.assertEqual(report["counts"]["errors"], 0)

    def test_injection_is_untrusted_data_not_auto_verdict(self):
        report = build_report(RUBRIC, FIXTURES / "injection.txt", FIXTURES / "reference.txt")
        self.assertTrue(report["ready_for_studio_attempt"])
        self.assertIn("UNTRUSTED_INSTRUCTIONS", codes(report))

    def test_missing_unreadable_and_oversize_document(self):
        with tempfile.TemporaryDirectory() as folder:
            missing, big = Path(folder) / "missing.txt", Path(folder) / "big.txt"
            self.assertIn("FILE_UNAVAILABLE", [x["code"] for x in inspect_document(missing, "artifact")[1]])
            big.write_bytes(b"a" * 16_001)
            info, issues = inspect_document(big, "artifact")
            self.assertEqual(info["bytes"], 16_001)
            self.assertIsNone(info["sha256"])
            self.assertEqual(issues[0]["code"], "DOCUMENT_SIZE")

    def test_rejects_non_utf8_and_nul(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "test.txt"
            path.write_bytes(b"\xff")
            self.assertEqual(inspect_document(path, "reference")[1][0]["code"], "DOCUMENT_ENCODING")
            path.write_bytes(b"a\x00b")
            self.assertEqual(inspect_document(path, "reference")[1][0]["code"], "DOCUMENT_TEXT")

    def test_duplicate_json_keys_not_accepted(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "req.json"
            path.write_text('[{"id":"R1","id":"R2","text":"x"}]')
            with self.assertRaisesRegex(ValueError, "Duplicate JSON key"):
                load_requirements(path)

    def test_cli_runs_without_network_or_wallet(self):
        result = subprocess.run(
            [sys.executable, "-m", "packages.preflight",
             "--requirements", str(FIXTURES / "requirements.json"),
             "--artifact", str(FIXTURES / "pass.txt"),
             "--reference", str(FIXTURES / "reference.txt")],
            cwd=ROOT, capture_output=True, text=True, check=False)
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        self.assertTrue(json.loads(result.stdout)["ready_for_studio_attempt"])

    def test_cli_fails_closed_on_invalid_requirements(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "bad.json"
            path.write_text("{invalid")
            result = subprocess.run(
                [sys.executable, "-m", "packages.preflight", "--requirements", str(path)],
                cwd=ROOT, capture_output=True, text=True, check=False)
            self.assertEqual(result.returncode, 2)
            self.assertIn("INVALID_REQUIREMENTS_FILE", result.stdout)


if __name__ == "__main__":
    unittest.main()
