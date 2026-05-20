from fastapi import APIRouter, HTTPException
from app.schemas.schemas import ChatRequest, ChatResponse
from app.agents.hcp_agent import run_agent
import logging

router = APIRouter(prefix="/chat", tags=["chat"])
logger = logging.getLogger(__name__)


@router.post("/", response_model=ChatResponse)
async def chat_with_agent(request: ChatRequest):
    """
    Chat endpoint that interfaces with the LangGraph AI agent.
    Supports natural language interaction logging, editing, and queries.
    """
    try:
        result = await run_agent(
            message=request.message,
            conversation_history=request.conversation_history or [],
            session_id=request.session_id
        )
        return ChatResponse(
            response=result["response"],
            tool_calls=result.get("tool_calls", []),
            extracted_data=result.get("extracted_data"),
            session_id=request.session_id
        )
    except Exception as e:
        logger.error(f"Chat error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")


@router.get("/tools")
def list_tools():
    """List all available LangGraph agent tools."""
    return {
        "tools": [
            {
                "name": "log_interaction",
                "description": "Log a new HCP interaction with full details including topics, sentiment, outcomes",
                "category": "Core"
            },
            {
                "name": "edit_interaction",
                "description": "Edit an existing logged interaction by ID, modify any field",
                "category": "Core"
            },
            {
                "name": "summarize_topics",
                "description": "AI-powered summarization of raw meeting notes, extracts entities and key points",
                "category": "AI"
            },
            {
                "name": "suggest_follow_ups",
                "description": "Generate personalized follow-up action recommendations based on interaction context",
                "category": "AI"
            },
            {
                "name": "analyze_hcp_sentiment",
                "description": "Analyze HCP sentiment, engagement level, and prescribing likelihood from text",
                "category": "AI"
            }
        ]
    }
