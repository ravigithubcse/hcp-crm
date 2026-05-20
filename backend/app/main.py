from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.database import engine, Base
from app.api import interactions, hcps, chat
from app.models import models
import logging
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="HCP CRM API",
    description="AI-First CRM for Healthcare Professional Interaction Management",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(hcps.router, prefix="/api/v1")
app.include_router(interactions.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")


@app.get("/")
def root():
    return {
        "message": "HCP CRM API - AI-First CRM for Life Sciences",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
def health():
    return {"status": "healthy", "service": "hcp-crm-api"}


@app.on_event("startup")
async def startup_event():
    logger.info("HCP CRM API started successfully")
    # Seed sample HCPs if DB is empty
    try:
        from app.db.database import SessionLocal
        from app.models.models import HCP
        db = SessionLocal()
        count = db.query(HCP).count()
        if count == 0:
            sample_hcps = [
                HCP(name="Dr. Priya Sharma", specialty="Cardiology", hospital="Apollo Hospitals", email="priya.sharma@apollo.com", territory="Bangalore North"),
                HCP(name="Dr. Rajesh Gupta", specialty="Oncology", hospital="Manipal Hospital", email="rajesh.gupta@manipal.com", territory="Bangalore South"),
                HCP(name="Dr. Anita Desai", specialty="Neurology", hospital="Narayana Health", email="anita.desai@narayana.com", territory="Bangalore East"),
                HCP(name="Dr. Suresh Patel", specialty="Diabetology", hospital="Fortis Hospital", email="suresh.patel@fortis.com", territory="Bangalore West"),
                HCP(name="Dr. Meera Krishnan", specialty="Pulmonology", hospital="BGS Hospital", email="meera.k@bgs.com", territory="Mysore"),
                HCP(name="Dr. Vikram Nair", specialty="Rheumatology", hospital="Aster CMI", email="vikram.nair@aster.com", territory="Bangalore Central"),
            ]
            db.add_all(sample_hcps)
            db.commit()
            logger.info(f"Seeded {len(sample_hcps)} sample HCPs")
        db.close()
    except Exception as e:
        logger.warning(f"Could not seed HCPs: {e}")
