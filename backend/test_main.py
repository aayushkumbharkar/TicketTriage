"""
test_main.py — Automated unit & API integration test suite for TicketTriage FastAPI backend.

Features tested:
1. System Health Check (/health)
2. Ticket Creation with Mocked AI Triage Classification (/tickets POST)
3. Ticket Retrieval & Filtering (/tickets GET)
4. Single Ticket Lookup (/tickets/{id} GET) & 404 handling
5. Ticket Update / Reply Editing (/tickets/{id} PATCH)
6. Suggested Reply Regeneration (/tickets/{id}/regenerate POST)
7. Analytics & Metrics Aggregation (/analytics GET)
"""

import asyncio
import os
import unittest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient

# Set dummy key for CI environment before imports
os.environ.setdefault("GEMINI_API_KEY", "ci_dummy_key_12345")

from backend.database import init_db
from backend.main import app
from backend.schemas import LLMClassification

client = TestClient(app)

class TestTicketTriageAPI(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        """Ensure SQLite tables are initialized before running tests."""
        asyncio.run(init_db())

    def setUp(self):
        """Mock LLM classification and regeneration so tests are fast, deterministic, and API key independent."""
        # 1. Patch classify_ticket
        self.classify_patcher = patch("backend.main.classify_ticket", new_callable=AsyncMock)
        self.mock_classify = self.classify_patcher.start()
        self.mock_classify.return_value = LLMClassification(
            category="General",
            priority="Medium",
            confidence=0.90,
            reasoning="Mocked classification for automated CI testing.",
            suggested_reply="Thank you for reaching out. We have received your ticket and are investigating."
        )
        self.addCleanup(self.classify_patcher.stop)

        # 2. Patch regenerate_reply
        self.regen_patcher = patch("backend.main.regenerate_reply", new_callable=AsyncMock)
        self.mock_regen = self.regen_patcher.start()
        self.mock_regen.return_value = "This is a regenerated suggested reply for testing."
        self.addCleanup(self.regen_patcher.stop)

    def test_01_health_check(self):
        """Verify API health endpoint returns 200 OK and status ok."""
        response = client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data.get("status"), "ok")
        self.assertEqual(data.get("version"), "1.0.0")

    def test_02_create_ticket(self):
        """Verify submitting a support ticket creates a DB record with classification."""
        payload = {
            "subject": "Unable to reset password via email link",
            "description": "I requested a password reset link 3 times, but no email arrived in inbox or spam folder.",
            "submitter_email": "user.test@example.com"
        }
        response = client.post("/tickets", json=payload)
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertIn("id", data)
        self.assertEqual(data["subject"], payload["subject"])
        self.assertEqual(data["submitter_email"], payload["submitter_email"])
        self.assertEqual(data["category"], "General")
        self.assertEqual(data["priority"], "Medium")
        self.assertEqual(data["confidence"], 0.90)
        self.assertEqual(data["status"], "Open")

    def test_03_list_tickets(self):
        """Verify listing all tickets and applying query filters."""
        response = client.get("/tickets")
        self.assertEqual(response.status_code, 200)
        tickets = response.json()
        self.assertIsInstance(tickets, list)
        self.assertGreater(len(tickets), 0)

        # Test category filter
        filtered_res = client.get("/tickets?category=General")
        self.assertEqual(filtered_res.status_code, 200)
        self.assertIsInstance(filtered_res.json(), list)

    def test_04_get_single_ticket(self):
        """Verify fetching a specific ticket by ID and handling 404 for invalid IDs."""
        list_res = client.get("/tickets")
        tickets = list_res.json()
        self.assertGreater(len(tickets), 0)
        valid_id = tickets[0]["id"]

        response = client.get(f"/tickets/{valid_id}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["id"], valid_id)

        # Test invalid UUID
        invalid_res = client.get("/tickets/non-existent-uuid-12345")
        self.assertEqual(invalid_res.status_code, 404)

    def test_05_update_ticket(self):
        """Verify editing ticket reply, status, and is_edited flag."""
        list_res = client.get("/tickets")
        tickets = list_res.json()
        target_id = tickets[0]["id"]

        update_payload = {
            "status": "In Progress",
            "final_reply": "Hi! We have sent a manual password reset email to your inbox.",
            "is_edited": True
        }
        response = client.patch(f"/tickets/{target_id}", json=update_payload)
        self.assertEqual(response.status_code, 200)
        updated = response.json()
        self.assertEqual(updated["status"], "In Progress")
        self.assertEqual(updated["final_reply"], update_payload["final_reply"])
        self.assertTrue(updated["is_edited"])

    def test_06_regenerate_ticket_reply(self):
        """Verify regenerating a suggested reply for an existing ticket."""
        list_res = client.get("/tickets")
        tickets = list_res.json()
        target_id = tickets[0]["id"]

        response = client.post(f"/tickets/{target_id}/regenerate")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("suggested_reply", data)
        self.assertEqual(data["suggested_reply"], "This is a regenerated suggested reply for testing.")

    def test_07_analytics_dashboard(self):
        """Verify aggregate analytics metrics calculation."""
        response = client.get("/analytics")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("total_tickets", data)
        self.assertIn("avg_confidence", data)
        self.assertIn("pct_resolved", data)
        self.assertIn("tickets_by_category", data)
        self.assertIn("tickets_by_priority", data)
        self.assertIn("avg_confidence_by_category", data)
        self.assertGreater(data["total_tickets"], 0)

if __name__ == "__main__":
    unittest.main()
