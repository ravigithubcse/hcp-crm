import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

export const sendChatMessage = createAsyncThunk('agent/chat', async ({ message, sessionId }) => {
  const res = await axios.post(`${API_BASE}/agent/chat`, { message, session_id: sessionId });
  return res.data;
});

export const invokeTool = createAsyncThunk('agent/invokeTool', async ({ toolName, parameters }) => {
  const res = await axios.post(`${API_BASE}/agent/tool`, { tool_name: toolName, parameters });
  return { ...res.data, toolName };
});

export const fetchAgentStatus = createAsyncThunk('agent/status', async () => {
  const res = await axios.get(`${API_BASE}/agent/status`);
  return res.data;
});

const agentSlice = createSlice({
  name: 'agent',
  initialState: {
    messages: [],
    status: null,
    loading: false,
    error: null,
    lastToolResult: null,
    extractedData: null,
  },
  reducers: {
    clearMessages: (state) => { state.messages = []; },
    addUserMessage: (state, action) => {
      state.messages.push({ role: 'user', content: action.payload, timestamp: new Date().toISOString() });
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendChatMessage.pending, (state) => { state.loading = true; })
      .addCase(sendChatMessage.fulfilled, (state, action) => {
        state.loading = false;
        state.messages.push({ role: 'assistant', content: action.payload.response, timestamp: new Date().toISOString(), action: action.payload.action });
        state.extractedData = action.payload.extracted_data;
      })
      .addCase(sendChatMessage.rejected, (state, action) => {
        state.loading = false; state.error = action.error.message;
        state.messages.push({ role: 'assistant', content: '❌ Sorry, I encountered an error. Please try again.', timestamp: new Date().toISOString() });
      })
      .addCase(invokeTool.fulfilled, (state, action) => {
        state.lastToolResult = action.payload;
      })
      .addCase(fetchAgentStatus.fulfilled, (state, action) => {
        state.status = action.payload;
      });
  }
});

export const { clearMessages, addUserMessage } = agentSlice.actions;
export default agentSlice.reducer;
