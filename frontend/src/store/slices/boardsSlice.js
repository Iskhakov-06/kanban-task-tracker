import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { boardsApi } from '../../api';

export const fetchBoards = createAsyncThunk('boards/fetchAll', async () => {
  const res = await boardsApi.getAll();
  return res.data.data;
});

export const fetchBoard = createAsyncThunk('boards/fetchOne', async (id) => {
  const res = await boardsApi.getOne(id);
  return res.data.data;
});

export const createBoard = createAsyncThunk('boards/create', async (data, { rejectWithValue }) => {
  try {
    const res = await boardsApi.create(data);
    return res.data.data;
  } catch (e) { return rejectWithValue(e.response?.data?.message || 'Error'); }
});

export const deleteBoard = createAsyncThunk('boards/delete', async (id, { rejectWithValue }) => {
  try {
    await boardsApi.delete(id);
    return id;
  } catch (e) {
    return rejectWithValue(e.response?.data?.message || 'Ошибка при удалении доски');
  }
});

const boardsSlice = createSlice({
  name: 'boards',
  initialState: {
    list: [],
    current: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearCurrent: (s) => { s.current = null; },
  },
  extraReducers: (b) => {
    b.addCase(fetchBoards.pending, (s) => { s.loading = true; })
      .addCase(fetchBoards.fulfilled, (s, a) => { s.loading = false; s.list = a.payload; })
      .addCase(fetchBoards.rejected, (s) => { s.loading = false; })

      .addCase(fetchBoard.pending, (s) => { s.loading = true; })
      .addCase(fetchBoard.fulfilled, (s, a) => { s.loading = false; s.current = a.payload; })
      .addCase(fetchBoard.rejected, (s) => { s.loading = false; })

      .addCase(createBoard.fulfilled, (s, a) => { s.list.push(a.payload); })
      .addCase(deleteBoard.fulfilled, (s, a) => { s.list = s.list.filter(b => b.id !== a.payload); })
      .addCase(deleteBoard.rejected, (s) => { s.loading = false; });
  },
});

export const { clearCurrent } = boardsSlice.actions;
export default boardsSlice.reducer;