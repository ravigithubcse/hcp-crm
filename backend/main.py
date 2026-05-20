"""
HCP CRM Backend - FastAPI Application
AI-First CRM System for Pharmaceutical Field Representatives
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app.config import settings
from app.models.database import init_db, SessionLocal, HCP
from app.api import interactions, hcps, agent
from app.agents.hcp_agent import get_agent, get_hcp_store

app = FastAPI(
    title="HCP CRM API",
    description="AI-First CRM for Healthcare Professional Interaction Management",
    version="1.0.0"
)

# CORS
origins = settings.ALLOWED_ORIGINS.split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(interactions.router, prefix="/api/v1")
app.include_router(hcps.router, prefix="/api/v1")
app.include_router(agent.router, prefix="/api/v1")

@app.on_event("startup")
async def startup_event():
    """Initialize database and seed data on startup."""
    init_db()
    
    # Seed HCPs
    db = SessionLocal()
    try:
        count = db.query(HCP).count()
        if count == 0:
            hcp_store = get_hcp_store()
            for hid, hcp_data in hcp_store.items():
                db_hcp = HCP(
                    name=hcp_data["name"],
                    specialty=hcp_data["specialty"],
                    hospital=hcp_data["hospital"],
                    territory=hcp_data["territory"]
                )
                db.add(db_hcp)
            db.commit()
            print("✅ HCP seed data loaded")
    except Exception as e:
        print(f"Seed error: {e}")
        db.rollback()
    finally:
        db.close()
    
    # Initialize LangGraph agent
    try:
        agent_instance = get_agent(settings.GROQ_API_KEY)
        if agent_instance:
            print(f"✅ LangGraph agent initialized with gemma2-9b-it")
        else:
            print("⚠️  Agent running in fallback mode (check GROQ_API_KEY)")
    except Exception as e:
        print(f"⚠️  Agent init error: {e}")

@app.get("/")
def root():
    return {
        "message": "HCP CRM API is running",
        "docs": "/docs",
        "version": "1.0.0",
        "ai_model": "gemma2-9b-it (Groq)"
    }

@app.get("/health")
def health():
    return {"status": "healthy", "service": "hcp-crm-api"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
