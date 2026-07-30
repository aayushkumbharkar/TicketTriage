"""
test_e2e_simulation.py — Full end-to-end interactive user flow simulation script against the live running server.
"""

import urllib.request
import json

BASE_URL = "http://127.0.0.1:8000"

def run_e2e_simulation():
    print("============================================================")
    print("[+] TICKET TRIAGE END-TO-END LIVE SIMULATION TEST")
    print("============================================================")

    # 1. Health Check
    health_req = urllib.request.urlopen(f"{BASE_URL}/health")
    health_data = json.loads(health_req.read().decode())
    print(f"\n1. API Health Check: Status Code {health_req.getcode()} | Data: {health_data}")

    # 2. Submit New Ticket
    new_ticket_payload = {
        "subject": "Database connection pool exhausted during 2PM peak load",
        "description": "Production API instances are throwing SQLALchemy pool size limit errors (TimeoutError: QueuePool limit of size 10 overflow 20 reached) every afternoon. Needs urgent pool size tuning.",
        "submitter_email": "devops.lead@company.com"
    }
    
    req = urllib.request.Request(
        f"{BASE_URL}/tickets",
        data=json.dumps(new_ticket_payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    
    res = urllib.request.urlopen(req)
    created_ticket = json.loads(res.read().decode())
    ticket_id = created_ticket["id"]
    
    print(f"\n2. Ticket Submitted Successfully!")
    print(f"   - Ticket ID       : {created_ticket['id']}")
    print(f"   - Subject         : {created_ticket['subject']}")
    print(f"   - AI Category     : {created_ticket['category']}")
    print(f"   - AI Priority     : {created_ticket['priority']}")
    print(f"   - AI Confidence   : {created_ticket['confidence']}")
    print(f"   - Suggested Reply : {created_ticket['suggested_reply']}")
    print(f"   - Reasoning       : {created_ticket['reasoning']}")

    # 3. Update Ticket Reply and Status
    update_payload = {
        "status": "In Progress",
        "final_reply": "Hi DevOps Team, We have increased max_overflow to 40 in production database config and scheduled pool tuning for tonight.",
        "is_edited": True
    }
    patch_req = urllib.request.Request(
        f"{BASE_URL}/tickets/{ticket_id}",
        data=json.dumps(update_payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='PATCH'
    )
    patch_res = urllib.request.urlopen(patch_req)
    updated_ticket = json.loads(patch_res.read().decode())
    
    print(f"\n3. Ticket Reply & Status Updated!")
    print(f"   - New Status  : {updated_ticket['status']}")
    print(f"   - Final Reply : {updated_ticket['final_reply']}")
    print(f"   - Is Edited   : {updated_ticket['is_edited']}")

    # 4. Fetch Live Analytics Dashboard Data
    analytics_res = urllib.request.urlopen(f"{BASE_URL}/analytics")
    analytics = json.loads(analytics_res.read().decode())
    
    print(f"\n4. Live Analytics Dashboard Metrics:")
    print(f"   - Total Tickets           : {analytics['total_tickets']}")
    print(f"   - Average AI Confidence   : {analytics['avg_confidence']}")
    print(f"   - Resolution Rate         : {analytics['pct_resolved']}%")
    print(f"   - Breakdown by Category   : {analytics['tickets_by_category']}")
    print(f"   - Breakdown by Priority   : {analytics['tickets_by_priority']}")
    
    print("\n============================================================")
    print("[OK] END-TO-END SIMULATION PASSED CLEANLY!")
    print("============================================================")

if __name__ == "__main__":
    run_e2e_simulation()
