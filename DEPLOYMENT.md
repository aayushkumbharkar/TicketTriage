# TicketTriage — Production Deployment Guide

This guide covers all deployment strategies for TicketTriage: Docker containerization, Render/Railway cloud hosting, and Vercel static hosting.

---

## Option 1: One-Command Docker Deployment (Recommended for VPS / Local Production)

The project includes a production-ready `docker-compose.yml` and `backend/Dockerfile` with persistent SQLite volume storage.

### Steps:
1. Ensure Docker Desktop or Docker Engine is installed.
2. Set your Google Gemini API Key in `backend/.env`:
   ```bash
   GEMINI_API_KEY="AQ.YourActualGeminiApiKeyHere"
   ```
3. Run Docker Compose:
   ```bash
   docker-compose up --build -d
   ```
4. Access your live services:
   - **Backend API**: `http://localhost:8000` (Docs: `http://localhost:8000/docs`)
   - **Frontend Application**: `http://localhost:5173`

---

## Option 2: Render.com Cloud Hosting (Free Tier)

Since the repository is pushed to GitHub at [https://github.com/aayushkumbharkar/TicketTriage](https://github.com/aayushkumbharkar/TicketTriage), you can deploy in 2 steps:

### 1. Backend Web Service (FastAPI)
1. Go to [Render Dashboard](https://dashboard.render.com/) $\rightarrow$ **New +** $\rightarrow$ **Web Service**.
2. Connect your GitHub repository `aayushkumbharkar/TicketTriage`.
3. Configure settings:
   - **Name**: `tickettriage-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add Environment Variable:
   - Key: `GEMINI_API_KEY`
   - Value: `<your_gemini_api_key>`
5. Click **Create Web Service**.

### 2. Frontend Static Site (React + Vite)
1. In Render Dashboard $\rightarrow$ **New +** $\rightarrow$ **Static Site**.
2. Connect `aayushkumbharkar/TicketTriage`.
3. Configure settings:
   - **Name**: `tickettriage-frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
4. Click **Create Static Site**.

---

## Option 3: Vercel (Frontend) + Railway (Backend)

### Frontend on Vercel:
1. Go to [Vercel Dashboard](https://vercel.com/new) $\rightarrow$ Import `aayushkumbharkar/TicketTriage`.
2. Set **Root Directory** to `frontend`.
3. Framework Preset: `Vite`.
4. Click **Deploy**.

---

## Health Check & Verification
Once deployed, verify API operation by making a GET request to the health endpoint:
```bash
curl https://<your-backend-url>/health
# Output: {"status":"ok","version":"1.0.0"}
```
