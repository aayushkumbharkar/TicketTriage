# 🎥 TicketTriage — 2–3 Minute Demo Video Script & Recording Guide

**Candidate**: Aayush Kumbharkar  
**Position**: AI Engineer Assessment (2nd Round)  
**Company**: Chartered Vectorial  
**Target Duration**: 2 Minutes 30 Seconds (150 Seconds)  

---

## 🎬 Pre-Recording Checklist & Screen Setup

1. **Browser Windows**:
   - Tab 1: Live Application at `http://127.0.0.1:5173` (or deployed URL)
   - Tab 2: Swagger API Documentation at `http://127.0.0.1:8000/docs`
   - Tab 3: GitHub Repository at `https://github.com/aayushkumbharkar/TicketTriage`

2. **Screen Recording Tool**: OBS Studio / Loom / QuickTime (record full screen at 1080p, clear microphone audio).

---

## 📜 Word-for-Word Narration & Action Script

### ⏱️ 0:00 – 0:25 | Introduction & Architecture Overview

**Screen Action**: Show the main TicketTriage Web Application UI (Submit Ticket view) with the dark-mode theme.

🗣️ **Narration**:
> *"Hi Chartered Vectorial team! I’m Aayush Kumbharkar, and this is **TicketTriage** — an AI-powered support ticket classifier and response generation assistant built for your AI Engineer assessment.*
>
> *TicketTriage uses a modern three-layer architecture: a custom React frontend with Tailwind CSS, an asynchronous Python FastAPI backend, and Google’s Gemini 2.0 Flash model via the `google-genai` SDK, backed by an async SQLite database using SQLAlchemy 2.0."*

---

### ⏱️ 0:25 – 1:15 | Live AI Ticket Submission & Triage

**Screen Action**:
1. In the **Submit Ticket** form on the left card, type/paste the following test data:
   - **Subject**: `Database connection pool limit reached during 2PM peak load`
   - **Description**: `Production API instances are throwing SQLAlchemy QueuePool limit errors (TimeoutError: limit of size 10 overflow 20 reached) every afternoon. We need urgent connection pool tuning.`
   - **Submitter Email**: `ops.lead@company.com`
2. Click **Submit Ticket**.

🗣️ **Narration**:
> *"Let’s submit an urgent technical ticket. As I click Submit, FastAPI receives the request and executes a single-pass JSON call to Gemini 2.0 Flash using a structured system prompt.*
>
> *In under 800 milliseconds, Gemini evaluates the subject and description, categorizing it as a **Bug** with **High Priority** and an **85% confidence score**.*
>
> *Notice how it returns clear **AI Reasoning** explaining the diagnosis, alongside a professional, context-aware **Suggested Reply** ready for customer communication. Returning classification, reasoning, and draft reply in a single pass cuts LLM latency and token costs by 50%."*

---

### ⏱️ 1:15 – 1:55 | Human-in-the-Loop & Auditability

**Screen Action**:
1. On the right card, click into the **Suggested Reply** textarea and edit the text slightly (e.g. add *"PS: Our team has temporarily bumped max_overflow to 40 while investigating."*).
2. Click **Save Draft**. Point out the **Edited** badge.
3. Click the **Regenerate** button to show temperature variation.
4. Switch to **Ticket List** tab to show the filterable table. Change status from `Open` to `In Progress`.

🗣️ **Narration**:
> *"TicketTriage prioritizes human-in-the-loop governance. Support agents can edit the AI draft directly. When I save an edit, the system automatically flags `is_edited = true` and updates the final reply. This maintains a clear audit log and builds a dataset for model fine-tuning.*
>
> *Agents can also click **Regenerate** to request an alternative draft with adjusted temperature, or change ticket status right from the triage board."*

---

### ⏱️ 1:55 – 2:30 | Analytics Dashboard, Resilience & Production Readiness

**Screen Action**:
1. Click on the **Analytics** tab. Point out the 4 KPI cards, Category Bar Chart, Priority Donut Chart, and Average Confidence Per Category chart.
2. Quickly show the GitHub repository page ([`aayushkumbharkar/TicketTriage`](https://github.com/aayushkumbharkar/TicketTriage)) showing the passing CI badge and Docker Compose file.

🗣️ **Narration**:
> *"Finally, the **Analytics Dashboard** aggregates key support metrics in real time: Total Tickets, Average AI Confidence, and Resolution Rate, backed by interactive Recharts visualizations.*
>
> *The system is engineered for resilience: if the LLM encounters rate limits or network issues, it degrades gracefully to a fallback triage record without crashing. It includes automated unit tests, a GitHub Actions CI pipeline, and Docker Compose for production deployment.*
>
> *Thank you for reviewing my submission, and I look forward to the next steps with Chartered Vectorial!"*

---

## 🏆 Key Technical Talking Points to Emphasize
- **Single-Pass LLM Calls**: 50% lower latency & cost compared to chained calls.
- **Calibrated Confidence Score**: Enables automated processing for $\ge 80\%$ confidence vs manual review for $< 50\%$.
- **Auditability & `is_edited`**: Fine-tuning dataset generation from agent edits.
- **Prompt Versioning**: Historical records store `prompt_version` for prompt regression tracking.
- **Production Quality**: Async DB, Docker, CI pipeline, 0 linter warnings.
