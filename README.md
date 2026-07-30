# TicketTriage

**AI Support Ticket Classifier & Response Assistant**

> Built as a technical assessment for Chartered Vectorial. Not a tutorial project — production patterns throughout.

---

## Architecture Overview

TicketTriage is a full-stack AI application with a clear three-layer architecture. The **React frontend** (Vite + Tailwind CSS) provides a premium dark-mode interface for submitting tickets, browsing the ticket list with filters, and viewing real-time analytics. It communicates exclusively with the **FastAPI backend** over a REST API, with CORS configured for the Vite development server. The backend is responsible for all business logic: it receives ticket submissions, calls **Google Gemini Flash** (`gemini-1.5-flash`) via the `google-genai` SDK with a carefully engineered system prompt, parses the structured JSON response (enforced by `response_mime_type="application/json"`), and persists the full classification result to **SQLite** via an async SQLAlchemy ORM. The database file is self-contained and mounts as a Docker volume in production, requiring zero external infrastructure.

```
┌─────────────────────────────────┐
│  React (Vite + Tailwind CSS)    │  http://localhost:5173
│  TicketForm · TicketList        │
│  TicketDetail · Analytics       │
└────────────┬────────────────────┘
             │ REST (axios)
             ▼
┌─────────────────────────────────┐
│  FastAPI (Python 3.11)          │  http://localhost:8000
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
│  gemini-1.5-flash               │    │  SQLAlchemy ORM  │
│  response_mime_type=json        │    │  aiosqlite       │
└─────────────────────────────────┘    └──────────────────┘
```

---

## Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- A Google Gemini API key (free at [aistudio.google.com](https://aistudio.google.com/app/apikey))

### 1. Clone the repository

```bash
git clone https://github.com/your-username/tickettriage.git
cd tickettriage
```

### 2. Backend setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and set your GEMINI_API_KEY
```

### 3. Run the backend

```bash
# From the project root (tickettriage/), not inside backend/
uvicorn backend.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

### 4. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173`.

### 5. Docker (optional — backend only)

```bash
# From the project root
cp backend/.env.example .env
# Edit .env and set GEMINI_API_KEY

docker-compose up --build
```

The backend runs in a container with the SQLite database mounted as a persistent volume. The frontend still runs via `npm run dev`.

---

## Environment Variables

See [`backend/.env.example`](backend/.env.example):

```env
# Required: Google Gemini API key
# Get yours at https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/tickets` | Submit and classify a new ticket |
| `GET` | `/tickets` | List tickets (`?category=&priority=`) |
| `GET` | `/tickets/{id}` | Fetch a single ticket |
| `PATCH` | `/tickets/{id}` | Update status / final reply |
| `POST` | `/tickets/{id}/regenerate` | Regenerate suggested reply |
| `GET` | `/analytics` | Aggregate metrics |
| `GET` | `/health` | Health check |

---

## Design Decisions

**Why SQLite?**
SQLite was chosen deliberately — not as a shortcut, but because it is the right tool for this use case. It requires zero infrastructure, ships as a single file inside the repository, has no connection pool to manage, and handles the ticket volumes this system would realistically see at early scale without any tuning. When the system grows to warrant a multi-process deployment, swapping the SQLAlchemy connection string to PostgreSQL is a one-line change. Using a heavyweight database here would be premature optimisation.

**Why a single LLM call for both classification and reply generation?**
Making one Gemini call that returns category, priority, confidence, reasoning, *and* the suggested reply in a single JSON response is both faster and semantically superior to two chained calls. The subject and description are present in context for both tasks simultaneously, so the reply generation can reference the classification rationale without losing context across a round-trip. It also halves API latency and cost per ticket — important for a system that may process many tickets per minute under load.

**Why a confidence score?**
The confidence float is not a vanity metric. It gives human support agents a concrete triage signal: tickets classified at ≥ 80% confidence can be handled autonomously with high trust, while those below 50% should be flagged for manual review before the suggested reply is sent. In the analytics dashboard, `avg_confidence_by_category` surfaces which ticket types the model struggles with — a direct input for prompt iteration or fine-tuning. The confidence score transforms the AI from a black box into an auditable, calibrated system.

**Why `is_edited` tracking?**
Every support reply produced by TicketTriage is either AI-generated (`is_edited = false`) or human-modified (`is_edited = true`). Storing this boolean creates a permanent audit trail distinguishing autonomous AI output from human-reviewed content — important for accountability. More valuably, the set of human-edited replies becomes a high-quality fine-tuning dataset: these are examples where an engineer decided the AI's draft was not good enough and improved it. Over time, analysing the delta between `suggested_reply` and `final_reply` on edited tickets is how you improve the model.

**Why `prompt_version`?**
Every ticket record stores a `prompt_version` string (e.g. `"v1.0"`) that identifies which version of the system prompt classified it, populated from a `PROMPT_VERSION` constant in `llm.py`. This is forward-looking observability for prompt engineering. When the system prompt is updated — to improve priority accuracy, add a new category, or fix an edge case — historical tickets retain their cohort label. This makes it possible to compare classification quality across prompt versions retrospectively, detect regressions, and attribute any drift in the analytics dashboard to a specific prompt change. Most systems treat prompt changes as invisible; this one treats them as traceable deployments.

---

## Known Limitations & Future Work

| Limitation | What I'd do with more time |
|------------|---------------------------|
| No authentication | Add JWT-based auth with role-based access (agent vs. admin) |
| SQLite single-file | Migrate to PostgreSQL for multi-process / multi-node deployment |
| No rate limiting | Add per-IP rate limiting on `POST /tickets` via `slowapi` |
| Gemini API key in env | Integrate with a secrets manager (AWS Secrets Manager / GCP Secret Manager) |
| No test suite | Add `pytest` unit tests for `llm.py` fallback paths and FastAPI route tests |
| Frontend has no pagination | Add cursor-based pagination for the ticket list at scale |
| No webhook / email notification | Notify the submitter when their ticket is triaged |
| Analytics doesn't auto-refresh | Add a WebSocket or SSE endpoint for live dashboard updates |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Tailwind CSS 3, Recharts, Axios |
| Backend | Python 3.11, FastAPI, Uvicorn |
| LLM | Google Gemini Flash (`gemini-1.5-flash`) via `google-genai` SDK |
| Database | SQLite, SQLAlchemy 2.x (async), aiosqlite |
| Container | Docker, Docker Compose |

---

## Project Structure

```
tickettriage/
├── backend/
│   ├── main.py          # FastAPI app, all routes, error handling
│   ├── models.py        # SQLAlchemy ORM model (Ticket)
│   ├── database.py      # Async engine, session factory, init_db
│   ├── llm.py           # Gemini calls, prompt engineering, PROMPT_VERSION
│   ├── schemas.py       # Pydantic v2 request/response models
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── TicketForm.jsx    # Submit form + loading skeleton
│   │   │   ├── TicketList.jsx    # Filterable table, inline status
│   │   │   ├── TicketDetail.jsx  # Editable reply, regenerate, copy
│   │   │   └── Analytics.jsx     # KPI cards + 3 Recharts charts
│   │   ├── App.jsx               # Tab navigation, layout
│   │   ├── main.jsx
│   │   └── index.css             # Design system, tokens, animations
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── postcss.config.js
├── docker-compose.yml
└── README.md
```
