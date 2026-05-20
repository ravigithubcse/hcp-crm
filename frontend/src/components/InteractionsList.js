import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchInteractions, deleteInteraction, setSelected } from '../store/interactionsSlice';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

export default function InteractionsList() {
  const dispatch = useDispatch();
  const { items, loading } = useSelector(s => s.interactions);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [filter, setFilter] = useState('');
  const [agentItems, setAgentItems] = useState([]);

  useEffect(() => {
    dispatch(fetchInteractions());
    // Also fetch agent in-memory interactions
    axios.get(`${API}/agent/interactions`).then(r => setAgentItems(r.data)).catch(() => {});
  }, [dispatch]);

  const allItems = [...items, ...agentItems.filter(a => !items.find(i => i.id === a.id))];
  const filtered = allItems.filter(i =>
    !filter || i.hcp_name?.toLowerCase().includes(filter.toLowerCase()) ||
    i.topics_discussed?.toLowerCase().includes(filter.toLowerCase())
  );

  const handleEdit = (item) => { setEditingId(item.id); setEditForm({ ...item }); };

  const handleSaveEdit = async () => {
    try {
      await axios.put(`${API}/interactions/${editingId}`, editForm);
      dispatch(fetchInteractions());
      setEditingId(null);
    } catch {}
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this interaction?')) dispatch(deleteInteraction(id));
  };

  const sentimentColor = (s) => s === 'Positive' ? '#16a34a' : s === 'Negative' ? '#dc2626' : '#d97706';
  const sentimentBg = (s) => s === 'Positive' ? '#dcfce7' : s === 'Negative' ? '#fee2e2' : '#fef9c3';

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>Loading interactions...
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Interaction History</h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input className="form-control" placeholder="🔍 Search interactions..."
            value={filter} onChange={e => setFilter(e.target.value)}
            style={{ width: 240 }} />
          <span style={{ fontSize: 13, color: '#64748b' }}>{filtered.length} records</span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ fontWeight: 600 }}>No interactions yet</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Log your first HCP interaction using the Log tab</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(item => (
            <div key={`${item.id}-${item.hcp_name}`} className="card" style={{ padding: 20 }}>
              {editingId === item.id ? (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div><label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>HCP Name</label>
                      <input className="form-control" value={editForm.hcp_name || ''}
                        onChange={e => setEditForm(f => ({ ...f, hcp_name: e.target.value }))} /></div>
                    <div><label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Sentiment</label>
                      <select className="form-control" value={editForm.sentiment || 'Neutral'}
                        onChange={e => setEditForm(f => ({ ...f, sentiment: e.target.value }))}>
                        <option>Positive</option><option>Neutral</option><option>Negative</option>
                      </select></div>
                    <div><label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Type</label>
                      <input className="form-control" value={editForm.interaction_type || ''}
                        onChange={e => setEditForm(f => ({ ...f, interaction_type: e.target.value }))} /></div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Topics Discussed</label>
                    <textarea className="form-control" value={editForm.topics_discussed || ''}
                      onChange={e => setEditForm(f => ({ ...f, topics_discussed: e.target.value }))} rows={2} />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Outcomes</label>
                    <textarea className="form-control" value={editForm.outcomes || ''}
                      onChange={e => setEditForm(f => ({ ...f, outcomes: e.target.value }))} rows={2} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-success btn-sm" onClick={handleSaveEdit}>💾 Save</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontWeight: 700, fontSize: 15 }}>{item.hcp_name}</span>
                        <span className="badge badge-blue">{item.interaction_type}</span>
                        <span style={{
                          padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                          background: sentimentBg(item.sentiment), color: sentimentColor(item.sentiment)
                        }}>{item.sentiment}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                        📅 {item.date} {item.time && `at ${item.time}`}
                        {item.attendees && ` • 👥 ${item.attendees}`}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(item)}>✏️ Edit</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleDelete(item.id)}
                        style={{ color: '#dc2626' }}>🗑️</button>
                    </div>
                  </div>
                  {item.topics_discussed && (
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>TOPICS: </span>
                      <span style={{ fontSize: 13 }}>{item.topics_discussed}</span>
                    </div>
                  )}
                  {item.outcomes && (
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>OUTCOMES: </span>
                      <span style={{ fontSize: 13 }}>{item.outcomes}</span>
                    </div>
                  )}
                  {item.follow_up_actions && (
                    <div style={{
                      background: '#eff6ff', borderRadius: 6, padding: '8px 12px',
                      fontSize: 12, color: '#1e40af', marginTop: 8
                    }}>
                      📌 Follow-up: {item.follow_up_actions}
                    </div>
                  )}
                  {item.ai_summary && (
                    <div style={{
                      background: '#f5f3ff', borderRadius: 6, padding: '8px 12px',
                      fontSize: 12, color: '#6d28d9', marginTop: 8
                    }}>
                      🤖 AI Summary: {item.ai_summary}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
