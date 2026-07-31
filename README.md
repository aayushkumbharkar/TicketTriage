# TicketTriage

[![CI Pipeline](https://github.com/aayushkumbharkar/TicketTriage/actions/workflows/ci.yml/badge.svg)](https://github.com/aayushkumbharkar/TicketTriage/actions)
[![GitHub Repository](https://img.shields.io/badge/GitHub-TicketTriage-blue?logo=github)](https://github.com/aayushkumbharkar/TicketTriage)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-ticket--triage-5b52f0?style=flat-square)](https://ticket-triage-six.vercel.app/)

TicketTriage classifies support tickets and drafts customer replies in a single Gemini API call, returning structured JSON that includes category, priority, a 0–1 confidence score, a reasoning trace, and a suggested reply. The confidence score is intentional — it gives support teams a signal for when to trust the AI versus review manually. Every ticket also stores a `prompt_version` field, so that when the system prompt is revised, historical records stay tagged to the version that produced them, making it possible to measure how prompt changes affect classification quality over time. Given more time, I'd replace the SQLite backend with a hosted libSQL instance and add a confidence-threshold workflow that routes low-confidence tickets directly to a human queue.



---

## Architecture

```
┌─────────────────────────────────┐
│  React (Vite + Tailwind CSS)    │  http://localhost:5173
│  TicketForm · TicketList        │
│  TicketDetail · Analytics       │
└────────────┬────────────────────┘
             │ REST (axios)
             ▼
┌─────────────────────────────────┐
│  FastAPI (Python 3.10+)         │  http://localhost:8000
│  POST /tickets                  │
│  GET  /tickets                  │
│  GET  /tickets/{id}             │
│  PATCH /tickets/{id}            │
│  POST /tickets/{id}/regenerate  │
│  GET  /analytics                │
└────────┬────────────────────────┘
         │ google-genai SDK
         ▼
┌─────────────────────────────────┐    ┌──────────────────┐
│  Google Gemini Flash            │    │  SQLite (async)  │
│  gemini-3.6-flash               │    │  SQLAlchemy ORM  │
│  response_mime_type=json        │    │  aiosqlite       │
└─────────────────────────────────┘    └──────────────────┘
```

**Demo:** [Watch on Loom](https://www.loom.com/share/f0a30982b61341f69d29c91a10bd7a30)

---

## Running locally

**Prerequisites:** Python 3.10+, Node.js 18+, a Gemini API key from [aistudio.google.com](https://aistudio.google.com/app/apikey).

Clone the repo and set up the backend:

```bash
git clone https://github.com/aayushkumbharkar/TicketTriage.git
cd TicketTriage/backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
cp .env.example .env         # then set GEMINI_API_KEY in .env
```

Start the backend:

```bash
# From project root
python -m uvicorn backend.main:app --reload --port 8000
# API:  http://127.0.0.1:8000
# Docs: http://127.0.0.1:8000/docs
```

Start the frontend:

```bash
cd frontend
npm install
npm run dev
# UI: http://127.0.0.1:5173
```

Or run everything with Docker:

```bash
docker-compose up --build -d
```

### Testing

```bash
# Unit and API tests with a mock LLM
python -m unittest backend.test_main

# Live end-to-end simulation against the running server
python backend/test_e2e_simulation.py
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/tickets` | Submit and classify a new support ticket via Gemini AI |
| `GET` | `/tickets` | List tickets with optional filters (`?category=&priority=`) |
| `GET` | `/tickets/{id}` | Fetch single ticket details |
| `PATCH` | `/tickets/{id}` | Update ticket status or save edited final reply |
| `POST` | `/tickets/{id}/regenerate` | Regenerate AI suggested reply with varied temperature |
| `GET` | `/analytics` | Fetch aggregate metrics for analytics dashboard |
| `GET` | `/health` | Health check endpoint |

---

## Design decisions

The system prompt asks Gemini to return a single JSON object containing category, priority, confidence, reasoning, and suggested_reply in one call. Splitting triage and reply generation into two separate calls would double latency and token cost, and the two outputs would lose the contextual link between why a ticket was classified a certain way and how the reply should be framed. One call keeps both in the same reasoning context.

The confidence score is a 0.00–1.00 float returned by Gemini as part of the structured output. The intention is that tickets above 0.80 can flow through automatically, while anything below 0.50 surfaces a visual warning in the UI prompting an agent to review. This turns the AI's uncertainty into an actionable signal rather than hiding it.

When a support agent edits a suggested reply and saves it, the system sets `is_edited = true` and writes the modified text to `final_reply` while preserving the original in `suggested_reply`. This does two things: it gives supervisors a clean audit trail, and it passively accumulates a fine-tuning dataset — every row with `is_edited = true` is a human-labelled example of a better reply, ready to use for future model improvement.

Every ticket row stores a `prompt_version` field (currently `"v1.0"`). When the system prompt is changed — whether to fix a misclassification pattern or add a new category — existing records remain tagged to the prompt version that created them. This makes it possible to compare classification distributions across prompt versions and catch regressions before they affect the whole dataset.

If the Gemini API returns malformed JSON, a network error, or a timeout, the system catches the exception, logs the raw response for debugging, and stores the ticket with `category=General`, `priority=Medium`, `confidence=0.0`. The ticket is not dropped. The agent sees the fallback reply and a note that classification failed — no HTTP 500 is surfaced to the user.

The live deployment at [ticket-triage-six.vercel.app](https://ticket-triage-six.vercel.app/) serves the React frontend. The backend runs locally because Vercel cannot host a persistent SQLite file — the database would reset on every cold deployment. This is a known limitation. The immediate next step would be swapping SQLite for [Turso](https://turso.tech/) (hosted libSQL) or a serverless Postgres like Neon, which would make the full stack deployable without any local process.

---

## Known limitations and next steps

SQLite works well for a local prototype but is not viable on a serverless host. Every new Vercel deployment spins up a fresh container and the database file does not persist between cold starts. The fix is straightforward: Turso provides a hosted libSQL API-compatible with SQLAlchemy, or Neon provides serverless Postgres — either would require about an hour of migration work and a connection string swap in `database.py`.

There is no authentication layer. Any client that knows the API URL can submit tickets, read the full ticket list, or delete records. For a real deployment the minimum viable fix would be an API key header validated against an environment variable, with rate limiting applied per key. FastAPI makes this easy to layer in as a dependency.

The API has no rate limiting. A single client can submit tickets in a tight loop and exhaust the Gemini API quota. The short-term fix is `slowapi` (a FastAPI-compatible rate limiter) applied to the `POST /tickets` endpoint. The longer-term fix is a task queue — Celery or ARQ — so that LLM calls are processed asynchronously and the HTTP response returns immediately with a job ID.

Gemini introduces 1–3 seconds of latency per ticket submission, and the first call after a cold start on the API host can take significantly longer. The UI handles this with a loading state, but there is no streaming. The next version would stream the reply token-by-token using Gemini's streaming API and a server-sent events endpoint, which would make the latency feel much shorter even if the total time is the same.

---

## Tech Stack

| Component | Technology |
|---|---|
| **Frontend** | React 18, Vite 6, Tailwind CSS 3, Recharts, Axios, Oxlint |
| **Backend** | Python 3.10+, FastAPI, Uvicorn, Pydantic v2 |
| **LLM Integration** | Google Gemini 3.6 Flash (`gemini-3.6-flash`) via `google-genai` SDK |
| **Database** | SQLite, SQLAlchemy 2.0 (async), `aiosqlite` |
| **CI/CD & Containers**| GitHub Actions, Docker, Docker Compose |

---

## Project structure

```text
TicketTriage/
├── .github/workflows/ci.yml  # GitHub Actions CI workflow
├── backend/
│   ├── main.py               # FastAPI app, REST endpoints, CORS & lifespan
│   ├── llm.py                # Gemini SDK integration & prompt engineering
│   ├── database.py           # Async SQLAlchemy engine & session manager
│   ├── models.py             # ORM database models
│   ├── schemas.py            # Pydantic v2 schemas
│   ├── test_main.py          # Automated unit test suite with mock LLM
│   ├── test_e2e_simulation.py# End-to-end live API simulation runner
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── TicketForm.jsx   # 2-column ticket form & AI triage display
│   │   │   ├── TicketList.jsx   # Filterable ticket table with accordion
│   │   │   ├── TicketDetail.jsx # Editable reply & regenerate actions
│   │   │   └── Analytics.jsx    # Real-time KPI cards & Recharts charts
│   │   ├── utils/
│   │   │   └── badgeHelpers.js  # Badge styling helpers
│   │   ├── App.jsx              # Fixed sidebar layout & pill navigation
│   │   ├── main.jsx
│   │   └── index.css            # Custom design system tokens & styles
│   ├── tailwind.config.js
│   ├── package.json
│   └── vite.config.js
├── Dockerfile                # Root container build
├── docker-compose.yml        # Compose configuration
├── DEPLOYMENT.md             # Production deployment guide
└── README.md
```
