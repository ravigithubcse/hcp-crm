# 💊 PharmaConnect CRM — HCP Interaction Management System

An **AI-First CRM** for pharmaceutical field sales representatives, featuring a LangGraph-powered agent with 5 specialized tools for managing Healthcare Professional (HCP) interactions.

## 🎯 What I Understood from the Task

As a life science expert designing for field reps, this system solves a real pain point: reps spend too much time on admin (logging calls, tracking follow-ups) instead of selling. The solution is an AI-first CRM where:
- Reps can log interactions via **natural language chat** (just describe what happened)
- OR use a **structured form** for precise data entry
- The **LangGraph agent** handles extraction, summarization, and workflow automation
- All data syncs to a **SQL database** for analytics and compliance

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                React Frontend (Redux)                │
│  ┌──────────────┐ ┌──────────────┐ ┌─────────────┐  │
│  │ Log Screen   │ │  History     │ │  AI Tools   │  │
│  │ (Form+Chat)  │ │  (CRUD)      │ │  (5 Tools)  │  │
│  └──────────────┘ └──────────────┘ └─────────────┘  │
└───────────────────────┬─────────────────────────────┘
                        │ REST API (axios)
┌───────────────────────▼─────────────────────────────┐
│              FastAPI Backend (Python)                │
│  /api/v1/interactions  /api/v1/hcps  /api/v1/agent  │
└───────────────────────┬─────────────────────────────┘
                        │
        ┌───────────────┴────────────────┐
        │                                │
┌───────▼───────┐              ┌─────────▼──────────┐
│   SQLite/     │              │  LangGraph Agent   │
│   PostgreSQL  │              │  (gemma2-9b-it)    │
│   Database    │              │  ┌──────────────┐  │
└───────────────┘              │  │ 5 Tools:     │  │
                               │  │ 1. log_inter │  │
                               │  │ 2. edit_int  │  │
                               │  │ 3. hcp_prof  │  │
                               │  │ 4. followup  │  │
                               │  │ 5. pre_brief │  │
                               │  └──────────────┘  │
                               │  Groq API (LLM)    │
                               └────────────────────┘
```

## 🤖 LangGraph Agent & 5 Tools

The LangGraph agent orchestrates HCP interaction management through a state machine:

### Tool 1: `log_interaction`
Captures new HCP interactions with full details. Uses the LLM to:
- Extract entities (HCP name, sentiment, topics, outcomes)
- Generate AI summaries for quick reference
- Persist to both in-memory store and SQL database

### Tool 2: `edit_interaction`
Modifies existing logged interactions:
- Field-level editing with validation
- Full audit trail (updated_at timestamp)
- Supports all fields: sentiment, topics, outcomes, follow-ups, etc.

### Tool 3: `get_hcp_profile`
Retrieves comprehensive HCP data:
- Full interaction history
- Sentiment trend analysis (Positive/Neutral/Negative over time)
- Pre-call relationship insights

### Tool 4: `schedule_followup`
Creates follow-up tasks:
- Links to specific interactions
- Due date tracking
- Covers: material sends, next visits, CME events, calls

### Tool 5: `generate_precall_brief`
AI-powered pre-call planning:
- Analyzes past interaction history
- Suggests optimal talking points
- Recommends materials and samples
- Generates engagement strategy based on HCP specialty

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Redux Toolkit |
| State Management | Redux (configureStore, createAsyncThunk) |
| Backend | Python + FastAPI |
| AI Agent | LangGraph (StateGraph) |
| LLM | Groq — gemma2-9b-it (primary), llama-3.3-70b-versatile (context) |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Font | Google Inter |
| ORM | SQLAlchemy 2.0 |
| HTTP Client | Axios |

## 🚀 How to Run

### Prerequisites
- Node.js 18+
- Python 3.10+
- Groq API Key (from https://console.groq.com)

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your GROQ_API_KEY

# Start server
uvicorn main:app --reload --port 8000
```

Backend runs at: http://localhost:8000  
API Docs: http://localhost:8000/docs

### Frontend Setup

```bash
cd frontend
npm install
# Set API URL in .env if needed (default: http://localhost:8000/api/v1)
npm start
```

Frontend runs at: http://localhost:3000

### Production with PostgreSQL

```bash
# In backend/.env
DATABASE_URL=postgresql://user:password@localhost:5432/hcp_crm
```

## 📁 Project Structure

```
hcp-crm/
├── backend/
│   ├── main.py                    # FastAPI app entry point
│   ├── requirements.txt
│   ├── .env.example
│   └── app/
│       ├── config.py              # Settings (Pydantic)
│       ├── agents/
│       │   └── hcp_agent.py       # LangGraph agent + 5 tools
│       ├── api/
│       │   ├── interactions.py    # CRUD endpoints
│       │   ├── hcps.py            # HCP management
│       │   └── agent.py           # Chat + tool invocation
│       ├── models/
│       │   └── database.py        # SQLAlchemy models
│       └── schemas/
│           └── schemas.py         # Pydantic schemas
└── frontend/
    ├── public/
    └── src/
        ├── App.js                 # Root component
        ├── index.js
        ├── index.css              # Global styles (Inter font)
        ├── store/
        │   ├── index.js           # Redux store
        │   ├── interactionsSlice.js
        │   ├── agentSlice.js
        │   └── uiSlice.js
        └── components/
            ├── LogInteractionScreen.js  # Main screen (Form+Chat)
            ├── InteractionsList.js      # History with edit/delete
            └── ToolsPanel.js            # Interactive tool demos
```

## 🔑 Key Features

- **Dual-mode logging**: Structured form OR natural language chat
- **AI chat interface**: Describe interactions naturally, agent extracts all data
- **5 LangGraph tools**: Directly invokable with real-time results
- **HCP search**: Auto-complete from seeded database of 5 HCPs
- **Sentiment tracking**: Positive/Neutral/Negative with visual indicators
- **AI follow-up suggestions**: LLM-powered recommendations
- **Edit history**: Full CRUD on logged interactions
- **Responsive UI**: Works on desktop and tablet

## 🧪 Sample Interactions (Chat Mode)

```
"Met Dr. Priya Sharma today at Apollo Hospital. Discussed OncaBoost Phase III 
efficacy data. She was very positive and requested the clinical brochure. 
Plan to follow up next week with patient starter kits."

"Show me Dr. Rajesh Menon's profile and interaction history"

"Generate a pre-call brief for Dr. Anita Bose for OncaBoost"

"Schedule a follow-up with Dr. Sharma to send the Phase III PDF by April 26"
```

---
Built with ❤️ for the pharmaceutical field force | Powered by LangGraph + Groq
