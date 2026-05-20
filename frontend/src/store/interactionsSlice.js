import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

export const fetchInteractions = createAsyncThunk('interactions/fetchAll', async () => {
  const res = await axios.get(`${API_BASE}/interactions/`);
  return res.data;
});

export const createInteraction = createAsyncThunk('interactions/create', async (data) => {
  const res = await axios.post(`${API_BASE}/interactions/`, data);
  return res.data;
});

export const updateInteraction = createAsyncThunk('interactions/update', async ({ id, data }) => {
  const res = await axios.put(`${API_BASE}/interactions/${id}`, data);
  return res.data;
});

export const deleteInteraction = createAsyncThunk('interactions/delete', async (id) => {
  await axios.delete(`${API_BASE}/interactions/${id}`);
  return id;
});

const interactionsSlice = createSlice({
  name: 'interactions',
  initialState: {
    items: [],
    loading: false,
    error: null,
    selectedInteraction: null,
  },
  reducers: {
    setSelected: (state, action) => { state.selectedInteraction = action.payload; },
    clearSelected: (state) => { state.selectedInteraction = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInteractions.pending, (state) => { state.loading = true; })
      .addCase(fetchInteractions.fulfilled, (state, action) => {
        state.loading = false; state.items = action.payload;
      })
      .addCase(fetchInteractions.rejected, (state, action) => {
        state.loading = false; state.error = action.error.message;
      })
      .addCase(createInteraction.fulfilled, (state, action) => {
        if (action.payload.data) state.items.unshift(action.payload.data);
      })
      .addCase(deleteInteraction.fulfilled, (state, action) => {
        state.items = state.items.filter(i => i.id !== action.payload);
      });
  }
});

export const { setSelected, clearSelected } = interactionsSlice.actions;
export default interactionsSlice.reducer;
