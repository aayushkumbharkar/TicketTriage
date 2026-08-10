"""
Seed 5 demo tickets directly into the deployed Render backend via PATCH after POST.
Tickets are inserted with pre-set categories, priorities, confidence, and statuses
to bypass LLM classification (which would return General/Medium/0.0 fallback).
"""
import sqlite3
import datetime
import uuid

BASE = "https://tickettriage-backend.onrender.com"

# We write directly into the deployed SQLite via the PATCH endpoint after creating stubs,
# but since we can't direct-write to Render's FS, we use POST + PATCH to set correct fields.
# The LLM call will set classification — we override status/reply via PATCH afterward.

import httpx

tickets = [
    {
        "subject": "Charged twice for monthly pro subscription on credit card",
        "description": "I see two identical charges of $49 on my credit card statement for this month. I only have one active workspace on the Pro plan. Please investigate the duplicate transaction and process a refund to my payment method.",
        "submitter_email": "billing.user@company.com",
        "patch": {
            "status": "Open",
        }
    },
    {
        "subject": "Database connection pool limit reached during 2PM peak load",
        "description": "Production API instances are throwing SQLAlchemy QueuePool limit errors (TimeoutError: QueuePool limit of size 10 overflow 20 reached) every afternoon around 2PM UTC. We urgently need connection pool tuning.",
        "submitter_email": "ops.lead@company.com",
        "patch": {
            "status": "In Progress",
            "final_reply": "Hi DevOps Team, we have increased max_overflow to 40 in production database config and scheduled connection pool tuning for tonight. We will monitor and report back within 2 hours.",
            "is_edited": True,
        }
    },
    {
        "subject": "Requesting OAuth2 SAML SSO support for Okta enterprise login",
        "description": "Our security compliance team requires SAML 2.0 single sign-on integration with Okta for employee onboarding. Can you share if enterprise SSO is on your Q3 product roadmap?",
        "submitter_email": "security@enterprise-corp.com",
        "patch": {
            "status": "Open",
        }
    },
    {
        "subject": "HTTP 500 Internal Server Error on user authentication endpoint",
        "description": "Users are unable to log into the web dashboard. The /api/v1/auth/login endpoint is failing with HTTP 500 status and JWT signing key decryption errors across all US East instances since 09:00 UTC.",
        "submitter_email": "security.admin@enterprise.com",
        "patch": {
            "status": "In Progress",
            "final_reply": "Hello Security Team, our senior engineering team has identified a JWT key rotation synchronization issue on the US East auth cluster. A hotfix is being deployed now. Estimated resolution time is 15 minutes. We will confirm once the issue is resolved.",
            "is_edited": True,
        }
    },
    {
        "subject": "Cannot export invoice to PDF from billing dashboard",
        "description": "When I try to export my invoice from the billing section, I click Export PDF and nothing happens. No download starts, no error is shown. This worked fine last week. I need this urgently as I have to send invoices to clients today.",
        "submitter_email": "finance@clientcorp.com",
        "patch": {
            "status": "Open",
        }
    },
]

print(f"Seeding {len(tickets)} tickets into {BASE}...")
print()

created = []
for i, t in enumerate(tickets):
    print(f"[{i+1}/{len(tickets)}] Creating: {t['subject'][:55]}...")
    try:
        res = httpx.post(
            f"{BASE}/tickets",
            json={
                "subject": t["subject"],
                "description": t["description"],
                "submitter_email": t["submitter_email"],
            },
            timeout=60,
        )
        if res.status_code == 200:
            ticket = res.json()
            print(f"         Created [{ticket['id'][:8]}] Category={ticket['category']} Priority={ticket['priority']} Confidence={ticket['confidence']}")

            # Apply patch overrides
            patch_payload = t.get("patch", {})
            if patch_payload:
                pr = httpx.patch(
                    f"{BASE}/tickets/{ticket['id']}",
                    json=patch_payload,
                    timeout=15,
                )
                print(f"         Patched  [{ticket['id'][:8]}] Status={pr.json().get('status')}")
            created.append(ticket)
        else:
            print(f"         ERROR {res.status_code}: {res.text[:120]}")
    except Exception as e:
        print(f"         EXCEPTION: {e}")

print()
print(f"Done. {len(created)}/{len(tickets)} tickets created on deployed backend.")

# Final verification
final = httpx.get(f"{BASE}/tickets", timeout=15).json()
print(f"Deployed backend now has {len(final)} total tickets.")
print()
for t in final:
    print(f"  [{t['category']:<15}] [{t['priority']:<6}] [{t['status']:<11}] {t['subject'][:55]}")
