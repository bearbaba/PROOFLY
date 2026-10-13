"""Static structure checks; NOT GenVM execution or security certification."""
import ast
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
V2 = ROOT / "contracts/proofly/milestone_gate_v2.py"
V3 = ROOT / "contracts/proofly/milestone_gate_v3_indexed.py"


def methods(path):
    tree = ast.parse(path.read_text(encoding="utf-8"))
    klass = next(node for node in tree.body if isinstance(node, ast.ClassDef) and node.name == "ProoflyWorkOrder")
    return {node.name: node for node in klass.body if isinstance(node, ast.FunctionDef)}


class V3IndexCandidateTests(unittest.TestCase):
    def test_v3_is_parseable(self):
        self.assertTrue(V3.exists())
        ast.parse(V3.read_text(encoding="utf-8"))

    def test_preserves_v2_business_methods(self):
        original = methods(V2)
        candidate = methods(V3)
        for name in ("create_order", "accept_order", "submit_evidence",
                     "evaluate_submission", "claim_milestone_release", "get_order",
                     "get_receipt", "get_milestone_release"):
            self.assertIn(name, candidate)
            self.assertIn(name, original)
        for name in ("accept_order", "submit_evidence", "evaluate_submission",
                     "claim_milestone_release"):
            self.assertEqual(ast.dump(original[name]), ast.dump(candidate[name]))

    def test_index_methods_and_bounded_page(self):
        source = V3.read_text(encoding="utf-8")
        candidate = methods(V3)
        for method in ("list_owner_order_ids", "list_contributor_order_ids",
                       "_append_order_index", "_list_order_ids"):
            self.assertIn(method, candidate)
        self.assertIn("1 <= limit <= 50", source)
        self.assertIn('"owner", owner, order_id', source)
        self.assertIn('"contributor", who, order_id', source)
        self.assertIn('next_offset', source)
        self.assertIn('has_more', source)


if __name__ == "__main__":
    unittest.main()
