import { createSlice } from '@reduxjs/toolkit';

let nextId = 1;

const toastSlice = createSlice({
  name: 'toast',
  initialState: { items: [] },
  reducers: {
    addToast: (s, a) => {
      s.items.push({ id: nextId++, ...a.payload });
    },
    removeToast: (s, a) => {
      s.items = s.items.filter(t => t.id !== a.payload);
    },
  },
});

export const { addToast, removeToast } = toastSlice.actions;

// Удобные хелперы
export const toast = {
  success: (msg) => addToast({ type: 'success', msg }),
  error: (msg) => addToast({ type: 'error', msg }),
  info: (msg) => addToast({ type: 'info', msg }),
};

export default toastSlice.reducer;
