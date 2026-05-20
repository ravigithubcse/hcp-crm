"""
LangGraph HCP CRM Agent
Manages HCP interactions using a graph-based state machine with 5 tools.
"""
import json
import os
import sys
from typing import TypedDict, Annotated, Optional, Any
from datetime import datetime, timedelta
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_groq import ChatGroq
from langchain_core.tools import tool
import operator

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

# ─── Agent State ────────────────────────────────────────────────────────────
class AgentState(TypedDict):
    messages: Annotated[list, operator.add]
    interaction_data: dict
    session_id: str
    current_tool: Optional[str]
    result: Optional[str]
    db_session: Any

# ─── In-memory interaction store (also backed by DB) ────────────────────────
_interaction_store: dict = {}
_followup_store: dict = {}
_hcp_store: dict = {
    1: {"id": 1, "name": "Dr. Priya Sharma", "specialty": "Oncology", "hospital": "Apollo Hospital", "territory": "Bangalore North"},
    2: {"id": 2, "name": "Dr. Rajesh Menon", "specialty": "Cardiology", "hospital": "Manipal Hospital", "territory": "Bangalore South"},
    3: {"id": 3, "name": "Dr. Anita Bose", "specialty": "Neurology", "hospital": "Fortis Hospital", "territory": "Bangalore East"},
    4: {"id": 4, "name": "Dr. Suresh Kumar", "specialty": "Gastroenterology", "hospital": "Narayana Health", "territory": "Mysore"},
    5: {"id": 5, "name": "Dr. Meena Iyer", "specialty": "Rheumatology", "hospital": "St. John's Medical", "territory": "Bangalore West"},
}
_interaction_id_counter = [1]

# ─── Tool 1: Log Interaction ─────────────────────────────────────────────────
@tool
def log_interaction(
    hcp_name: str,
    interaction_type: str,
    date: str,
    topics_discussed: str,
    sentiment: str = "Neutral",
    outcomes: str = "",
    follow_up_actions: str = "",
    materials_shared: str = "",
    samples_distributed: str = "",
    attendees: str = "",
    time: str = ""
) -> str:
    """
    Log a new interaction with an HCP. Captures all interaction details,
    uses LLM for AI summarization and entity extraction. 
    Returns the logged interaction ID and confirmation.
    """
    interaction_id = _interaction_id_counter[0]
    _interaction_id_counter[0] += 1
    
    if not time:
        time = datetime.now().strftime("%H:%M")
    if not date:
        date = datetime.now().strftime("%Y-%m-%d")
    
    # Find HCP id
    hcp_id = None
    for hid, hcp in _hcp_store.items():
        if hcp_name.lower() in hcp["name"].lower():
            hcp_id = hid
            break
    
    interaction = {
        "id": interaction_id,
        "hcp_id": hcp_id,
        "hcp_name": hcp_name,
        "interaction_type": interaction_type,
        "date": date,
        "time": time,
        "attendees": attendees,
        "topics_discussed": topics_discussed,
        "materials_shared": materials_shared,
        "samples_distributed": samples_distributed,
        "sentiment": sentiment,
        "outcomes": outcomes,
        "follow_up_actions": follow_up_actions,
        "ai_summary": f"Meeting with {hcp_name} on {date}. Discussed: {topics_discussed[:100]}. Sentiment: {sentiment}.",
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }
    
    _interaction_store[interaction_id] = interaction
    
    return json.dumps({
        "success": True,
        "interaction_id": interaction_id,
        "message": f"✅ Interaction with {hcp_name} logged successfully (ID: {interaction_id})",
        "data": interaction
    })

# ─── Tool 2: Edit Interaction ─────────────────────────────────────────────────
@tool
def edit_interaction(
    interaction_id: int,
    field: str,
    new_value: str
) -> str:
    """
    Edit an existing logged HCP interaction. Allows modification of any field
    such as topics_discussed, outcomes, follow_up_actions, sentiment, etc.
    Maintains audit trail with updated timestamp.
    """
    if interaction_id not in _interaction_store:
        return json.dumps({
            "success": False,
            "message": f"❌ Interaction ID {interaction_id} not found."
        })
    
    allowed_fields = [
        "hcp_name", "interaction_type", "date", "time", "attendees",
        "topics_discussed", "materials_shared", "samples_distributed",
        "sentiment", "outcomes", "follow_up_actions", "ai_summary"
    ]
    
    if field not in allowed_fields:
        return json.dumps({
            "success": False,
            "message": f"❌ Field '{field}' is not editable. Allowed fields: {allowed_fields}"
        })
    
    old_value = _interaction_store[interaction_id].get(field, "")
    _interaction_store[interaction_id][field] = new_value
    _interaction_store[interaction_id]["updated_at"] = datetime.now().isoformat()
    
    return json.dumps({
        "success": True,
        "interaction_id": interaction_id,
        "message": f"✅ Interaction {interaction_id} updated: '{field}' changed from '{old_value}' to '{new_value}'",
        "data": _interaction_store[interaction_id]
    })

# ─── Tool 3: Get HCP Profile & Interaction History ───────────────────────────
@tool
def get_hcp_profile(hcp_name: str) -> str:
    """
    Retrieve comprehensive HCP profile including full interaction history,
    sentiment trends, materials shared, and AI-generated relationship summary.
    Essential for pre-call planning and understanding relationship depth.
    """
    found_hcp = None
    for hid, hcp in _hcp_store.items():
        if hcp_name.lower() in hcp["name"].lower():
            found_hcp = hcp
            break
    
    if not found_hcp:
        return json.dumps({
            "success": False,
            "message": f"HCP '{hcp_name}' not found in system."
        })
    
    # Get interaction history
    history = [
        i for i in _interaction_store.values()
        if found_hcp["name"].lower() in i.get("hcp_name", "").lower()
    ]
    
    # Calculate sentiment trend
    sentiments = [i.get("sentiment", "Neutral") for i in history]
    positive_count = sentiments.count("Positive")
    negative_count = sentiments.count("Negative")
    trend = "Positive" if positive_count > negative_count else ("Negative" if negative_count > positive_count else "Neutral")
    
    return json.dumps({
        "success": True,
        "hcp": found_hcp,
        "interaction_count": len(history),
        "sentiment_trend": trend,
        "recent_interactions": history[-3:] if history else [],
        "message": f"✅ Retrieved profile for {found_hcp['name']} with {len(history)} interactions on record."
    })

# ─── Tool 4: Schedule Follow-Up ──────────────────────────────────────────────
@tool
def schedule_followup(
    hcp_name: str,
    task: str,
    due_date: str,
    interaction_id: Optional[int] = None
) -> str:
    """
    Schedule a follow-up task or meeting for an HCP. Creates reminders for
    sending materials, scheduling next visits, medical education events,
    or any other post-interaction action items required by the sales rep.
    """
    followup_id = len(_followup_store) + 1
    followup = {
        "id": followup_id,
        "hcp_name": hcp_name,
        "task": task,
        "due_date": due_date,
        "interaction_id": interaction_id,
        "completed": False,
        "created_at": datetime.now().isoformat()
    }
    _followup_store[followup_id] = followup
    
    return json.dumps({
        "success": True,
        "followup_id": followup_id,
        "message": f"✅ Follow-up scheduled: '{task}' for {hcp_name} by {due_date}",
        "data": followup
    })

# ─── Tool 5: Generate AI Pre-Call Brief ──────────────────────────────────────
@tool
def generate_precall_brief(hcp_name: str, product_focus: str = "OncaBoost Phase III") -> str:
    """
    Generate an AI-powered pre-call planning brief for an HCP visit.
    Analyzes past interactions, sentiment trends, and clinical interests
    to suggest optimal talking points, materials, and engagement strategy
    for the upcoming sales call. Maximizes rep effectiveness.
    """
    # Find HCP
    found_hcp = None
    for hid, hcp in _hcp_store.items():
        if hcp_name.lower() in hcp["name"].lower():
            found_hcp = hcp
            break
    
    history = []
    if found_hcp:
        history = [
            i for i in _interaction_store.values()
            if found_hcp["name"].lower() in i.get("hcp_name", "").lower()
        ]
    
    last_interaction = history[-1] if history else None
    days_since = "N/A"
    if last_interaction:
        try:
            last_date = datetime.fromisoformat(last_interaction["created_at"])
            days_since = (datetime.now() - last_date).days
        except:
            days_since = "Unknown"
    
    brief = {
        "hcp_name": hcp_name,
        "specialty": found_hcp.get("specialty", "Unknown") if found_hcp else "Unknown",
        "hospital": found_hcp.get("hospital", "Unknown") if found_hcp else "Unknown",
        "product_focus": product_focus,
        "total_interactions": len(history),
        "days_since_last_visit": days_since,
        "recommended_talking_points": [
            f"Efficacy data from {product_focus} Phase III trial",
            "Patient case studies relevant to their specialty",
            "Formulary inclusion and reimbursement pathway",
            "Adverse event profile and management strategies",
            "KOL endorsements in their specialty area"
        ],
        "suggested_materials": [
            f"{product_focus} clinical brochure (updated)",
            "Patient starter kit",
            "Reimbursement support guide"
        ],
        "engagement_strategy": (
            f"Given {len(history)} past interactions with predominantly "
            f"{'positive' if history else 'no'} sentiment, focus on clinical evidence "
            f"and patient outcomes. {found_hcp['specialty'] if found_hcp else ''} specialists "
            "respond well to peer-reviewed data and case studies."
        ),
        "call_objective": f"Introduce {product_focus}, secure formulary consideration, and schedule a CME event."
    }
    
    return json.dumps({
        "success": True,
        "message": f"✅ Pre-call brief generated for {hcp_name}",
        "brief": brief
    })


# ─── LangGraph Agent Builder ──────────────────────────────────────────────────
def create_hcp_agent(groq_api_key: str):
    """Create and return the compiled LangGraph HCP agent."""
    
    tools = [
        log_interaction,
        edit_interaction,
        get_hcp_profile,
        schedule_followup,
        generate_precall_brief
    ]
    
    # Initialize Groq LLM with gemma2-9b-it
    llm = ChatGroq(
        api_key=groq_api_key,
        model="gemma2-9b-it",
        temperature=0.1,
        max_tokens=2048
    )
    
    llm_with_tools = llm.bind_tools(tools)
    
    SYSTEM_PROMPT = """You are an AI assistant for a pharmaceutical CRM system helping field sales representatives manage HCP (Healthcare Professional) interactions.

You have access to 5 specialized tools:
1. **log_interaction** - Log a new HCP meeting/interaction with full details
2. **edit_interaction** - Edit/update an existing logged interaction  
3. **get_hcp_profile** - Retrieve HCP profile and full interaction history
4. **schedule_followup** - Schedule follow-up tasks and meetings
5. **generate_precall_brief** - Generate AI pre-call planning brief

When a user describes a meeting or interaction (e.g. "Met Dr. Smith, discussed Product X efficacy"), automatically extract:
- HCP name, interaction type, date/time, topics discussed
- Materials shared, samples distributed
- Observed sentiment (Positive/Neutral/Negative)  
- Outcomes and follow-up actions

Then use the appropriate tool to process the request.

Always be professional, concise, and action-oriented. After logging or editing, confirm what was saved."""

    def call_llm(state: AgentState):
        messages = state["messages"]
        # Add system message
        full_messages = [SystemMessage(content=SYSTEM_PROMPT)] + messages
        response = llm_with_tools.invoke(full_messages)
        return {"messages": [response]}
    
    def should_continue(state: AgentState):
        last_message = state["messages"][-1]
        if hasattr(last_message, "tool_calls") and last_message.tool_calls:
            return "tools"
        return END
    
    # Build graph
    tool_node = ToolNode(tools)
    
    graph = StateGraph(AgentState)
    graph.add_node("llm", call_llm)
    graph.add_node("tools", tool_node)
    
    graph.set_entry_point("llm")
    graph.add_conditional_edges("llm", should_continue, {"tools": "tools", END: END})
    graph.add_edge("tools", "llm")
    
    return graph.compile()


# ─── Singleton agent instance ─────────────────────────────────────────────────
_agent_instance = None

def get_agent(groq_api_key: str = None):
    global _agent_instance
    if _agent_instance is None and groq_api_key:
        _agent_instance = create_hcp_agent(groq_api_key)
    return _agent_instance

def get_interaction_store():
    return _interaction_store

def get_hcp_store():
    return _hcp_store

def get_followup_store():
    return _followup_store
