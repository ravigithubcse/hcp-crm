"""
Agent API endpoints - Chat interface and direct tool invocation
"""
import json
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from langchain_core.messages import HumanMessage
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.schemas.schemas import ChatMessage, ChatResponse, AgentToolRequest, AgentToolResponse
from app.agents.hcp_agent import (
    get_agent, get_interaction_store, get_hcp_store, get_followup_store,
    log_interaction, edit_interaction, get_hcp_profile, schedule_followup, generate_precall_brief
)
from app.models.database import get_db, Interaction
from app.config import settings
from datetime import datetime

router = APIRouter(prefix="/agent", tags=["agent"])

# ─── Chat endpoint ────────────────────────────────────────────────────────────
@router.post("/chat", response_model=ChatResponse)
async def chat_with_agent(msg: ChatMessage, db: Session = Depends(get_db)):
    """Process a natural language message through the LangGraph agent."""
    try:
        agent = get_agent(settings.GROQ_API_KEY)
        
        if agent is None:
            # Fallback mode - parse message manually
            return await _fallback_chat(msg, db)
        
        state = {
            "messages": [HumanMessage(content=msg.message)],
            "interaction_data": {},
            "session_id": msg.session_id,
            "current_tool": None,
            "result": None,
            "db_session": None
        }
        
        result = agent.invoke(state)
        
        last_message = result["messages"][-1]
        response_text = last_message.content if hasattr(last_message, 'content') else str(last_message)
        
        # Extract any structured data from tool calls
        extracted_data = None
        action = None
        interaction_id = None
        
        for msg_item in result["messages"]:
            if hasattr(msg_item, 'tool_calls') and msg_item.tool_calls:
                for tc in msg_item.tool_calls:
                    action = tc.get("name", "")
                    break
            if hasattr(msg_item, 'content') and isinstance(msg_item.content, str):
                try:
                    parsed = json.loads(msg_item.content)
                    if isinstance(parsed, dict) and parsed.get("success"):
                        extracted_data = parsed.get("data")
                        interaction_id = parsed.get("interaction_id")
                except:
                    pass
        
        # If interaction was logged, also save to DB
        if action == "log_interaction" and extracted_data:
            try:
                db_interaction = Interaction(
                    hcp_id=extracted_data.get("hcp_id") or 1,
                    hcp_name=extracted_data.get("hcp_name", "Unknown"),
                    interaction_type=extracted_data.get("interaction_type", "Meeting"),
                    date=extracted_data.get("date", ""),
                    time=extracted_data.get("time", ""),
                    topics_discussed=extracted_data.get("topics_discussed", ""),
                    sentiment=extracted_data.get("sentiment", "Neutral"),
                    outcomes=extracted_data.get("outcomes", ""),
                    follow_up_actions=extracted_data.get("follow_up_actions", ""),
                    ai_summary=extracted_data.get("ai_summary", "")
                )
                db.add(db_interaction)
                db.commit()
                interaction_id = db_interaction.id
            except Exception as e:
                print(f"DB save error: {e}")
        
        return ChatResponse(
            response=response_text,
            extracted_data=extracted_data,
            action=action,
            interaction_id=interaction_id
        )
        
    except Exception as e:
        print(f"Agent error: {e}")
        return await _fallback_chat(msg, db)


async def _fallback_chat(msg: ChatMessage, db: Session) -> ChatResponse:
    """Fallback handler when LLM is unavailable - rule-based parsing."""
    text = msg.message.lower()
    
    if any(word in text for word in ["met", "visited", "called", "meeting with", "spoke with"]):
        # Extract HCP name
        hcp_store = get_hcp_store()
        hcp_name = "Unknown HCP"
        for hid, hcp in hcp_store.items():
            fname = hcp["name"].split()[-1].lower()
            if fname in text or hcp["name"].lower() in text:
                hcp_name = hcp["name"]
                break
        
        # Determine sentiment
        sentiment = "Neutral"
        if any(w in text for w in ["positive", "interested", "excited", "great", "good"]):
            sentiment = "Positive"
        elif any(w in text for w in ["negative", "resistant", "not interested", "refused"]):
            sentiment = "Negative"
        
        # Save to DB
        now = datetime.now()
        db_interaction = Interaction(
            hcp_id=1,
            hcp_name=hcp_name,
            interaction_type="Meeting",
            date=now.strftime("%Y-%m-%d"),
            time=now.strftime("%H:%M"),
            topics_discussed=msg.message,
            sentiment=sentiment,
            outcomes="Extracted from chat",
            follow_up_actions="Schedule follow-up",
            ai_summary=f"AI-parsed interaction with {hcp_name}. Message: {msg.message[:200]}"
        )
        db.add(db_interaction)
        db.commit()
        
        return ChatResponse(
            response=f"✅ I've logged your interaction with **{hcp_name}**.\n\n**Summary:** {msg.message[:150]}...\n\n**Sentiment:** {sentiment}\n\nInteraction saved to the system. Would you like to add any follow-up actions?",
            extracted_data={"hcp_name": hcp_name, "sentiment": sentiment},
            action="log_interaction",
            interaction_id=db_interaction.id
        )
    
    elif any(word in text for word in ["profile", "history", "show", "who is", "tell me about"]):
        hcp_store = get_hcp_store()
        for hid, hcp in hcp_store.items():
            if hcp["name"].split()[-1].lower() in text:
                return ChatResponse(
                    response=f"**{hcp['name']}** — {hcp['specialty']}\n🏥 {hcp['hospital']}\n📍 {hcp['territory']}\n\nNo previous interactions recorded.",
                    extracted_data=hcp,
                    action="get_hcp_profile"
                )
        return ChatResponse(response="Please specify an HCP name to retrieve their profile.")
    
    else:
        return ChatResponse(
            response="I can help you:\n• **Log interactions** — Tell me about your meeting (e.g., 'Met Dr. Sharma, discussed OncaBoost efficacy')\n• **Edit interactions** — 'Update interaction 1 outcomes'\n• **View HCP profile** — 'Show Dr. Menon's profile'\n• **Schedule follow-up** — 'Schedule follow-up with Dr. Sharma next week'\n• **Pre-call brief** — 'Generate brief for Dr. Sharma'\n\nWhat would you like to do?",
            action="help"
        )


# ─── Direct tool invocation endpoint ─────────────────────────────────────────
@router.post("/tool", response_model=AgentToolResponse)
async def invoke_tool(req: AgentToolRequest, db: Session = Depends(get_db)):
    """Directly invoke a specific LangGraph tool by name."""
    tools_map = {
        "log_interaction": log_interaction,
        "edit_interaction": edit_interaction,
        "get_hcp_profile": get_hcp_profile,
        "schedule_followup": schedule_followup,
        "generate_precall_brief": generate_precall_brief
    }
    
    if req.tool_name not in tools_map:
        raise HTTPException(status_code=400, detail=f"Unknown tool: {req.tool_name}. Available: {list(tools_map.keys())}")
    
    try:
        tool_fn = tools_map[req.tool_name]
        result = tool_fn.invoke(req.parameters)
        parsed = json.loads(result) if isinstance(result, str) else result
        
        # If logging interaction, also save to DB
        if req.tool_name == "log_interaction" and parsed.get("success"):
            data = parsed.get("data", {})
            try:
                db_interaction = Interaction(
                    hcp_id=data.get("hcp_id") or 1,
                    hcp_name=data.get("hcp_name", "Unknown"),
                    interaction_type=data.get("interaction_type", "Meeting"),
                    date=data.get("date", ""),
                    time=data.get("time", ""),
                    attendees=data.get("attendees", ""),
                    topics_discussed=data.get("topics_discussed", ""),
                    materials_shared=data.get("materials_shared", ""),
                    samples_distributed=data.get("samples_distributed", ""),
                    sentiment=data.get("sentiment", "Neutral"),
                    outcomes=data.get("outcomes", ""),
                    follow_up_actions=data.get("follow_up_actions", ""),
                    ai_summary=data.get("ai_summary", "")
                )
                db.add(db_interaction)
                db.commit()
                parsed["db_id"] = db_interaction.id
            except Exception as e:
                print(f"DB error: {e}")
        
        return AgentToolResponse(
            result=parsed.get("message", str(parsed)),
            data=parsed,
            success=parsed.get("success", True)
        )
    except Exception as e:
        return AgentToolResponse(result=f"Tool error: {str(e)}", success=False)


# ─── Agent status endpoint ────────────────────────────────────────────────────
@router.get("/status")
def agent_status():
    """Get agent status and available tools."""
    agent = get_agent(settings.GROQ_API_KEY)
    return {
        "agent_ready": agent is not None,
        "model": "gemma2-9b-it",
        "provider": "Groq",
        "tools": [
            {"name": "log_interaction", "description": "Log a new HCP interaction with full details and AI summarization"},
            {"name": "edit_interaction", "description": "Edit/update an existing logged interaction"},
            {"name": "get_hcp_profile", "description": "Get HCP profile and full interaction history with sentiment trends"},
            {"name": "schedule_followup", "description": "Schedule follow-up tasks and meetings for an HCP"},
            {"name": "generate_precall_brief", "description": "Generate AI-powered pre-call planning brief"}
        ],
        "interaction_count": len(get_interaction_store()),
        "hcp_count": len(get_hcp_store()),
        "followup_count": len(get_followup_store())
    }

@router.get("/interactions")
def get_agent_interactions():
    """Get all in-memory interactions from agent store."""
    store = get_interaction_store()
    return list(store.values())

@router.get("/followups")
def get_agent_followups():
    """Get all scheduled follow-ups."""
    store = get_followup_store()
    return list(store.values())
