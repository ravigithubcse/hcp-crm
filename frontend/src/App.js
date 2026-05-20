import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import { useDispatch, useSelector } from 'react-redux';
import { setActiveTab } from './store/uiSlice';
import { fetchAgentStatus } from './store/agentSlice';
import { fetchInteractions } from './store/interactionsSlice';
import LogInteractionScreen from './components/LogInteractionScreen';
import InteractionsList from './components/InteractionsList';
import ToolsPanel from './components/ToolsPanel';
import './index.css';

function AppContent() {
  const dispatch = useDispatch();
  const { activeTab } = useSelector(s => s.ui);
  const { status } = useSelector(s => s.agent);

  useEffect(() => {
    dispatch(fetchAgentStatus());
    dispatch(fetchInteractions());
  }, [dispatch]);

  const tabs = [
    { id: 'log', label: '📝 Log Interaction', icon: '📝' },
    { id: 'history', label: '📋 History', icon: '📋' },
    { id: 'tools', label: '🤖 AI Tools', icon: '🤖' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #1e40af 0%, #7c3aed 100%)',
        padding: '0 24px', height: 60, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, background: 'rgba(255,255,255,0.2)',
            borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18
          }}>💊</div>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>PharmaConnect CRM</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>HCP Interaction Management</div>
          </div>
        </div>

        {/* Nav tabs */}
        <nav style={{ display: 'flex', gap: 4 }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => dispatch(setActiveTab(tab.id))}
              style={{
                padding: '6px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
                fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500,
                background: activeTab === tab.id ? 'rgba(255,255,255,0.25)' : 'transparent',
                color: 'white', transition: 'all 0.15s'
              }}>
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Agent status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: status?.agent_ready ? '#4ade80' : '#fbbf24',
            boxShadow: `0 0 6px ${status?.agent_ready ? '#4ade80' : '#fbbf24'}`
          }}/>
          <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>
            {status?.agent_ready ? 'AI Agent Active' : 'AI Agent Loading'}
          </span>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 24px' }}>
        {activeTab === 'log' && <LogInteractionScreen />}
        {activeTab === 'history' && <InteractionsList />}
        {activeTab === 'tools' && <ToolsPanel />}
      </main>
    </div>
  );
}

function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

export default App;
