import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authApi } from '../../api';
import { setToken, clearToken } from '../../api/axios';

export const loginThunk = createAsyncThunk('auth/login', async (data, { rejectWithValue }) => {
  try {
    const res = await authApi.login(data);
    setToken(res.data.data.accessToken);
    return res.data.data.user;
  } catch (e) {
    return rejectWithValue(e.response?.data?.message || 'Login failed');
  }
});

export const logoutThunk = createAsyncThunk('auth/logout', async () => {
  await authApi.logout().catch(() => {});
  clearToken();
});

export const fetchMeThunk = createAsyncThunk('auth/me', async (_, { rejectWithValue }) => {
  try {
    // Сначала обновляем access токен через refresh cookie
    const ref = await authApi.refresh();
    setToken(ref.data.data.accessToken);
    const me = await authApi.me();
    return me.data.data;
  } catch {
    return rejectWithValue(null);
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user:    null,
    loading: false,
    error:   null,
    checked: false,   // был ли уже проверен токен при старте
  },
  reducers: {
    clearError: (s) => { s.error = null; },
  },
  extraReducers: (b) => {
    // login
    b.addCase(loginThunk.pending,   (s) => { s.loading = true;  s.error = null; })
     .addCase(loginThunk.fulfilled, (s, a) => { s.loading = false; s.user = a.payload; })
     .addCase(loginThunk.rejected,  (s, a) => { s.loading = false; s.error = a.payload; })
    // logout
     .addCase(logoutThunk.fulfilled, (s) => { s.user = null; })
    // me
     .addCase(fetchMeThunk.pending,   (s) => { s.loading = true; })
     .addCase(fetchMeThunk.fulfilled, (s, a) => { s.loading = false; s.user = a.payload; s.checked = true; })
     .addCase(fetchMeThunk.rejected,  (s) => { s.loading = false; s.checked = true; });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
