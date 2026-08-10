"""
models.py — SQLAlchemy ORM model for the Ticket entity.

Design notes:
- UUID primary key: avoids sequential ID enumeration, safe to expose in URLs.
- prompt_version: forward-looking observability field. When the system prompt
  changes, previously classified tickets retain the version they were classified
  under, enabling per-cohort quality analysis.
- is_edited: creates an audit trail distinguishing AI-generated replies from
  human-modified ones — valuable for future fine-tuning datasets.
- updated_at uses onupdate to track the last mutation time automatically.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Ticket(Base):
    __tablename__ = "tickets"

    # ------------------------------------------------------------------
    # Identity
    # ------------------------------------------------------------------
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )

    # ------------------------------------------------------------------
    # Submission fields
    # ------------------------------------------------------------------
    subject: Mapped[str] = mapped_column(String(512), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    submitter_email: Mapped[str | None] = mapped_column(String(320), nullable=True)

    # ------------------------------------------------------------------
    # LLM classification output
    # ------------------------------------------------------------------
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    priority: Mapped[str] = mapped_column(String(32), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    reasoning: Mapped[str] = mapped_column(Text, nullable=False, default="")
    suggested_reply: Mapped[str] = mapped_column(Text, nullable=False, default="")

    # ------------------------------------------------------------------
    # Human-in-the-loop fields
    # ------------------------------------------------------------------
    final_reply: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_edited: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # ------------------------------------------------------------------
    # Workflow
    # ------------------------------------------------------------------
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="Open"
    )  # Open | In Progress | Resolved

    # ------------------------------------------------------------------
    # Prompt observability — populated from llm.PROMPT_VERSION
    # ------------------------------------------------------------------
    prompt_version: Mapped[str] = mapped_column(
        String(32), nullable=False, default="v1.0"
    )

    # ------------------------------------------------------------------
    # Timestamps
    # ------------------------------------------------------------------
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=_utcnow,
        onupdate=_utcnow,
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Ticket id={self.id!r} subject={self.subject!r} status={self.status!r}>"


class PromptConfig(Base):
    """
    Singleton configuration table for the active system prompt.

    Design: always exactly one row (id=1). The `version` field uses semantic
    versioning (v{major}.{minor}). When the prompt changes:
    - Minor bump (v1.0 → v1.1): wording tweaks, same structure
    - Major bump (v1.x → v2.0): structural or intent-level rewrite

    Every Ticket stores the `prompt_version` string at classification time,
    enabling retrospective quality comparisons across prompt cohorts.
    """
    __tablename__ = "prompt_config"

    id: Mapped[int] = mapped_column(primary_key=True, default=1)

    version: Mapped[str] = mapped_column(
        String(32), nullable=False, default="v1.0"
    )

    system_prompt: Mapped[str] = mapped_column(
        Text, nullable=False, default=""
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=_utcnow,
        onupdate=_utcnow,
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<PromptConfig version={self.version!r}>"
