from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.models.database import get_db, HCP
from app.schemas.schemas import HCPCreate, HCPResponse
from app.agents.hcp_agent import get_hcp_store

router = APIRouter(prefix="/hcps", tags=["hcps"])

@router.get("/", response_model=List[dict])
def list_hcps(db: Session = Depends(get_db)):
    """List all HCPs - combines DB and in-memory store."""
    hcps = db.query(HCP).all()
    result = []
    for h in hcps:
        result.append({
            "id": h.id, "name": h.name, "specialty": h.specialty,
            "hospital": h.hospital, "email": h.email,
            "phone": h.phone, "territory": h.territory
        })
    
    # Add in-memory HCPs (seeded data) if DB is empty
    if not result:
        store = get_hcp_store()
        for hid, hcp in store.items():
            result.append(hcp)
    return result

@router.post("/", response_model=dict)
def create_hcp(hcp: HCPCreate, db: Session = Depends(get_db)):
    """Create a new HCP."""
    db_hcp = HCP(**hcp.model_dump())
    db.add(db_hcp)
    db.commit()
    db.refresh(db_hcp)
    return {"id": db_hcp.id, "name": db_hcp.name, "specialty": db_hcp.specialty}

@router.get("/search", response_model=List[dict])
def search_hcps(q: str = "", db: Session = Depends(get_db)):
    """Search HCPs by name."""
    store = get_hcp_store()
    results = []
    if q:
        for hid, hcp in store.items():
            if q.lower() in hcp["name"].lower():
                results.append(hcp)
        # Also search DB
        db_results = db.query(HCP).filter(HCP.name.ilike(f"%{q}%")).all()
        for h in db_results:
            results.append({
                "id": h.id, "name": h.name, "specialty": h.specialty,
                "hospital": h.hospital
            })
    else:
        results = list(store.values())
    return results
