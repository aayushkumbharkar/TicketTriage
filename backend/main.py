"""
main.py — FastAPI application: routes, middleware, error handling, and startup.

All routes follow a consistent pattern:
  1. Validate input (Pydantic handles this automatically)
  2. Call the LLM or DB layer
  3. Return a typed response or raise an appropriate HTTPException

Error strategy:
  - 503 Service Unavailable: LLM is unreachable or timed out
  - 500 Internal Server Error: DB write failure
  - 404 Not Found: ticket ID does not exist
  - 422 Unprocessable Entity: invalid request body (handled by FastAPI/Pydantic)
"""

import logging
import logging.config
import os
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db, init_db
from backend.llm import PROMPT_VERSION, classify_ticket, regenerate_reply
import backend.llm as _llm_module
from backend.models import PromptConfig, Ticket
from backend.schemas import (
    AnalyticsResponse,
    PromptResponse,
    PromptUpdate,
    RegenerateResponse,
    TicketCreate,
    TicketResponse,
    TicketUpdate,
)

# ---------------------------------------------------------------------------
# Logging configuration — structured, level-aware, no print() anywhere
# ---------------------------------------------------------------------------
logging.config.dictConfig(
    {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "format": "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
                "datefmt": "%Y-%m-%dT%H:%M:%S",
            }
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "formatter": "default",
            }
        },
        "root": {"level": "INFO", "handlers": ["console"]},
    }
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Lifespan — replaces the deprecated @app.on_event("startup") pattern
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting TicketTriage API — initialising database...")
    await init_db()
    logger.info("Database ready. Serving requests.")
    yield
    logger.info("Shutting down TicketTriage API.")


# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------
app = FastAPI(
    title="TicketTriage API",
    description="AI-powered support ticket classification and response assistant.",
    version="1.0.0",
    lifespan=lifespan,
)

# Build CORS origins list: always include localhost dev URLs, plus any
# production origins supplied via the ALLOWED_ORIGINS environment variable
# (comma-separated, e.g. "https://tickettriage.vercel.app,https://www.tickettriage.com")
_extra_origins = [
    o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o.strip()
]
_origins = ["http://localhost:5173", "http://127.0.0.1:5173"] + _extra_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# POST /tickets — classify and store a new ticket
# ---------------------------------------------------------------------------
@app.post("/tickets", response_model=TicketResponse, status_code=201)
async def create_ticket(
    payload: TicketCreate,
    db: AsyncSession = Depends(get_db),
) -> TicketResponse:
    """
    Submit a new support ticket. Calls Gemini for classification + reply generation,
    persists the result to SQLite, and returns the full ticket record.
    """
    logger.info("New ticket received — subject=%r email=%r", payload.subject, payload.submitter_email)

    # LLM classification — always returns a result (fallback on error)
    classification = await classify_ticket(
        subject=payload.subject,
        description=payload.description,
        email=payload.submitter_email,
    )

    # Determine whether LLM succeeded or fell back
    llm_failed = classification.confidence == 0.0 and classification.category == "General"

    ticket = Ticket(
        subject=payload.subject,
        description=payload.description,
        submitter_email=payload.submitter_email,
        category=classification.category,
        priority=classification.priority,
        confidence=classification.confidence,
        reasoning=classification.reasoning,
        suggested_reply=classification.suggested_reply,
        prompt_version=PROMPT_VERSION,
    )

    try:
        db.add(ticket)
        await db.commit()
        await db.refresh(ticket)
    except Exception as exc:
        logger.error("Database write failed: %s", exc, exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed to persist ticket to database.")

    if llm_failed:
        logger.warning(
            "Ticket %s stored with fallback classification — LLM may be unavailable.", ticket.id
        )

    logger.info("Ticket created — id=%s category=%s priority=%s", ticket.id, ticket.category, ticket.priority)
    return TicketResponse.model_validate(ticket)


# ---------------------------------------------------------------------------
# GET /tickets — list tickets with optional filters
# ---------------------------------------------------------------------------
@app.get("/tickets", response_model=list[TicketResponse])
async def list_tickets(
    category: Optional[str] = Query(default=None),
    priority: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> list[TicketResponse]:
    """Return all tickets, optionally filtered by category and/or priority."""
    stmt = select(Ticket).order_by(Ticket.created_at.desc())

    if category:
        stmt = stmt.where(Ticket.category == category)
    if priority:
        stmt = stmt.where(Ticket.priority == priority)

    result = await db.execute(stmt)
    tickets = result.scalars().all()
    return [TicketResponse.model_validate(t) for t in tickets]


# ---------------------------------------------------------------------------
# GET /tickets/{id} — single ticket by ID
# ---------------------------------------------------------------------------
@app.get("/tickets/{ticket_id}", response_model=TicketResponse)
async def get_ticket(
    ticket_id: str,
    db: AsyncSession = Depends(get_db),
) -> TicketResponse:
    """Fetch a single ticket by its UUID."""
    ticket = await db.get(Ticket, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id!r} not found.")
    return TicketResponse.model_validate(ticket)


# ---------------------------------------------------------------------------
# PATCH /tickets/{id} — update status and/or final reply
# ---------------------------------------------------------------------------
@app.patch("/tickets/{ticket_id}", response_model=TicketResponse)
async def update_ticket(
    ticket_id: str,
    payload: TicketUpdate,
    db: AsyncSession = Depends(get_db),
) -> TicketResponse:
    """Update ticket status, final reply text, or is_edited flag."""
    ticket = await db.get(Ticket, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id!r} not found.")

    if payload.status is not None:
        ticket.status = payload.status
    if payload.final_reply is not None:
        ticket.final_reply = payload.final_reply
    if payload.is_edited is not None:
        ticket.is_edited = payload.is_edited

    try:
        await db.commit()
        await db.refresh(ticket)
    except Exception as exc:
        logger.error("Database update failed for ticket %s: %s", ticket_id, exc, exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update ticket.")

    logger.info("Ticket updated — id=%s status=%s is_edited=%s", ticket.id, ticket.status, ticket.is_edited)
    return TicketResponse.model_validate(ticket)


# ---------------------------------------------------------------------------
# DELETE /tickets/{id} — permanently delete a ticket
# ---------------------------------------------------------------------------
@app.delete("/tickets/{ticket_id}", status_code=204)
async def delete_ticket(
    ticket_id: str,
    db: AsyncSession = Depends(get_db),
) -> None:
    """Permanently delete a ticket by its UUID."""
    ticket = await db.get(Ticket, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id!r} not found.")

    try:
        await db.delete(ticket)
        await db.commit()
    except Exception as exc:
        logger.error("Database delete failed for ticket %s: %s", ticket_id, exc, exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete ticket.")

    logger.info("Ticket deleted — id=%s", ticket_id)


# ---------------------------------------------------------------------------
# POST /tickets/{id}/regenerate — regenerate suggested reply
# ---------------------------------------------------------------------------
@app.post("/tickets/{ticket_id}/regenerate", response_model=RegenerateResponse)
async def regenerate_ticket_reply(
    ticket_id: str,
    db: AsyncSession = Depends(get_db),
) -> RegenerateResponse:
    """
    Call Gemini again to regenerate the suggested reply with varied temperature.
    The classification (category/priority) is preserved — only the reply changes.
    Updates suggested_reply in the database.
    """
    ticket = await db.get(Ticket, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id!r} not found.")

    try:
        new_reply = await regenerate_reply(
            subject=ticket.subject,
            description=ticket.description,
            category=ticket.category,
            priority=ticket.priority,
            email=ticket.submitter_email,
        )
    except Exception as exc:
        logger.error("Reply regeneration failed for ticket %s: %s", ticket_id, exc, exc_info=True)
        raise HTTPException(
            status_code=503,
            detail="Reply regeneration service is temporarily unavailable. Please try again.",
        )

    if not new_reply:
        raise HTTPException(
            status_code=503,
            detail="LLM returned an empty reply. Please try again.",
        )

    try:
        ticket.suggested_reply = new_reply
        await db.commit()
    except Exception as exc:
        logger.error("Failed to persist regenerated reply for ticket %s: %s", ticket_id, exc, exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed to save regenerated reply.")

    logger.info("Reply regenerated for ticket %s", ticket_id)
    return RegenerateResponse(suggested_reply=new_reply)


# ---------------------------------------------------------------------------
# GET /analytics — aggregate metrics
# ---------------------------------------------------------------------------
@app.get("/analytics", response_model=AnalyticsResponse)
async def get_analytics(db: AsyncSession = Depends(get_db)) -> AnalyticsResponse:
    """
    Return aggregate statistics used by the analytics dashboard.
    Includes per-category average confidence for the confidence-by-category chart.
    """
    total_result = await db.execute(select(func.count(Ticket.id)))
    total: int = total_result.scalar_one() or 0

    if total == 0:
        return AnalyticsResponse(
            total_tickets=0,
            avg_confidence=0.0,
            pct_resolved=0.0,
            tickets_by_category={},
            tickets_by_priority={},
            avg_confidence_by_category={},
        )

    avg_conf_result = await db.execute(select(func.avg(Ticket.confidence)))
    avg_confidence: float = round(avg_conf_result.scalar_one() or 0.0, 4)

    resolved_result = await db.execute(
        select(func.count(Ticket.id)).where(Ticket.status == "Resolved")
    )
    resolved_count: int = resolved_result.scalar_one() or 0
    pct_resolved: float = round((resolved_count / total) * 100, 1)

    # Tickets by category
    cat_result = await db.execute(
        select(Ticket.category, func.count(Ticket.id)).group_by(Ticket.category)
    )
    tickets_by_category: dict[str, int] = {row[0]: row[1] for row in cat_result.all()}

    # Tickets by priority
    pri_result = await db.execute(
        select(Ticket.priority, func.count(Ticket.id)).group_by(Ticket.priority)
    )
    tickets_by_priority: dict[str, int] = {row[0]: row[1] for row in pri_result.all()}

    # Avg confidence by category — enables per-category quality monitoring
    conf_by_cat_result = await db.execute(
        select(Ticket.category, func.avg(Ticket.confidence)).group_by(Ticket.category)
    )
    avg_confidence_by_category: dict[str, float] = {
        row[0]: round(row[1], 4) for row in conf_by_cat_result.all()
    }

    return AnalyticsResponse(
        total_tickets=total,
        avg_confidence=avg_confidence,
        pct_resolved=pct_resolved,
        tickets_by_category=tickets_by_category,
        tickets_by_priority=tickets_by_priority,
        avg_confidence_by_category=avg_confidence_by_category,
    )


# ---------------------------------------------------------------------------
# GET /prompt — read the active system prompt
# ---------------------------------------------------------------------------
@app.get("/prompt", response_model=PromptResponse)
async def get_prompt(db: AsyncSession = Depends(get_db)) -> PromptResponse:
    """Return the active system prompt configuration (singleton row id=1)."""
    config = await db.get(PromptConfig, 1)
    if config is None:
        raise HTTPException(status_code=404, detail="Prompt config not found.")
    return PromptResponse.model_validate(config)


# ---------------------------------------------------------------------------
# PUT /prompt — update the system prompt and auto-bump version
# ---------------------------------------------------------------------------
@app.put("/prompt", response_model=PromptResponse)
async def update_prompt(
    payload: PromptUpdate,
    db: AsyncSession = Depends(get_db),
) -> PromptResponse:
    """
    Update the active system prompt text and bump the semantic version.

    bump_type="minor" increments the patch: v1.0 → v1.1 → v1.2 …
    bump_type="major" increments the major version: v1.x → v2.0

    The in-memory SYSTEM_PROMPT in llm.py is also updated immediately so
    new ticket classifications use the new prompt without requiring a restart.
    Old tickets retain their original prompt_version tag for cohort comparison.
    """
    config = await db.get(PromptConfig, 1)
    if config is None:
        raise HTTPException(status_code=404, detail="Prompt config not found.")

    # Parse current version string: "v{major}.{minor}"
    try:
        raw = config.version.lstrip("v")
        major_s, minor_s = raw.split(".")
        major, minor = int(major_s), int(minor_s)
    except Exception:
        major, minor = 1, 0

    if payload.bump_type == "major":
        major += 1
        minor = 0
    else:  # minor
        minor += 1

    new_version = f"v{major}.{minor}"

    config.system_prompt = payload.system_prompt
    config.version = new_version

    try:
        await db.commit()
        await db.refresh(config)
    except Exception as exc:
        logger.error("Failed to update prompt config: %s", exc, exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update prompt configuration.")

    # Update the in-memory prompt so the next classify_ticket call uses the new text
    _llm_module.SYSTEM_PROMPT = payload.system_prompt
    _llm_module.PROMPT_VERSION = new_version

    logger.info("Prompt updated — new version=%s", new_version)
    return PromptResponse.model_validate(config)


# ---------------------------------------------------------------------------
# Health check — used by Docker and load balancers
# ---------------------------------------------------------------------------
@app.get("/health")
async def health() -> dict:
    gemini_configured = bool(os.environ.get("GEMINI_API_KEY"))
    return {
        "status": "ok",
        "version": "1.0.0",
        "gemini_configured": gemini_configured,
    }
