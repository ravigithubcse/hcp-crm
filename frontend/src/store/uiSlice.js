import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    activeTab: 'log',
    sidebarOpen: false,
    notification: null,
  },
  reducers: {
    setActiveTab: (state, action) => { state.activeTab = action.payload; },
    showNotification: (state, action) => { state.notification = action.payload; },
    clearNotification: (state) => { state.notification = null; },
  }
});

export const { setActiveTab, showNotification, clearNotification } = uiSlice.actions;
export default uiSlice.reducer;
