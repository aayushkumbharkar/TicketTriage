"""
llm.py — All Gemini API interactions and prompt engineering for TicketTriage.

Design decisions:
- PROMPT_VERSION constant: every ticket stores which prompt version classified it.
  When the system prompt is updated, historical tickets retain their cohort label,
  enabling per-version quality analysis and regression detection.
- Single LLM call: classification and reply generation share the same context
  window, reducing latency and API cost compared to chained calls.
- response_mime_type="application/json": forces Gemini to emit valid JSON
  without markdown fencing, eliminating brittle regex stripping.
- Graceful degradation: on any failure the fallback returns a safe default dict
  so the application never crashes — the caller always gets a usable result.
"""

import json
import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types

from backend.schemas import LLMClassification

# Load .env from the backend/ directory regardless of where the server is launched from
load_dotenv(dotenv_path=Path(__file__).parent / ".env")

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Prompt versioning — increment this when the system prompt is changed.
# Every ticket stored in the DB carries this version string so you can
# retrospectively analyse how prompt changes affected classification quality.
# ---------------------------------------------------------------------------
PROMPT_VERSION = "v1.0"

# ---------------------------------------------------------------------------
# Gemini client — lazily instantiated so missing keys don't crash at import.
# The ValueError from genai.Client is caught at call-time and returns the
# safe fallback, keeping the application functional even without a key.
# ---------------------------------------------------------------------------
MODEL = "gemini-2.5-flash"
_client: genai.Client | None = None


def _get_client() -> genai.Client:
    """Return (or create) the Gemini client. Raises ValueError if key missing."""
    global _client
    if _client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError(
                "GEMINI_API_KEY environment variable is not set. "
                "Copy backend/.env.example to backend/.env and add your key."
            )
        _client = genai.Client(api_key=api_key)
    return _client

# ---------------------------------------------------------------------------
# System prompt — engineered for precision, not just correctness.
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = """\
You are a senior support operations analyst at a SaaS company. Your job is to \
triage incoming customer support tickets with precision and empathy.

For each ticket, you will:
1. Classify it into exactly one category: Billing, Bug, Feature Request, or General
2. Assign a priority: Low, Medium, or High — based on business impact and urgency
3. Estimate your confidence in this classification as a float between 0.0 and 1.0
4. Write one sentence explaining your reasoning
5. Draft a professional, warm, and helpful suggested reply to the customer — \
address them by name if an email is provided, acknowledge their specific issue, \
and provide clear next steps. Do not use generic filler phrases like \
"I hope this email finds you well."

Priority guidelines:
- High: system down, data loss, billing overcharge, security concern, \
  payment failure, account locked
- Medium: feature broken but workaround exists, general confusion, \
  billing question, degraded performance
- Low: feature request, general inquiry, compliment, feedback, \
  cosmetic issue

Confidence guidelines:
- 0.9–1.0: ticket is unambiguous, single clear category
- 0.6–0.89: ticket is mostly clear with minor ambiguity
- 0.3–0.59: ticket could belong to multiple categories
- 0.0–0.29: ticket is very vague or lacks sufficient context

Respond ONLY with a single valid JSON object matching this exact schema — \
no markdown fences, no preamble, no trailing text:
{
  "category": "Billing" | "Bug" | "Feature Request" | "General",
  "priority": "Low" | "Medium" | "High",
  "confidence": <float 0.0–1.0>,
  "reasoning": "<one sentence>",
  "suggested_reply": "<full drafted reply to the customer>"
}
"""

# ---------------------------------------------------------------------------
# Fallback result — returned on any LLM or parse error.
# ---------------------------------------------------------------------------
_FALLBACK: dict = {
    "category": "General",
    "priority": "Medium",
    "confidence": 0.0,
    "reasoning": "Classification unavailable — LLM error occurred.",
    "suggested_reply": (
        "Thank you for reaching out. We have received your support request "
        "and a member of our team will be in touch shortly to assist you."
    ),
}


def _build_user_message(subject: str, description: str, email: str | None) -> str:
    """Format the ticket fields into a compact user-turn message."""
    email_line = f"Submitter email: {email}" if email else "Submitter email: not provided"
    return (
        f"Subject: {subject}\n"
        f"Description: {description}\n"
        f"{email_line}"
    )


async def classify_ticket(
    subject: str,
    description: str,
    email: str | None = None,
) -> LLMClassification:
    """
    Submit a ticket to Gemini for classification and reply generation.

    Returns a validated LLMClassification. On any failure, logs the error
    and returns a safe fallback so the application remains functional.
    """
    user_message = _build_user_message(subject, description, email)

    try:
        logger.info("Classifying ticket — subject=%r prompt_version=%s", subject, PROMPT_VERSION)

        response = _get_client().models.generate_content(
            model=MODEL,
            contents=user_message,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                response_mime_type="application/json",
                temperature=0.2,   # Low temperature for deterministic classification
                max_output_tokens=1024,
            ),
        )

        raw_text = response.text
        logger.debug("Gemini raw response: %s", raw_text)

        try:
            data = json.loads(raw_text)
        except json.JSONDecodeError as parse_err:
            # Log the raw response so engineers can diagnose prompt failures
            logger.error(
                "JSON parse failure — prompt_version=%s parse_error=%s raw_response=%r",
                PROMPT_VERSION,
                parse_err,
                raw_text,
            )
            return LLMClassification(**_FALLBACK)

        classification = LLMClassification(**data)
        logger.info(
            "Classification complete — category=%s priority=%s confidence=%.2f",
            classification.category,
            classification.priority,
            classification.confidence,
        )
        return classification

    except Exception as exc:
        logger.error(
            "Gemini API call failed — prompt_version=%s error=%s",
            PROMPT_VERSION,
            exc,
            exc_info=True,
        )
        return LLMClassification(**_FALLBACK)


async def regenerate_reply(
    subject: str,
    description: str,
    category: str,
    priority: str,
    email: str | None = None,
) -> str:
    """
    Regenerate the suggested reply for an already-classified ticket.

    Uses a higher temperature to introduce variation without reclassifying.
    The category and priority are injected into the prompt to keep the
    reply contextually consistent with the original classification.
    """
    user_message = (
        f"Subject: {subject}\n"
        f"Description: {description}\n"
        f"Submitter email: {email or 'not provided'}\n\n"
        f"This ticket has already been classified as Category={category}, "
        f"Priority={priority}. Please draft an alternative professional reply "
        f"to the customer — different wording, same helpful intent. "
        f"Return ONLY the reply text, no JSON wrapper."
    )

    try:
        logger.info("Regenerating reply for ticket — subject=%r", subject)

        response = _get_client().models.generate_content(
            model=MODEL,
            contents=user_message,
            config=types.GenerateContentConfig(
                system_instruction=(
                    "You are a senior support operations analyst. Write warm, "
                    "professional customer support replies. Be concise and helpful."
                ),
                temperature=0.8,   # Higher temperature for reply variation
                max_output_tokens=512,
            ),
        )

        reply = (response.text or "").strip()
        logger.info("Reply regeneration complete — length=%d chars", len(reply))
        return reply

    except Exception as exc:
        logger.error(
            "Gemini regenerate call failed — error=%s",
            exc,
            exc_info=True,
        )
        return _FALLBACK["suggested_reply"]
