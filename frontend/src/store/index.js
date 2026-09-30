import { configureStore } from '@reduxjs/toolkit';
import authReducer   from './slices/authSlice';
import boardsReducer from './slices/boardsSlice';
import toastReducer  from './slices/toastSlice';

export const store = configureStore({
  reducer: {
    auth:   authReducer,
    boards: boardsReducer,
    toast:  toastReducer,
  },
});
