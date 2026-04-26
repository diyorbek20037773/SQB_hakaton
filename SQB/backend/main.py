from fastapi import FastAPI, WebSocket, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

from database import create_tables, get_db, AsyncSessionLocal
from routers import calls, customers, operators, analytics, supervisor, simulator
from ws_handlers.call_stream import call_stream_handler
from ws_handlers.simulator_stream import simulator_stream_handler

app = FastAPI(
    title="Yulduz AI - AI Sales & Telephony Assistant",
    description="Real-time AI copilot for SQB bank call center operators",
    version="1.0.0",
)

# CORS - allow all for hackathon
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all routers
app.include_router(calls.router, prefix="/api")
app.include_router(customers.router, prefix="/api")
app.include_router(operators.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(supervisor.router, prefix="/api")
app.include_router(simulator.router, prefix="/api")


@app.on_event("startup")
async def startup_event():
    await create_tables()
    # Seed DB if empty
    async with AsyncSessionLocal() as db:
        from models import Customer
        result = await db.execute(select(Customer).limit(1))
        existing = result.scalar_one_or_none()
        if not existing:
            print("[Startup] Database is empty — seeding data...")
            try:
                from seed_data import seed_all
                await seed_all(db)
                print("[Startup] Seeding complete.")
            except Exception as exc:
                print(f"[Startup] Seeding failed: {exc}")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "Yulduz AI Backend", "version": "1.0.0"}


@app.get("/api/products")
async def get_products():
    """Return all available bank products."""
    from services.nbo_engine import get_all_products
    return get_all_products()


@app.get("/api/compliance-rules")
async def get_compliance_rules():
    """Return compliance rules and KYC checklist."""
    from services.compliance import load_rules
    return load_rules()


@app.get("/api/demo-transcripts")
async def get_demo_transcripts():
    """Return demo transcripts for demo mode."""
    import json, os
    path = os.path.join(os.path.dirname(__file__), "data", "demo_transcripts.json")
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception as exc:
        return {"error": str(exc)}


@app.get("/api/personas")
async def get_personas():
    """Return simulator persona configurations."""
    from services.simulator_ai import get_all_personas
    return get_all_personas()


# ─── WebSocket Routes ───────────────────────────────────────────────────────


@app.websocket("/ws/call/{call_id}")
async def ws_call(websocket: WebSocket, call_id: int):
    async with AsyncSessionLocal() as db:
        await call_stream_handler(websocket, call_id, db)


@app.websocket("/ws/simulator/{session_id}")
async def ws_simulator(websocket: WebSocket, session_id: int):
    async with AsyncSessionLocal() as db:
        await simulator_stream_handler(websocket, session_id, db)
