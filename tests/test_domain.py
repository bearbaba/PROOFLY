import unittest
from dataclasses import FrozenInstanceError, replace
from itertools import product
from contracts.proofly.domain import (
    DomainError, EvidenceStatus as S, Outcome, Phase,
    Requirement, Spec, WorkOrder, aggregate,
)


def spec():
    return Spec(tuple(Requirement(f"R{i}", f"Requirement {i}") for i in range(1, 4)),
                "a" * 64, 100, 200)


def proposed():
    return WorkOrder.create("order-1", "owner", "contributor", spec())


def active():
    order = proposed()
    return order.accept("contributor", order.spec.digest, 10)


def evaluating():
    return active().submit("contributor", "b" * 64, 50).begin_evaluation()


def decisions(status=S.SATISFIED):
    return {f"R{i}": status for i in range(1, 4)}


class DomainTests(unittest.TestCase):
    def test_all_27_result_vectors(self):
        for vector in product(list(S), repeat=3):
            with self.subTest(vector=vector):
                result = aggregate(spec().requirements, dict(zip(("R1", "R2", "R3"), vector)))
                expected = (Outcome.CHANGES_REQUIRED if S.UNSATISFIED in vector else
                            Outcome.EVIDENCE_REQUIRED if S.UNVERIFIABLE in vector else
                            Outcome.ACCEPTED)
                self.assertEqual(result, expected)

    def test_unknown_is_not_failure(self):
        order = evaluating().record_result(1, 1, decisions(S.UNVERIFIABLE))
        self.assertEqual(order.submissions[-1].outcome, Outcome.EVIDENCE_REQUIRED)

    def test_missing_extra_or_invalid_decisions(self):
        for bad in ({}, {**decisions(), "R4": S.SATISFIED},
                    {**decisions(), "R1": "SATISFIED"}):
            with self.subTest(bad=bad), self.assertRaises(DomainError):
                evaluating().record_result(1, 1, bad)

    def test_schema_rejects_duplicates_and_mutable_collections(self):
        for reqs in ((Requirement("R1", "x"),) * 3, list(spec().requirements)):
            with self.subTest(reqs=reqs), self.assertRaises(DomainError):
                replace(spec(), requirements=reqs)

    def test_invalid_spec_fields(self):
        for change in ({"submit_deadline": True}, {"revision_deadline": 50},
                       {"source_manifest_hash": "bad"}, {"max_submissions": 3},
                       {"policy_version": "unknown"}):
            with self.subTest(change=change), self.assertRaises(DomainError):
                replace(spec(), **change)

    def test_hash_binds_sources_deadlines_and_criteria(self):
        original = spec()
        self.assertEqual(original.digest, spec().digest)
        for changed in (replace(original, source_manifest_hash="d" * 64),
                        replace(original, revision_deadline=201),
                        replace(original, requirements=original.requirements[:2] +
                                (Requirement("R3", "Changed requirement"),))):
            self.assertNotEqual(original.digest, changed.digest)

    def test_unauthorized_accept_and_wrong_hash(self):
        for actor, digest in (("intruder", spec().digest), ("contributor", "wrong")):
            with self.subTest(actor=actor), self.assertRaises(DomainError):
                proposed().accept(actor, digest, 10)

    def test_spec_locks_at_acceptance(self):
        with self.assertRaises(DomainError):
            active().revise_spec("owner", spec())
        with self.assertRaises(FrozenInstanceError):
            active().spec = spec()

    def test_cancel_only_before_acceptance(self):
        self.assertEqual(proposed().cancel("owner").phase, Phase.CANCELLED)
        with self.assertRaises(DomainError):
            active().cancel("owner")
        with self.assertRaises(DomainError):
            proposed().cancel("contributor")

    def test_submit_authorization_and_acceptance_required(self):
        for order, actor in ((proposed(), "contributor"), (active(), "intruder")):
            with self.subTest(actor=actor), self.assertRaises(DomainError):
                order.submit(actor, "b" * 64, 50)

    def test_submission_deadline_boundary(self):
        self.assertEqual(active().submit("contributor", "b" * 64, 100).phase, Phase.SUBMITTED)
        with self.assertRaises(DomainError):
            active().submit("contributor", "b" * 64, 101)

    def test_completed_order_cannot_change(self):
        done = evaluating().record_result(1, 1, decisions())
        self.assertEqual(done.phase, Phase.COMPLETED)
        with self.assertRaises(DomainError):
            done.submit("contributor", "c" * 64, 150)
        with self.assertRaises(DomainError):
            done.record_result(1, 1, decisions(S.UNSATISFIED))

    def test_revision_preserves_history_and_limit(self):
        reviewed = evaluating().record_result(1, 1, decisions(S.UNSATISFIED))
        second = reviewed.submit("contributor", "c" * 64, 150)
        self.assertEqual(second.submissions[0], reviewed.submissions[0])
        self.assertEqual(second.submissions[1].version, 2)
        second = second.begin_evaluation().record_result(2, 1, decisions(S.UNVERIFIABLE))
        with self.assertRaises(DomainError):
            second.submit("contributor", "d" * 64, 175)

    def test_identical_revision_and_late_revision_rejected(self):
        reviewed = evaluating().record_result(1, 1, decisions(S.UNSATISFIED))
        for digest, now in (("b" * 64, 150), ("c" * 64, 201)):
            with self.subTest(now=now), self.assertRaises(DomainError):
                reviewed.submit("contributor", digest, now)

    def test_technical_error_does_not_create_verdict(self):
        failed = evaluating().record_technical_error(1, 1, "LLM_ERROR")
        self.assertIsNone(failed.submissions[-1].outcome)
        self.assertEqual(failed.submissions[-1].decisions, ())
        retry = failed.begin_evaluation()
        self.assertEqual(len(retry.submissions), 1)
        self.assertEqual(retry.submissions[-1].attempt, 2)
        done = retry.record_result(1, 2, decisions())
        self.assertEqual(done.submissions[-1].technical_errors, ("LLM_ERROR",))

    def test_stale_attempt_cannot_overwrite_retry(self):
        retry = evaluating().record_technical_error(1, 1, "RPC_ERROR").begin_evaluation()
        with self.assertRaises(DomainError):
            retry.record_result(1, 1, decisions())

    def test_stale_version_cannot_overwrite_new_submission(self):
        next_version = (evaluating().record_result(1, 1, decisions(S.UNSATISFIED))
                        .submit("contributor", "c" * 64, 150).begin_evaluation())
        with self.assertRaises(DomainError):
            next_version.record_result(1, 1, decisions())

    def test_no_duplicate_evaluation(self):
        with self.assertRaises(DomainError):
            evaluating().begin_evaluation()

    def test_retry_budget(self):
        order = evaluating()
        for attempt in (1, 2, 3):
            order = order.record_technical_error(1, attempt, "CONSENSUS_UNRESOLVED")
            if attempt < 3:
                order = order.begin_evaluation()
        with self.assertRaises(DomainError):
            order.begin_evaluation()

    def test_close_expired_preserves_unknown(self):
        reviewed = evaluating().record_result(1, 1, decisions(S.UNVERIFIABLE))
        with self.assertRaises(DomainError):
            reviewed.close_expired(200)
        closed = reviewed.close_expired(201)
        self.assertEqual(closed.phase, Phase.CLOSED_NOT_ACCEPTED)
        self.assertEqual(closed.submissions[-1].outcome, Outcome.EVIDENCE_REQUIRED)

    def test_cannot_close_pending_evaluation(self):
        for order in (evaluating(), active().submit("contributor", "b" * 64, 50)):
            with self.subTest(phase=order.phase), self.assertRaises(DomainError):
                order.close_expired(300)


if __name__ == "__main__":
    unittest.main()
