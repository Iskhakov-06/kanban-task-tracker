import { useState, useEffect } from 'react';
import { tasksApi, boardsApi } from '../../api';

export default function TaskModal({ task, boardId, columnId, onClose, onUpdate, onDelete }) {
  const [detail, setDetail] = useState(null);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [editTitle, setEditTitle] = useState(false);
  const [newTitle, setNewTitle] = useState(task.title);
  const [members, setMembers] = useState([]);
  const [editMeta, setEditMeta] = useState({
    assignee_id: task.assignee_id || '',
    due_date: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '',
  });

  useEffect(() => {
    tasksApi.getOne(boardId, columnId, task.id)
      .then(r => {
        const data = r.data.data;
        setDetail(data);
        setEditMeta({
          assignee_id: data.assignee_id || '',
          due_date: data.due_date ? new Date(data.due_date).toISOString().split('T')[0] : '',
        });
      })
      .catch(() => { });

    boardsApi.getOne(boardId)
      .then(r => setMembers(r.data.data?.members || []))
      .catch(() => { });
  }, [task.id]);

  const d = detail || task;

  const formatDate = val => {
    if (!val) return '';
    const date = new Date(val);
    if (isNaN(date)) return '';
    return date.toLocaleString('ru', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const handleTitleSave = async () => {
    if (newTitle.trim() === task.title) { setEditTitle(false); return; }
    await tasksApi.update(boardId, columnId, task.id, { title: newTitle.trim() });
    onUpdate();
    setEditTitle(false);
  };

  const handleAddComment = async e => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSaving(true);
    try {
      const r = await tasksApi.addComment(boardId, columnId, task.id, { body: comment });
      setDetail(prev => ({ ...prev, comments: [...(prev?.comments || []), r.data.data] }));
      setComment('');
    } finally { setSaving(false); }
  };

  const handlePriority = async priority => {
    await tasksApi.update(boardId, columnId, task.id, { priority });
    setDetail(prev => ({ ...prev, priority }));
    onUpdate();
  };

  const handleMetaSave = async (field, value) => {
    await tasksApi.update(boardId, columnId, task.id, { [field]: value || null });
    setDetail(prev => ({ ...prev, [field]: value }));
    onUpdate();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff',
        borderRadius: 6,
        padding: 0,
        width: '100%',
        maxWidth: 560,
        maxHeight: '85vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
      }}>
        {/* Шапка */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #eee' }}>
          {editTitle ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <input autoFocus value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleTitleSave(); if (e.key === 'Escape') setEditTitle(false); }}
                style={{ fontWeight: 'bold' }} />
              <button className="btn-primary" onClick={handleTitleSave} style={{ whiteSpace: 'nowrap' }}>
                Сохранить
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <h3 onClick={() => setEditTitle(true)}
                style={{ fontSize: 15, cursor: 'pointer', flex: 1 }}
                title="Нажмите чтобы редактировать">
                {d.title}
              </h3>
              <div style={{ display: 'flex', gap: 6 }}>
                {onDelete && (
                  <button className="btn-danger" onClick={onDelete}
                    style={{ padding: '4px 10px', fontSize: 12 }}>
                    Удалить
                  </button>
                )}
                <button className="btn-ghost" onClick={onClose}
                  style={{ padding: '4px 8px', fontSize: 14 }}>✕</button>
              </div>
            </div>
          )}

          {/* Приоритет */}
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#888' }}>Приоритет:</span>
            {['low', 'medium', 'high', 'critical'].map(p => (
              <span key={p}
                className={`priority priority-${p}`}
                onClick={() => handlePriority(p)}
                style={{ cursor: 'pointer', opacity: d.priority === p ? 1 : 0.4 }}>
                {p}
              </span>
            ))}
          </div>
        </div>

        {/* Тело */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>

          {/* Исполнитель и дедлайн */}
          <table style={{ width: '100%', marginBottom: 14, borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '6px 8px 6px 0', width: '50%', verticalAlign: 'top' }}>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Исполнитель</div>
                  <select
                    value={editMeta.assignee_id}
                    onChange={e => {
                      setEditMeta(m => ({ ...m, assignee_id: e.target.value }));
                      handleMetaSave('assignee_id', e.target.value);
                    }}
                    style={{ fontSize: 13 }}
                  >
                    <option value="">Не назначен</option>
                    {members.map(m => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.user?.username || m.user_id}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: '6px 0 6px 8px', width: '50%', verticalAlign: 'top' }}>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Дедлайн</div>
                  <input type="date"
                    value={editMeta.due_date}
                    onChange={e => {
                      setEditMeta(m => ({ ...m, due_date: e.target.value }));
                      handleMetaSave('due_date', e.target.value || null);
                    }}
                    style={{ fontSize: 13 }}
                  />
                </td>
              </tr>
            </tbody>
          </table>

          {/* Описание */}
          {d.description && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Описание</div>
              <p style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{d.description}</p>
            </div>
          )}

          {/* Комментарии */}
          <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
            Комментарии {d.comments?.length ? `(${d.comments.length})` : ''}
          </div>

          {d.comments?.map(c => (
            <div key={c.id} style={{
              borderLeft: '3px solid #ddd',
              paddingLeft: 10,
              marginBottom: 12,
            }}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>
                <b style={{ color: '#333' }}>{c.author?.username}</b>
                {' · '}
                {formatDate(c.created_at || c.createdAt)}
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.5 }}>{c.body}</p>
            </div>
          ))}

          {(!d.comments || d.comments.length === 0) && (
            <p style={{ fontSize: 12, color: '#aaa', marginBottom: 12 }}>Комментариев пока нет</p>
          )}

          <form onSubmit={handleAddComment}>
            <textarea
              placeholder="Добавить комментарий..."
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={2}
              style={{ resize: 'vertical', marginBottom: 6 }}
            />
            <button type="submit" className="btn-primary"
              disabled={saving || !comment.trim()}
              style={{ padding: '6px 14px', fontSize: 12 }}>
              {saving ? 'Отправка...' : 'Отправить'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
