import { configureStore } from '@reduxjs/toolkit';
import interactionsReducer from './interactionsSlice';
import agentReducer from './agentSlice';
import uiReducer from './uiSlice';

export const store = configureStore({
  reducer: {
    interactions: interactionsReducer,
    agent: agentReducer,
    ui: uiReducer,
  },
});

export default store;
