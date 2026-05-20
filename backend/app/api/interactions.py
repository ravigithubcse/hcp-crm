from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.models.database import get_db, Interaction, HCP
from app.schemas.schemas import InteractionCreate, InteractionUpdate, InteractionResponse
from app.agents.hcp_agent import get_interaction_store, log_interaction, edit_interaction

router = APIRouter(prefix="/interactions", tags=["interactions"])

@router.post("/", response_model=dict)
def create_interaction(interaction: InteractionCreate, db: Session = Depends(get_db)):
    """Create a new interaction via structured form."""
    try:
        db_interaction = Interaction(
            hcp_id=interaction.hcp_id or 1,
            hcp_name=interaction.hcp_name or "Unknown HCP",
            interaction_type=interaction.interaction_type or "Meeting",
            date=interaction.date or datetime.now().strftime("%Y-%m-%d"),
            time=interaction.time or datetime.now().strftime("%H:%M"),
            attendees=interaction.attendees or "",
            topics_discussed=interaction.topics_discussed or "",
            materials_shared=interaction.materials_shared or "",
            samples_distributed=interaction.samples_distributed or "",
            sentiment=interaction.sentiment or "Neutral",
            outcomes=interaction.outcomes or "",
            follow_up_actions=interaction.follow_up_actions or "",
            ai_summary=interaction.ai_summary or f"Interaction with {interaction.hcp_name} on {interaction.date}"
        )
        db.add(db_interaction)
        db.commit()
        db.refresh(db_interaction)
        
        return {
            "success": True,
            "id": db_interaction.id,
            "message": f"Interaction logged successfully",
            "data": {
                "id": db_interaction.id,
                "hcp_name": db_interaction.hcp_name,
                "interaction_type": db_interaction.interaction_type,
                "date": db_interaction.date,
                "time": db_interaction.time,
                "topics_discussed": db_interaction.topics_discussed,
                "sentiment": db_interaction.sentiment,
                "outcomes": db_interaction.outcomes,
                "follow_up_actions": db_interaction.follow_up_actions,
                "ai_summary": db_interaction.ai_summary,
                "created_at": db_interaction.created_at.isoformat()
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[dict])
def list_interactions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """List all interactions."""
    interactions = db.query(Interaction).offset(skip).limit(limit).all()
    result = []
    for i in interactions:
        result.append({
            "id": i.id,
            "hcp_name": i.hcp_name,
            "interaction_type": i.interaction_type,
            "date": i.date,
            "time": i.time,
            "topics_discussed": i.topics_discussed,
            "sentiment": i.sentiment,
            "outcomes": i.outcomes,
            "follow_up_actions": i.follow_up_actions,
            "ai_summary": i.ai_summary,
            "materials_shared": i.materials_shared,
            "samples_distributed": i.samples_distributed,
            "attendees": i.attendees,
            "created_at": i.created_at.isoformat() if i.created_at else None,
            "updated_at": i.updated_at.isoformat() if i.updated_at else None
        })
    return result

@router.get("/{interaction_id}", response_model=dict)
def get_interaction(interaction_id: int, db: Session = Depends(get_db)):
    """Get a specific interaction by ID."""
    i = db.query(Interaction).filter(Interaction.id == interaction_id).first()
    if not i:
        raise HTTPException(status_code=404, detail="Interaction not found")
    return {
        "id": i.id,
        "hcp_name": i.hcp_name,
        "interaction_type": i.interaction_type,
        "date": i.date,
        "time": i.time,
        "topics_discussed": i.topics_discussed,
        "sentiment": i.sentiment,
        "outcomes": i.outcomes,
        "follow_up_actions": i.follow_up_actions,
        "ai_summary": i.ai_summary,
        "materials_shared": i.materials_shared,
        "samples_distributed": i.samples_distributed,
        "attendees": i.attendees,
        "created_at": i.created_at.isoformat() if i.created_at else None
    }

@router.put("/{interaction_id}", response_model=dict)
def update_interaction(interaction_id: int, update: InteractionUpdate, db: Session = Depends(get_db)):
    """Update an existing interaction."""
    db_interaction = db.query(Interaction).filter(Interaction.id == interaction_id).first()
    if not db_interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")
    
    update_data = update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_interaction, field, value)
    db_interaction.updated_at = datetime.now()
    
    db.commit()
    db.refresh(db_interaction)
    return {"success": True, "message": f"Interaction {interaction_id} updated", "id": db_interaction.id}

@router.delete("/{interaction_id}", response_model=dict)
def delete_interaction(interaction_id: int, db: Session = Depends(get_db)):
    """Delete an interaction."""
    db_interaction = db.query(Interaction).filter(Interaction.id == interaction_id).first()
    if not db_interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")
    db.delete(db_interaction)
    db.commit()
    return {"success": True, "message": f"Interaction {interaction_id} deleted"}
