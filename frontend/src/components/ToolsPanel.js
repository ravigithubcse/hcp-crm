import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { invokeTool, fetchAgentStatus } from '../store/agentSlice';
import { fetchInteractions } from '../store/interactionsSlice';

const TOOLS = [
  {
    id: 'log_interaction',
    name: 'Log Interaction',
    icon: '📝',
    color: '#2563eb',
    bg: '#eff6ff',
    description: 'Capture a new HCP interaction with AI-powered summarization and entity extraction',
    fields: [
      { key: 'hcp_name', label: 'HCP Name', type: 'text', placeholder: 'Dr. Priya Sharma', required: true },
      { key: 'interaction_type', label: 'Interaction Type', type: 'select', options: ['Meeting', 'Phone Call', 'Video Call', 'Email', 'CME Event'] },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'topics_discussed', label: 'Topics Discussed', type: 'textarea', placeholder: 'OncaBoost Phase III efficacy, patient outcomes...', required: true },
      { key: 'sentiment', label: 'Sentiment', type: 'select', options: ['Positive', 'Neutral', 'Negative'] },
      { key: 'outcomes', label: 'Outcomes', type: 'textarea', placeholder: 'Dr. expressed interest, agreed to trial...' },
      { key: 'follow_up_actions', label: 'Follow-up Actions', type: 'text', placeholder: 'Send Phase III PDF, schedule next visit' },
      { key: 'materials_shared', label: 'Materials Shared', type: 'text', placeholder: 'OncaBoost brochure, patient kit' },
      { key: 'samples_distributed', label: 'Samples Distributed', type: 'text', placeholder: 'OncaBoost 50mg x 5' },
    ]
  },
  {
    id: 'edit_interaction',
    name: 'Edit Interaction',
    icon: '✏️',
    color: '#7c3aed',
    bg: '#f5f3ff',
    description: 'Modify any field of an existing logged interaction with full audit trail',
    fields: [
      { key: 'interaction_id', label: 'Interaction ID', type: 'number', placeholder: '1', required: true },
      { key: 'field', label: 'Field to Edit', type: 'select', options: ['topics_discussed','sentiment','outcomes','follow_up_actions','materials_shared','samples_distributed','attendees','hcp_name','interaction_type'] },
      { key: 'new_value', label: 'New Value', type: 'textarea', placeholder: 'Enter new value...', required: true },
    ]
  },
  {
    id: 'get_hcp_profile',
    name: 'Get HCP Profile',
    icon: '👤',
    color: '#059669',
    bg: '#ecfdf5',
    description: 'Retrieve full HCP profile including interaction history, sentiment trends, and relationship insights',
    fields: [
      { key: 'hcp_name', label: 'HCP Name', type: 'text', placeholder: 'Dr. Priya Sharma', required: true },
    ]
  },
  {
    id: 'schedule_followup',
    name: 'Schedule Follow-up',
    icon: '📅',
    color: '#d97706',
    bg: '#fffbeb',
    description: 'Create follow-up tasks, meeting reminders, and action items for post-interaction management',
    fields: [
      { key: 'hcp_name', label: 'HCP Name', type: 'text', placeholder: 'Dr. Priya Sharma', required: true },
      { key: 'task', label: 'Task Description', type: 'textarea', placeholder: 'Send OncaBoost Phase III PDF, Schedule CME event...', required: true },
      { key: 'due_date', label: 'Due Date', type: 'date', required: true },
      { key: 'interaction_id', label: 'Related Interaction ID (optional)', type: 'number', placeholder: '1' },
    ]
  },
  {
    id: 'generate_precall_brief',
    name: 'Pre-call Brief',
    icon: '📊',
    color: '#dc2626',
    bg: '#fef2f2',
    description: 'AI-generated pre-call planning brief with talking points, materials suggestion, and engagement strategy',
    fields: [
      { key: 'hcp_name', label: 'HCP Name', type: 'text', placeholder: 'Dr. Priya Sharma', required: true },
      { key: 'product_focus', label: 'Product Focus', type: 'text', placeholder: 'OncaBoost Phase III' },
    ]
  }
];

export default function ToolsPanel() {
  const dispatch = useDispatch();
  const { status, lastToolResult } = useSelector(s => s.agent);
  const [activeTool, setActiveTool] = useState(null);
  const [forms, setForms] = useState({});
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState({});

  useEffect(() => { dispatch(fetchAgentStatus()); }, [dispatch]);

  // Init forms with defaults
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const defaults = {};
    TOOLS.forEach(t => {
      defaults[t.id] = {};
      t.fields.forEach(f => {
        if (f.type === 'date') defaults[t.id][f.key] = today;
        else if (f.type === 'select') defaults[t.id][f.key] = f.options?.[0] || '';
        else defaults[t.id][f.key] = '';
      });
    });
    setForms(defaults);
  }, []);

  const handleRunTool = async (toolId) => {
    setLoading(l => ({ ...l, [toolId]: true }));
    try {
      const result = await dispatch(invokeTool({ toolName: toolId, parameters: forms[toolId] })).unwrap();
      setResults(r => ({ ...r, [toolId]: result }));
      dispatch(fetchInteractions());
    } catch (err) {
      setResults(r => ({ ...r, [toolId]: { result: `Error: ${err.message}`, success: false } }));
    }
    setLoading(l => ({ ...l, [toolId]: false }));
  };

  const renderField = (tool, field) => {
    const val = forms[tool.id]?.[field.key] || '';
    const onChange = (v) => setForms(f => ({ ...f, [tool.id]: { ...f[tool.id], [field.key]: v } }));

    if (field.type === 'select') return (
      <select className="form-control" value={val} onChange={e => onChange(e.target.value)}>
        {field.options?.map(o => <option key={o}>{o}</option>)}
      </select>
    );
    if (field.type === 'textarea') return (
      <textarea className="form-control" value={val} placeholder={field.placeholder}
        onChange={e => onChange(e.target.value)} rows={2} />
    );
    return (
      <input className="form-control" type={field.type || 'text'} value={val}
        placeholder={field.placeholder} onChange={e => onChange(e.target.value)} />
    );
  };

  const renderResult = (toolId, color) => {
    const res = results[toolId];
    if (!res) return null;
    const data = res.data || {};
    
    return (
      <div style={{
        marginTop: 16, padding: 16, borderRadius: 8,
        background: res.success ? '#f0fdf4' : '#fef2f2',
        border: `1px solid ${res.success ? '#bbf7d0' : '#fecaca'}`
      }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: res.success ? '#166534' : '#991b1b', marginBottom: 8 }}>
          {res.success ? '✅' : '❌'} {res.result}
        </div>
        {data.brief && (
          <div style={{ fontSize: 12, color: '#374151' }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>📋 Pre-Call Brief:</div>
            <div><b>HCP:</b> {data.brief.hcp_name} — {data.brief.specialty}</div>
            <div><b>Hospital:</b> {data.brief.hospital}</div>
            <div><b>Objective:</b> {data.brief.call_objective}</div>
            <div style={{ marginTop: 6 }}><b>Talking Points:</b></div>
            {data.brief.recommended_talking_points?.map((p, i) => <div key={i}>• {p}</div>)}
            <div style={{ marginTop: 6 }}><b>Strategy:</b> {data.brief.engagement_strategy}</div>
          </div>
        )}
        {data.hcp && !data.brief && (
          <div style={{ fontSize: 12, color: '#374151' }}>
            <div><b>Name:</b> {data.hcp.name}</div>
            <div><b>Specialty:</b> {data.hcp.specialty} | <b>Hospital:</b> {data.hcp.hospital}</div>
            <div><b>Interactions:</b> {data.interaction_count} | <b>Trend:</b> {data.sentiment_trend}</div>
          </div>
        )}
        {data.data && data.data.id && (
          <div style={{ fontSize: 12, color: '#374151' }}>
            <div><b>Interaction ID:</b> {data.data.id}</div>
            <div><b>HCP:</b> {data.data.hcp_name} | <b>Type:</b> {data.data.interaction_type}</div>
            <div><b>Sentiment:</b> {data.data.sentiment}</div>
          </div>
        )}
        {data.followup_id && (
          <div style={{ fontSize: 12, color: '#374151' }}>
            <div><b>Follow-up ID:</b> {data.followup_id}</div>
            <div><b>Task:</b> {data.data?.task}</div>
            <div><b>Due:</b> {data.data?.due_date}</div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>LangGraph AI Tools</h2>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>5 specialized tools powered by gemma2-9b-it via Groq</p>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: status?.agent_ready ? '#dcfce7' : '#fef9c3',
          padding: '8px 14px', borderRadius: 20,
          fontSize: 13, fontWeight: 500,
          color: status?.agent_ready ? '#166534' : '#854d0e'
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: status?.agent_ready ? '#16a34a' : '#d97706'
          }}/>
          {status?.agent_ready ? 'Agent Active' : 'Agent Loading'} • {status?.model || 'gemma2-9b-it'}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 16 }}>
        {TOOLS.map(tool => (
          <div key={tool.id} className="card" style={{ overflow: 'hidden' }}>
            {/* Tool header */}
            <div style={{
              padding: '16px 20px', background: tool.bg,
              borderBottom: '1px solid rgba(0,0,0,0.06)',
              display: 'flex', alignItems: 'center', gap: 12,
              cursor: 'pointer'
            }} onClick={() => setActiveTool(activeTool === tool.id ? null : tool.id)}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: tool.color, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 18
              }}>{tool.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>
                  Tool {TOOLS.indexOf(tool) + 1}: {tool.name}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, lineHeight: 1.4 }}>
                  {tool.description}
                </div>
              </div>
              <div style={{ color: '#94a3b8', fontSize: 16 }}>{activeTool === tool.id ? '▲' : '▼'}</div>
            </div>

            {/* Tool form */}
            {activeTool === tool.id && (
              <div style={{ padding: 20 }}>
                {tool.fields.map(field => (
                  <div className="form-group" key={field.key}>
                    <label className="form-label">
                      {field.label} {field.required && <span style={{ color: '#dc2626' }}>*</span>}
                    </label>
                    {renderField(tool, field)}
                  </div>
                ))}
                <button className="btn btn-primary"
                  onClick={() => handleRunTool(tool.id)}
                  disabled={loading[tool.id]}
                  style={{ background: tool.color, width: '100%', justifyContent: 'center' }}>
                  {loading[tool.id] ? '⏳ Running...' : `▶ Run ${tool.name}`}
                </button>
                {renderResult(tool.id, tool.color)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Followed-up list */}
      <div className="card" style={{ marginTop: 20, padding: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>
          📊 Agent Status: {status?.interaction_count || 0} interactions • {status?.followup_count || 0} follow-ups • {status?.hcp_count || 0} HCPs
        </div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {status?.tools?.map(t => (
            <div key={t.name} style={{
              padding: '8px 14px', background: '#f8fafc', borderRadius: 8,
              border: '1px solid #e2e8f0', fontSize: 12
            }}>
              <div style={{ fontWeight: 600, color: '#1e293b' }}>{t.name}</div>
              <div style={{ color: '#64748b', marginTop: 2 }}>{t.description?.slice(0, 60)}...</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
