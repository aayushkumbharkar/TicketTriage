import asyncio, datetime, uuid
from backend.database import get_db, init_db
from backend.models import Ticket
from sqlalchemy import delete

all_tickets_data = [
    {
        "subject": "Unable to reset password via email link",
        "description": "I requested a password reset link 3 times, but no email arrived in inbox or spam folder. Please send a manual reset link.",
        "submitter_email": "user.test@example.com",
        "category": "General",
        "priority": "Medium",
        "confidence": 0.90,
        "status": "In Progress",
        "reasoning": "User is unable to receive password reset emails, preventing access to account.",
        "suggested_reply": "Hi! We have received your request and sent a manual password reset link to your email.",
        "final_reply": "Hi! We have sent a manual password reset email to your inbox. Please check your inbox now.",
        "is_edited": True
    },
    {
        "subject": "Payment failed but card was still charged",
        "description": "I tried to upgrade my subscription to Pro plan but payment showed an error. However I see a $49 charge on my bank statement.",
        "submitter_email": "billing.user@company.com",
        "category": "Billing",
        "priority": "High",
        "confidence": 0.95,
        "status": "Open",
        "reasoning": "Payment transaction failed on UI but credit card was charged $49.",
        "suggested_reply": "Hello, thank you for reaching out. We apologize for the payment processing error. Our billing team is reviewing the transaction to issue a refund or activate your Pro subscription.",
        "final_reply": None,
        "is_edited": False
    },
    {
        "subject": "Cannot export invoice to PDF from billing dashboard",
        "description": "When I try to export my invoice from the billing section, I click Export PDF and nothing happens. No download starts. This worked fine last week.",
        "submitter_email": "finance@clientcorp.com",
        "category": "Bug",
        "priority": "Medium",
        "confidence": 0.88,
        "status": "Open",
        "reasoning": "Exporting invoice PDFs from billing dashboard fails silently without starting a file download.",
        "suggested_reply": "Hello, thank you for bringing this to our attention. Our frontend engineering team is investigating the PDF download handler.",
        "final_reply": None,
        "is_edited": False
    },
    {
        "subject": "Charged twice for monthly pro subscription on credit card",
        "description": "I see two identical charges of $49 on my credit card statement for this month. I only have one active workspace on the Pro plan. Please investigate the duplicate transaction and process a refund to my payment method.",
        "submitter_email": "billing.user@company.com",
        "category": "Billing",
        "priority": "High",
        "confidence": 0.98,
        "status": "Open",
        "reasoning": "The ticket reports duplicate billing charges on a subscription account, aligning with a high-priority billing overcharge.",
        "suggested_reply": "Hello, thank you for bringing this duplicate charge to our attention. I apologize for the concern caused. I have forwarded your request to our billing team to issue a prompt refund for the $49 duplicate charge.",
        "final_reply": "Hello, thank you for bringing this duplicate charge to our attention. I apologize for the concern caused. I have forwarded your request to our billing team to issue a prompt refund for the $49 duplicate charge.",
        "is_edited": False
    },
    {
        "subject": "Database connection pool limit reached during 2PM peak load",
        "description": "Production API instances are throwing SQLAlchemy QueuePool limit errors (TimeoutError: limit of size 10 overflow 20 reached) every afternoon. We need urgent connection pool tuning.",
        "submitter_email": "ops.lead@company.com",
        "category": "Bug",
        "priority": "High",
        "confidence": 0.95,
        "status": "In Progress",
        "reasoning": "High priority infrastructure bug affecting production API availability during peak traffic hours.",
        "suggested_reply": "Hi DevOps Team, Thank you for reporting this API database pool bottleneck. Our engineering team is investigating max_overflow pool settings.",
        "final_reply": "Hi DevOps Team, We have increased max_overflow to 40 in production database config and scheduled pool tuning for tonight.",
        "is_edited": True
    },
    {
        "subject": "Requesting OAuth2 SAML SSO support for Okta enterprise login",
        "description": "Our security compliance team requires SAML 2.0 single sign-on integration with Okta for employee onboarding. Can you share if enterprise SSO is on your Q3 product roadmap?",
        "submitter_email": "security@enterprise-corp.com",
        "category": "Feature Request",
        "priority": "Low",
        "confidence": 0.92,
        "status": "Open",
        "reasoning": "Enterprise single sign-on requirement for security compliance, classified as a low-priority feature request.",
        "suggested_reply": "Hello, thank you for your feedback! SAML 2.0 Okta SSO is currently on our product roadmap planned for late Q3.",
        "final_reply": "Hello, thank you for your feedback! SAML 2.0 Okta SSO is currently on our product roadmap planned for late Q3.",
        "is_edited": False
    },
    {
        "subject": "HTTP 500 Internal Server Error on user authentication endpoint",
        "description": "Users are unable to log into the web dashboard. The /api/v1/auth/login endpoint is failing with HTTP 500 status and JWT signing key decryption errors across all US East instances.",
        "submitter_email": "security.admin@enterprise.com",
        "category": "Bug",
        "priority": "High",
        "confidence": 0.95,
        "status": "In Progress",
        "reasoning": "The ticket reports an active authentication service outage with HTTP 500 errors preventing user logins, which is a high-priority system bug.",
        "suggested_reply": "Hello Security Team, Thank you for reaching out immediately regarding the HTTP 500 authentication failures on the US East cluster.",
        "final_reply": "Hello Security Team, Our senior engineering team has identified a JWT key rotation synchronization issue on the US East auth cluster. A hotfix is being deployed now.",
        "is_edited": True
    }
]

async def seed_all():
    print("Initializing Neon database tables...")
    await init_db()
    
    async for db in get_db():
        await db.execute(delete(Ticket))
        await db.commit()
        
        now = datetime.datetime.now(datetime.timezone.utc)
        orm_tickets = []
        for i, d in enumerate(all_tickets_data):
            t = Ticket(
                id=str(uuid.uuid4()),
                subject=d["subject"],
                description=d["description"],
                submitter_email=d["submitter_email"],
                category=d["category"],
                priority=d["priority"],
                confidence=d["confidence"],
                status=d["status"],
                prompt_version="v1.0",
                reasoning=d["reasoning"],
                suggested_reply=d["suggested_reply"],
                final_reply=d["final_reply"],
                is_edited=d["is_edited"],
                created_at=now - datetime.timedelta(minutes=(len(all_tickets_data) - i) * 5),
                updated_at=now - datetime.timedelta(minutes=(len(all_tickets_data) - i) * 5)
            )
            orm_tickets.append(t)
        
        db.add_all(orm_tickets)
        await db.commit()
        print(f"Successfully inserted ALL {len(orm_tickets)} tickets into Neon PostgreSQL database!")

asyncio.run(seed_all())
