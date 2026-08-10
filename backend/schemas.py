"""
schemas.py — Pydantic v2 request / response models.

Keeping API contracts explicit and separate from ORM models prevents
accidental leakage of internal fields and makes the API surface easy to version.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


# ---------------------------------------------------------------------------
# Internal — LLM output shape (not exposed in API responses directly)
# ---------------------------------------------------------------------------

class LLMClassification(BaseModel):
    category: str = Field(default="General")
    priority: str = Field(default="Medium")
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    reasoning: str = Field(default="")
    suggested_reply: str = Field(default="")

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        allowed = {"Billing", "Bug", "Feature Request", "General"}
        return v if v in allowed else "General"

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, v: str) -> str:
        allowed = {"Low", "Medium", "High"}
        return v if v in allowed else "Medium"

    @field_validator("confidence")
    @classmethod
    def clamp_confidence(cls, v: float) -> float:
        return max(0.0, min(1.0, v))


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------

class TicketCreate(BaseModel):
    subject: str = Field(..., min_length=1, max_length=512)
    description: str = Field(..., min_length=1)
    submitter_email: Optional[str] = Field(default=None)


class TicketUpdate(BaseModel):
    status: Optional[str] = Field(default=None)
    final_reply: Optional[str] = Field(default=None)
    is_edited: Optional[bool] = Field(default=None)

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        allowed = {"Open", "In Progress", "Resolved"}
        if v not in allowed:
            raise ValueError(f"status must be one of {allowed}")
        return v


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------

class TicketResponse(BaseModel):
    id: str
    subject: str
    description: str
    submitter_email: Optional[str]
    category: str
    priority: str
    confidence: float
    reasoning: str
    suggested_reply: str
    final_reply: Optional[str]
    is_edited: bool
    status: str
    prompt_version: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RegenerateResponse(BaseModel):
    suggested_reply: str


# ---------------------------------------------------------------------------
# Analytics response
# ---------------------------------------------------------------------------

class AnalyticsResponse(BaseModel):
    total_tickets: int
    avg_confidence: float
    pct_resolved: float
    tickets_by_category: dict[str, int]
    tickets_by_priority: dict[str, int]
    avg_confidence_by_category: dict[str, float]


# ---------------------------------------------------------------------------
# Prompt management schemas
# ---------------------------------------------------------------------------

class PromptResponse(BaseModel):
    """Returned by GET /prompt and PUT /prompt."""
    version: str
    system_prompt: str
    updated_at: datetime

    model_config = {"from_attributes": True}


class PromptUpdate(BaseModel):
    """Request body for PUT /prompt."""
    system_prompt: str = Field(..., min_length=10)
    bump_type: str = Field(default="minor")

    @field_validator("bump_type")
    @classmethod
    def validate_bump_type(cls, v: str) -> str:
        if v not in {"minor", "major"}:
            raise ValueError("bump_type must be 'minor' or 'major'")
        return v

