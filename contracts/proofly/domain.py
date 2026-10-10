"""Pure domain reference model; NOT a deployed GenLayer contract.

actor and now are inputs for tests. The future contract adapter must obtain
them from authenticated transaction context and chain time, never client JSON.
Evaluation results must come from validated GenLayer execution. This module
does not establish consensus, chain finality, or payment eligibility.
"""
from dataclasses import dataclass, replace
from enum import Enum
from hashlib import sha256
import json
import re


class DomainError(ValueError):
    pass


class EvidenceStatus(str, Enum):
    SATISFIED = "SATISFIED"
    UNSATISFIED = "UNSATISFIED"
    UNVERIFIABLE = "UNVERIFIABLE"


class Outcome(str, Enum):
    ACCEPTED = "ACCEPTED"
    CHANGES_REQUIRED = "CHANGES_REQUIRED"
    EVIDENCE_REQUIRED = "EVIDENCE_REQUIRED"


class Phase(str, Enum):
    PROPOSED = "PROPOSED"
    ACTIVE = "ACTIVE"
    SUBMITTED = "SUBMITTED"
    EVALUATING = "EVALUATING"
    REVIEWED = "REVIEWED"
    TECHNICAL_ERROR = "TECHNICAL_ERROR"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    CLOSED_NOT_ACCEPTED = "CLOSED_NOT_ACCEPTED"


def require(condition, message):
    if not condition:
        raise DomainError(message)


def valid_time(value):
    require(type(value) is int and value >= 0, "Invalid timestamp")


@dataclass(frozen=True)
class Requirement:
    id: str
    text: str


@dataclass(frozen=True)
class Spec:
    requirements: tuple[Requirement, ...]
    source_manifest_hash: str
    submit_deadline: int
    revision_deadline: int
    policy_version: str = "proofly.documentation.v1"
    max_submissions: int = 2

    def __post_init__(self):
        require(type(self.requirements) is tuple, "Requirements must be immutable")
        require(3 <= len(self.requirements) <= 5, "Expected 3 to 5 requirements")
        for item in self.requirements:
            require(isinstance(item, Requirement), "Invalid requirement")
            require(isinstance(item.id, str) and
                    re.fullmatch(r"R[1-9][0-9]*", item.id), "Invalid requirement id")
            require(isinstance(item.text, str) and
                    1 <= len(item.text.strip()) <= 500, "Invalid requirement text")
        require(len({r.id for r in self.requirements}) == len(self.requirements),
                "Duplicate requirement id")
        require(isinstance(self.source_manifest_hash, str) and
                re.fullmatch(r"[0-9a-f]{64}", self.source_manifest_hash),
                "Expected lowercase SHA-256 source hash")
        valid_time(self.submit_deadline)
        valid_time(self.revision_deadline)
        require(self.submit_deadline < self.revision_deadline, "Invalid deadlines")
        require(type(self.max_submissions) is int and self.max_submissions == 2,
                "MVP permits exactly two submission versions")
        require(self.policy_version == "proofly.documentation.v1", "Unknown policy")

    @property
    def digest(self):
        payload = {
            "requirements": [{"id": r.id, "text": r.text} for r in self.requirements],
            "source_manifest_hash": self.source_manifest_hash,
            "submit_deadline": self.submit_deadline,
            "revision_deadline": self.revision_deadline,
            "policy_version": self.policy_version,
            "max_submissions": self.max_submissions,
        }
        encoded = json.dumps(payload, sort_keys=True, ensure_ascii=False,
                             separators=(",", ":")).encode("utf-8")
        return sha256(encoded).hexdigest()


def aggregate(requirements, decisions):
    """All MVP requirements are mandatory. Never convert unknown into failure."""
    expected = {r.id for r in requirements}
    require(type(decisions) is dict and set(decisions) == expected,
            "Decision ids must match all requirements exactly")
    require(all(isinstance(v, EvidenceStatus) for v in decisions.values()),
            "Invalid decision status")
    values = set(decisions.values())
    if EvidenceStatus.UNSATISFIED in values:
        return Outcome.CHANGES_REQUIRED
    if EvidenceStatus.UNVERIFIABLE in values:
        return Outcome.EVIDENCE_REQUIRED
    return Outcome.ACCEPTED


@dataclass(frozen=True)
class Submission:
    version: int
    evidence_hash: str
    submitted_at: int
    attempt: int = 0
    decisions: tuple[tuple[str, EvidenceStatus], ...] = ()
    outcome: Outcome | None = None
    technical_errors: tuple[str, ...] = ()


@dataclass(frozen=True)
class WorkOrder:
    id: str
    owner: str
    contributor: str
    spec: Spec
    phase: Phase = Phase.PROPOSED
    accepted_spec_hash: str | None = None
    submissions: tuple[Submission, ...] = ()

    @classmethod
    def create(cls, order_id, owner, contributor, spec):
        require(all(isinstance(x, str) and x.strip()
                    for x in (order_id, owner, contributor)), "Missing identity")
        require(owner != contributor, "Owner and contributor must differ")
        require(isinstance(spec, Spec), "Invalid specification")
        return cls(order_id, owner, contributor, spec)

    def revise_spec(self, actor, spec):
        require(actor == self.owner, "Only owner can edit a proposal")
        require(self.phase == Phase.PROPOSED, "Accepted specification is locked")
        require(isinstance(spec, Spec), "Invalid specification")
        return replace(self, spec=spec)

    def accept(self, actor, spec_hash, now):
        valid_time(now)
        require(actor == self.contributor, "Only assigned contributor can accept")
        require(self.phase == Phase.PROPOSED, "Order is not proposed")
        require(now <= self.spec.submit_deadline, "Acceptance deadline passed")
        require(spec_hash == self.spec.digest, "Specification hash mismatch")
        return replace(self, phase=Phase.ACTIVE, accepted_spec_hash=spec_hash)

    def cancel(self, actor):
        require(actor == self.owner, "Only owner can cancel")
        require(self.phase == Phase.PROPOSED, "Only unaccepted proposals can be cancelled")
        return replace(self, phase=Phase.CANCELLED)

    def submit(self, actor, evidence_hash, now):
        valid_time(now)
        require(actor == self.contributor, "Only assigned contributor can submit")
        require(self.phase in (Phase.ACTIVE, Phase.REVIEWED), "Cannot submit in this phase")
        require(self.accepted_spec_hash == self.spec.digest, "Specification integrity error")
        require(isinstance(evidence_hash, str) and
                re.fullmatch(r"[0-9a-f]{64}", evidence_hash), "Invalid evidence hash")
        require(len(self.submissions) < self.spec.max_submissions, "Submission limit reached")
        deadline = (self.spec.revision_deadline if self.submissions
                    else self.spec.submit_deadline)
        require(now <= deadline, "Submission deadline passed")
        if self.submissions:
            require(now >= self.submissions[-1].submitted_at, "Time moved backwards")
            require(evidence_hash != self.submissions[-1].evidence_hash,
                    "Revision must contain new evidence")
        version = Submission(len(self.submissions) + 1, evidence_hash, now)
        return replace(self, phase=Phase.SUBMITTED, submissions=self.submissions + (version,))

    def _with_latest(self, submission, phase):
        return replace(self, phase=phase,
                       submissions=self.submissions[:-1] + (submission,))

    def begin_evaluation(self):
        require(self.phase in (Phase.SUBMITTED, Phase.TECHNICAL_ERROR),
                "Evaluation cannot start")
        latest = self.submissions[-1]
        require(latest.attempt < 3, "Technical retry budget exhausted")
        return self._with_latest(replace(latest, attempt=latest.attempt + 1), Phase.EVALUATING)

    def _check_attempt(self, version, attempt):
        require(self.phase == Phase.EVALUATING, "No active evaluation")
        latest = self.submissions[-1]
        require(type(version) is int and type(attempt) is int and
                (version, attempt) == (latest.version, latest.attempt),
                "Stale evaluation result")
        return latest

    def record_result(self, version, attempt, decisions):
        """Internal transition; a future API MUST NOT accept user-supplied verdicts."""
        latest = self._check_attempt(version, attempt)
        outcome = aggregate(self.spec.requirements, decisions)
        updated = replace(latest, decisions=tuple(sorted(decisions.items())), outcome=outcome)
        return self._with_latest(updated, Phase.COMPLETED if outcome == Outcome.ACCEPTED
                                 else Phase.REVIEWED)

    def record_technical_error(self, version, attempt, code):
        latest = self._check_attempt(version, attempt)
        require(code in ("RPC_ERROR", "LLM_ERROR", "FETCH_ERROR", "CONSENSUS_UNRESOLVED"),
                "Invalid technical error code")
        return self._with_latest(replace(latest, technical_errors=latest.technical_errors + (code,)),
                                 Phase.TECHNICAL_ERROR)

    def close_expired(self, now):
        valid_time(now)
        require(self.phase in (Phase.PROPOSED, Phase.ACTIVE, Phase.REVIEWED,
                               Phase.TECHNICAL_ERROR), "Cannot close pending or completed work")
        require(now > self.spec.revision_deadline, "Revision window is still open")
        return replace(self, phase=Phase.CLOSED_NOT_ACCEPTED)
