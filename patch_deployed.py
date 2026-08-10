import httpx

BASE = "https://tickettriage-backend.onrender.com"

# Patch DB connection pool ticket to In Progress
r1 = httpx.patch(f"{BASE}/tickets/f126ae70-8e22-4c46-80fa-42b2387754de", json={
    "status": "In Progress",
    "final_reply": "Hi DevOps Team, we have increased max_overflow to 40 in production database config and scheduled connection pool tuning for tonight. We will monitor and report back within 2 hours.",
    "is_edited": True
}, timeout=15)
print("DB Pool patch:", r1.json()["status"])

# Patch HTTP 500 auth ticket to In Progress
r2 = httpx.patch(f"{BASE}/tickets/eae856d7-7f5f-48f5-ad0d-e083ed0f4102", json={
    "status": "In Progress",
    "final_reply": "Hello Security Team, our senior engineering team has identified a JWT key rotation synchronization issue on the US East auth cluster. A hotfix is being deployed now. Estimated resolution time is 15 minutes.",
    "is_edited": True
}, timeout=15)
print("Auth 500 patch:", r2.json()["status"])

# Final check
final = httpx.get(f"{BASE}/tickets", timeout=15).json()
print()
print(f"Total deployed tickets: {len(final)}")
for t in final:
    print(f"  [{t['category']:<15}] [{t['priority']:<6}] [{t['status']:<11}] {t['subject'][:55]}")
