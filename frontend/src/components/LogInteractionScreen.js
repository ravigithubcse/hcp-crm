import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createInteraction, fetchInteractions } from '../store/interactionsSlice';
import { sendChatMessage, addUserMessage } from '../store/agentSlice';
import { showNotification } from '../store/uiSlice';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

const INTERACTION_TYPES = ['Meeting', 'Phone Call', 'Video Call', 'Email', 'Conference', 'CME Event'];
const SENTIMENTS = ['Positive', 'Neutral', 'Negative'];
const MATERIALS = ['OncaBoost Phase III Brochure', 'Patient Starter Kit', 'Reimbursement Guide', 'Clinical Study Reprint', 'Product Monograph'];

export default function LogInteractionScreen() {
  const dispatch = useDispatch();
  const { messages, loading: agentLoading } = useSelector(s => s.agent);
  const [mode, setMode] = useState('form'); // 'form' or 'chat'
  const [chatInput, setChatInput] = useState('');
  const [hcps, setHcps] = useState([]);
  const [hcpSearch, setHcpSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(['Schedule follow-up meeting in 2 weeks', 'Send OncaBoost Phase III PDF']);
  const chatEndRef = useRef(null);
  const sessionId = useRef(`session_${Date.now()}`);

  const today = new Date();
  const [form, setForm] = useState({
    hcp_id: '', hcp_name: '', interaction_type: 'Meeting',
    date: today.toISOString().split('T')[0],
    time: today.toTimeString().slice(0,5),
    attendees: '', topics_discussed: '', materials_shared: '',
    samples_distributed: '', sentiment: 'Neutral',
    outcomes: '', follow_up_actions: ''
  });

  useEffect(() => {
    axios.get(`${API}/hcps/`).then(r => setHcps(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filteredHcps = hcps.filter(h => h.name?.toLowerCase().includes(hcpSearch.toLowerCase())).slice(0, 5);

  const handleFormChange = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const result = await dispatch(createInteraction(form)).unwrap();
      dispatch(showNotification({ type: 'success', message: `✅ Interaction logged successfully! ID: ${result.id}` }));
      dispatch(fetchInteractions());
      // Reset form
      setForm(f => ({
        ...f, hcp_id: '', hcp_name: '', attendees: '',
        topics_discussed: '', materials_shared: '', samples_distributed: '',
        outcomes: '', follow_up_actions: '', sentiment: 'Neutral'
      }));
    } catch (err) {
      dispatch(showNotification({ type: 'error', message: '❌ Failed to save interaction' }));
    }
    setSaving(false);
  };

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput;
    setChatInput('');
    dispatch(addUserMessage(msg));
    await dispatch(sendChatMessage({ message: msg, sessionId: sessionId.current }));
    dispatch(fetchInteractions());
  };

  const renderMessage = (msg, idx) => {
    const isUser = msg.role === 'user';
    return (
      <div key={idx} style={{
        display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 12
      }}>
        {!isUser && (
          <div style={{
            width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#2563eb,#7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, marginRight: 8, flexShrink: 0, alignSelf: 'flex-end'
          }}>🤖</div>
        )}
        <div style={{
          maxWidth: '75%', padding: '10px 14px', borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          background: isUser ? 'linear-gradient(135deg,#2563eb,#7c3aed)' : 'white',
          color: isUser ? 'white' : '#1e293b',
          fontSize: 13, lineHeight: 1.5,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: isUser ? 'none' : '1px solid #e2e8f0',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word'
        }}>
          {msg.content}
          {msg.action && !isUser && (
            <div style={{ marginTop: 6, fontSize: 11, opacity: 0.6 }}>
              🔧 Tool: {msg.action}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Notification */}
      <NotificationBar />
      
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* Main Form/Chat Area */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="card" style={{ overflow: 'hidden' }}>
            {/* Screen Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', background: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>Log HCP Interaction</h2>
                {/* Mode Toggle */}
                <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 8, padding: 3 }}>
                  {['form', 'chat'].map(m => (
                    <button key={m} onClick={() => setMode(m)} style={{
                      padding: '5px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
                      fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600,
                      background: mode === m ? 'white' : 'transparent',
                      color: mode === m ? '#2563eb' : '#64748b',
                      boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      transition: 'all 0.15s', textTransform: 'capitalize'
                    }}>
                      {m === 'form' ? '📋 Form' : '💬 Chat'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* FORM MODE */}
            {mode === 'form' && (
              <form onSubmit={handleFormSubmit} style={{ padding: 24 }}>
                {/* Interaction Details */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
                    Interaction Details
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="form-group">
                      <label className="form-label">HCP Name *</label>
                      <div style={{ position: 'relative' }}>
                        <input className="form-control" placeholder="Search or select HCP..."
                          value={hcpSearch || form.hcp_name}
                          onChange={e => { setHcpSearch(e.target.value); handleFormChange('hcp_name', e.target.value); }} />
                        {hcpSearch && filteredHcps.length > 0 && (
                          <div style={{
                            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                            background: 'white', border: '1px solid #e2e8f0', borderRadius: 8,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.12)', marginTop: 2
                          }}>
                            {filteredHcps.map(h => (
                              <div key={h.id} onClick={() => {
                                handleFormChange('hcp_id', h.id);
                                handleFormChange('hcp_name', h.name);
                                setHcpSearch('');
                              }} style={{
                                padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9',
                                fontSize: 13
                              }}
                                onMouseEnter={e => e.target.style.background='#f8fafc'}
                                onMouseLeave={e => e.target.style.background='white'}>
                                <div style={{ fontWeight: 500 }}>{h.name}</div>
                                <div style={{ fontSize: 11, color: '#64748b' }}>{h.specialty} • {h.hospital}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Interaction Type</label>
                      <select className="form-control" value={form.interaction_type}
                        onChange={e => handleFormChange('interaction_type', e.target.value)}>
                        {INTERACTION_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Date</label>
                      <input type="date" className="form-control" value={form.date}
                        onChange={e => handleFormChange('date', e.target.value)} />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Time</label>
                      <input type="time" className="form-control" value={form.time}
                        onChange={e => handleFormChange('time', e.target.value)} />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Attendees</label>
                    <input className="form-control" placeholder="Enter names or search..."
                      value={form.attendees} onChange={e => handleFormChange('attendees', e.target.value)} />
                  </div>
                </div>

                {/* Topics */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
                    Discussion & Materials
                  </div>
                  <div className="form-group">
                    <label className="form-label">Topics Discussed</label>
                    <textarea className="form-control" placeholder="Enter key discussion points..."
                      value={form.topics_discussed} onChange={e => handleFormChange('topics_discussed', e.target.value)}
                      rows={4} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="form-group">
                      <label className="form-label">Materials Shared</label>
                      <select className="form-control" value={form.materials_shared}
                        onChange={e => handleFormChange('materials_shared', e.target.value)}>
                        <option value="">Select material...</option>
                        {MATERIALS.map(m => <option key={m}>{m}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Samples Distributed</label>
                      <input className="form-control" placeholder="e.g. OncaBoost 50mg x 5"
                        value={form.samples_distributed}
                        onChange={e => handleFormChange('samples_distributed', e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* Sentiment & Outcomes */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
                    Sentiment & Outcomes
                  </div>
                  <div className="form-group">
                    <label className="form-label">Observed/Inferred HCP Sentiment</label>
                    <div style={{ display: 'flex', gap: 16 }}>
                      {SENTIMENTS.map(s => (
                        <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                          <input type="radio" name="sentiment" value={s}
                            checked={form.sentiment === s}
                            onChange={() => handleFormChange('sentiment', s)} />
                          <span className={`badge badge-${s.toLowerCase()}`}>{s}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Outcomes</label>
                    <textarea className="form-control" placeholder="Key outcomes or agreements..."
                      value={form.outcomes} onChange={e => handleFormChange('outcomes', e.target.value)} rows={2} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Follow-up Actions</label>
                    <textarea className="form-control" placeholder="Enter next steps or tasks..."
                      value={form.follow_up_actions} onChange={e => handleFormChange('follow_up_actions', e.target.value)} rows={2} />
                    {/* AI Suggestions */}
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 11, color: '#7c3aed', fontWeight: 600, marginBottom: 4 }}>
                        ✨ AI Suggested Follow-ups:
                      </div>
                      {aiSuggestions.map((s, i) => (
                        <div key={i} onClick={() => handleFormChange('follow_up_actions', s)}
                          style={{
                            fontSize: 12, color: '#2563eb', cursor: 'pointer', padding: '2px 0',
                            display: 'flex', alignItems: 'center', gap: 4
                          }}>
                          <span>→</span> {s}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary"
                    onClick={() => setForm(f => ({ ...f, topics_discussed: '', outcomes: '', follow_up_actions: '' }))}>
                    Clear
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving || !form.hcp_name}>
                    {saving ? '⏳ Saving...' : '💾 Log Interaction'}
                  </button>
                </div>
              </form>
            )}

            {/* CHAT MODE */}
            {mode === 'chat' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: 580 }}>
                <div style={{ flex: 1, overflowY: 'auto', padding: 20, background: '#f8fafc' }}>
                  {messages.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: 40 }}>
                      <div style={{ fontSize: 40, marginBottom: 12 }}>🤖</div>
                      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>AI Assistant Ready</div>
                      <div style={{ fontSize: 13, maxWidth: 380, margin: '0 auto', lineHeight: 1.6 }}>
                        Describe your interaction naturally, e.g.<br/>
                        <em>"Met Dr. Sharma today, discussed OncaBoost Phase III efficacy. She seemed very interested. Shared the clinical brochure."</em>
                      </div>
                      <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                        {[
                          "Met Dr. Priya Sharma, discussed OncaBoost efficacy",
                          "Show Dr. Rajesh Menon's profile",
                          "Generate pre-call brief for Dr. Anita Bose"
                        ].map((s, i) => (
                          <button key={i} onClick={() => setChatInput(s)}
                            style={{
                              padding: '6px 12px', background: 'white', border: '1px solid #e2e8f0',
                              borderRadius: 20, fontSize: 12, cursor: 'pointer', color: '#2563eb',
                              fontFamily: 'Inter, sans-serif'
                            }}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {messages.map(renderMessage)}
                  {agentLoading && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#2563eb,#7c3aed)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14
                      }}>🤖</div>
                      <div style={{
                        padding: '10px 14px', background: 'white', borderRadius: '16px 16px 16px 4px',
                        border: '1px solid #e2e8f0', fontSize: 13, color: '#64748b'
                      }}>
                        <span className="loading-dots">Analyzing</span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                <div style={{ padding: 16, borderTop: '1px solid #e2e8f0', background: 'white', display: 'flex', gap: 8 }}>
                  <input
                    className="form-control"
                    placeholder='Describe interaction (e.g. "Met Dr. Smith, discussed Product X efficacy, positive sentiment, shared brochure") or ask for help...'
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendChat()}
                    disabled={agentLoading}
                    style={{ flex: 1 }}
                  />
                  <button className="btn btn-primary" onClick={handleSendChat}
                    disabled={agentLoading || !chatInput.trim()} style={{ whiteSpace: 'nowrap' }}>
                    {agentLoading ? '⏳' : '⚡ Log'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar - AI Assistant hint */}
        <div style={{ width: 280, flexShrink: 0 }}>
          <div className="card" style={{ padding: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#2563eb,#7c3aed)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14
              }}>🤖</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>AI Assistant</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>Log interaction via chat</div>
              </div>
            </div>
            <div style={{
              background: '#f8fafc', borderRadius: 8, padding: 12, fontSize: 12, color: '#64748b', lineHeight: 1.6
            }}>
              Log interaction details here (e.g., "Met Dr. Smith, discussed Product X efficacy, positive sentiment, shared brochure") or ask for help.
            </div>
          </div>

          {/* Quick HCPs */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Quick Select HCP</div>
            {hcps.slice(0, 5).map(h => (
              <div key={h.id} onClick={() => { handleFormChange('hcp_id', h.id); handleFormChange('hcp_name', h.name); setMode('form'); }}
                style={{
                  padding: '8px 10px', borderRadius: 6, cursor: 'pointer', marginBottom: 4,
                  border: form.hcp_id === h.id ? '1px solid #2563eb' : '1px solid transparent',
                  background: form.hcp_id === h.id ? '#eff6ff' : 'transparent',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background = form.hcp_id === h.id ? '#eff6ff' : 'transparent'}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{h.name}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{h.specialty}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationBar() {
  const dispatch = useDispatch();
  const { notification } = useSelector(s => s.ui);
  useEffect(() => {
    if (notification) {
      const t = setTimeout(() => dispatch({ type: 'ui/clearNotification' }), 4000);
      return () => clearTimeout(t);
    }
  }, [notification, dispatch]);

  if (!notification) return null;
  return (
    <div style={{
      position: 'fixed', top: 70, right: 24, zIndex: 1000,
      background: notification.type === 'success' ? '#16a34a' : '#dc2626',
      color: 'white', padding: '12px 20px', borderRadius: 8,
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)', fontSize: 14, fontWeight: 500,
      animation: 'slideIn 0.3s ease'
    }}>
      {notification.message}
    </div>
  );
}
