# TicketTriage

**AI Support Ticket Classifier & Response Assistant**

[![CI Pipeline](https://github.com/aayushkumbharkar/TicketTriage/actions/workflows/ci.yml/badge.svg)](https://github.com/aayushkumbharkar/TicketTriage/actions)
[![GitHub Repository](https://img.shields.io/badge/GitHub-TicketTriage-blue?logo=github)](https://github.com/aayushkumbharkar/TicketTriage)

---

## 🏛️ Architecture Overview

TicketTriage is a full-stack AI application engineered with production-grade architectural patterns. The **React frontend** (Vite + Tailwind CSS with custom design system tokens) provides a dark-mode interface for submitting tickets, reviewing AI classification rationale, inline reply editing, and monitoring real-time analytics. It communicates with the **FastAPI backend** over RESTful APIs.

The backend calls **Google Gemini 2.0 Flash** (`gemini-2.0-flash`) via the official `google-genai` SDK using a single-pass JSON-structured system prompt (`response_mime_type="application/json"`). Results are persisted to **SQLite** via an async SQLAlchemy ORM engine (`aiosqlite`).

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
│  gemini-2.0-flash               │    │  SQLAlchemy ORM  │
│  response_mime_type=json        │    │  aiosqlite       │
└─────────────────────────────────┘    └──────────────────┘
```

---

## ⚡ Quick Setup & Running Locally

### Prerequisites
- Python 3.10+
- Node.js 18+
- Google Gemini API key (Free at [aistudio.google.com](https://aistudio.google.com/app/apikey))

### 1. Clone the repository
```bash
git clone https://github.com/aayushkumbharkar/TicketTriage.git
cd TicketTriage
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt

cp .env.example .env
# Edit .env and set your GEMINI_API_KEY
```

### 3. Run Backend Server
```bash
# From project root (TicketTriage/)
python -m uvicorn backend.main:app --reload --port 8000
```
- API: `http://127.0.0.1:8000`
- Interactive Swagger API Docs: `http://127.0.0.1:8000/docs`

### 4. Frontend Setup & Launch
```bash
cd frontend
npm install
npm run dev
```
- Web Application UI: `http://127.0.0.1:5173`

### 5. Automated Tests Execution
```bash
# Run unit & API test suite
python -m unittest backend.test_main

# Run live E2E simulation test
python backend/test_e2e_simulation.py
```

### 6. One-Command Docker Setup
```bash
docker-compose up --build -d
```

---

## 📋 API Reference

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

## 💡 Engineering & Architectural Decisions

1. **Single-Pass LLM Triage & Reply Generation**:
   Executing a single prompt that returns `category`, `priority`, `confidence`, `reasoning`, and `suggested_reply` in one JSON payload eliminates double LLM latency, cuts API token costs by 50%, and guarantees contextual harmony between classification rationale and reply drafting.

2. **Calibrated Confidence Score**:
   Every classification includes a 0.00–1.00 confidence float. Tickets $\ge 80\%$ confidence can be handled automatically by support teams, while low confidence scores ($< 50\%$) trigger visual warnings for human agent review.

3. **Human Audit Trail & `is_edited` Dataset Creation**:
   Support agents can edit draft replies directly in the UI. Saving an edit flags `is_edited = true` and updates `final_reply`. This preserves transparency and accumulates a fine-tuning dataset comparing original AI drafts against agent-verified responses.

4. **Prompt Version Cohort Observability (`prompt_version`)**:
   Every ticket stores `prompt_version` (e.g. `"v1.0"`). When prompts are iterated over time, historical records preserve their cohort tag, enabling retrospective evaluation of prompt drift and classification quality.

5. **Resilient Failure Fallbacks**:
   If Gemini API encounters network timeouts or rate limits, the system catches exceptions, logs detailed diagnostic context, and returns a safe default triage record without crashing or returning HTTP 500 errors to users.

---

## 🛠️ Tech Stack

| Component | Technology |
|---|---|
| **Frontend** | React 18, Vite 6, Tailwind CSS 3, Recharts, Axios, Oxlint |
| **Backend** | Python 3.10+, FastAPI, Uvicorn, Pydantic v2 |
| **LLM Integration** | Google Gemini 2.0 Flash (`gemini-2.0-flash`) via `google-genai` SDK |
| **Database** | SQLite, SQLAlchemy 2.0 (async), `aiosqlite` |
| **CI/CD & Containers**| GitHub Actions, Docker, Docker Compose |

---

## 📁 Repository Structure

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
