import { useState, useEffect, useRef } from 'react';
import { usersApi, boardsApi } from '../../api';

export default function AddMemberModal({ boardId, onClose, onAdded }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const timerRef = useRef(null);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await usersApi.search(query);
        setResults(r.data.data || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  const handleSelect = user => {
    setSelected(user);
    setQuery(user.username);
    setResults([]);
    setError('');
  };

  const handleAdd = async () => {
    if (!selected) { setError('Выберите пользователя из списка'); return; }
    setAdding(true);
    setError('');
    try {
      await boardsApi.addMember(boardId, { userId: selected.id });
      onAdded(selected);
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || 'Ошибка при добавлении');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>Добавить участника</h3>

        <div className="form-group" style={{ position: 'relative' }}>
          <label>Поиск по имени или email</label>
          <input
            autoFocus
            placeholder="Начните вводить: Alex..."
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(null); }}
          />
          {loading && <span style={{ fontSize: 12, color: '#888' }}>Поиск...</span>}

          {/* Дропдаун */}
          {results.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0,
              background: '#fff', border: '1px solid #ddd',
              borderRadius: 4, zIndex: 10, marginTop: 2,
            }}>
              {results.map(user => (
                <div key={user.id} onClick={() => handleSelect(user)}
                  style={{
                    padding: '8px 12px', cursor: 'pointer',
                    borderBottom: '1px solid #eee', fontSize: 13,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                >
                  <b>{user.username}</b>
                  <span style={{ color: '#888', marginLeft: 8 }}>{user.email}</span>
                  <span className={`role-badge role-${user.role}`} style={{ marginLeft: 8 }}>
                    {user.role}
                  </span>
                </div>
              ))}
            </div>
          )}

          {!loading && query.length >= 2 && results.length === 0 && !selected && (
            <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>Пользователи не найдены</p>
          )}
        </div>

        {selected && (
          <p style={{
            fontSize: 13, color: '#155724', background: '#d4edda',
            padding: '8px 10px', borderRadius: 4, marginBottom: 12
          }}>
            Выбран: <b>{selected.username}</b> ({selected.email})
          </p>
        )}

        {error && <p className="form-error" style={{ marginBottom: 12 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost w-full" onClick={onClose}>Отмена</button>
          <button className="btn-primary w-full" onClick={handleAdd} disabled={!selected || adding}>
            {adding ? 'Добавление...' : 'Добавить'}
          </button>
        </div>
      </div>
    </div>
  );
}
