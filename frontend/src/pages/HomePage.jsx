import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchBoards, createBoard, deleteBoard } from '../store/slices/boardsSlice';
import { addToast, toast } from '../store/slices/toastSlice';
import Navbar from '../components/UI/Navbar';

export default function HomePage() {
  const { list, loading } = useSelector(s => s.boards);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => { dispatch(fetchBoards()); }, []);

  const handleCreate = async e => {
    e.preventDefault();
    setCreating(true);
    const res = await dispatch(createBoard(form));
    setCreating(false);
    if (createBoard.fulfilled.match(res)) {
      setModal(false);
      setForm({ title: '', description: '' });
      dispatch(toast.success('Доска создана'));
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Удалить доску? Все задачи будут удалены.')) return;
    const res = await dispatch(deleteBoard(id));
    if (deleteBoard.rejected.match(res)) {
      // res.payload — строка из rejectWithValue
      const msg = typeof res.payload === 'string'
        ? res.payload
        : res.error?.message || 'Недостаточно прав для удаления доски';
      dispatch(toast.error(msg));
    } else {
      dispatch(toast.success('Доска удалена'));
    }
  };

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h1 style={{ fontSize: 20 }}>Мои доски</h1>
          <button className="btn-primary" onClick={() => setModal(true)}>+ Новая доска</button>
        </div>

        {loading && <p style={{ color: '#888' }}>Загрузка...</p>}

        {!loading && list.length === 0 && (
          <p style={{ color: '#888', textAlign: 'center', marginTop: 40 }}>
            Досок пока нет. Создайте первую!
          </p>
        )}

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {list.map(board => (
              <tr key={board.id}
                onClick={() => navigate(`/board/${board.id}`)}
                style={{ cursor: 'pointer', borderBottom: '1px solid #eee' }}
              >
                <td style={{ padding: '12px 8px' }}>
                  <div style={{ fontWeight: 'bold' }}>{board.title}</div>
                  {board.description && (
                    <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{board.description}</div>
                  )}
                </td>
                <td style={{ padding: '12px 8px', color: '#888', fontSize: 13, width: 120 }}>
                  {board.owner?.username}
                </td>
                <td style={{ padding: '12px 8px', width: 80, textAlign: 'right' }}>
                  <button className="btn-danger"
                    onClick={e => handleDelete(e, board.id)}
                    style={{ padding: '4px 10px', fontSize: 12 }}>
                    Удалить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Новая доска</h3>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Название *</label>
                <input placeholder="Название доски"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Описание</label>
                <input placeholder="Необязательно"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button type="button" className="btn-ghost w-full" onClick={() => setModal(false)}>
                  Отмена
                </button>
                <button type="submit" className="btn-primary w-full" disabled={creating}>
                  {creating ? 'Создание...' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}