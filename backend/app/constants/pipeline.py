"""Canonical pipeline stage identifiers (must match DB enum `application_status`)."""

PIPELINE_STAGES: tuple[str, ...] = (
    "applied",
    "screening",
    "interview",
    "offer",
    "hired",
    "rejected",
)

PIPELINE_STAGE_SET = frozenset(PIPELINE_STAGES)
