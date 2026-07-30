#!/usr/bin/env bash
# deploy.sh — Automated build and deployment script for TicketTriage
set -euo pipefail

echo "=========================================================="
echo "🚀 TicketTriage Production Deployment Script"
echo "=========================================================="

echo "[1/3] Installing frontend dependencies and building production bundle..."
cd frontend
npm ci
npm run build
cd ..

echo "[2/3] Verifying backend dependencies..."
python -m pip install -r backend/requirements.txt

echo "[3/3] Running backend automated test suite..."
python -m unittest backend.test_main

echo "=========================================================="
echo "✅ Build & Verification Complete! Ready to launch with Docker Compose."
echo "   Run: docker-compose up --build -d"
echo "=========================================================="
