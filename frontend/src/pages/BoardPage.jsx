import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
  DndContext, DragOverlay, PointerSensor,
  useSensor, useSensors, closestCorners,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

import { boardsApi, columnsApi, tasksApi } from '../api';
import { addToast, toast } from '../store/slices/toastSlice';
import Navbar from '../components/UI/Navbar';
import BoardColumn from '../components/Board/BoardColumn';
import TaskCard from '../components/Board/TaskCard';
import TaskModal from '../components/Board/TaskModal';
import AddMemberModal from '../components/Board/AddMemberModal';

export default function BoardPage() {
  const { id: boardId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [board, setBoard] = useState(null);
  const [columns, setColumns] = useState([]);
  const [tasks, setTasks] = useState({});
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [memberModal, setMemberModal] = useState(false);
  const [addingCol, setAddingCol] = useState(false);
  const [newColTitle, setNewColTitle] = useState('');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const loadBoard = useCallback(async () => {
    try {
      const r = await boardsApi.getOne(boardId);
      const b = r.data.data;
      setBoard(b);
      const cols = (b.columns || []).slice().sort((a, z) => a.position - z.position);
      setColumns(cols);
      const taskMap = {};
      await Promise.all(cols.map(async col => {
        const tr = await tasksApi.getAll(boardId, col.id, { limit: 100 });
        taskMap[col.id] = (tr.data.data || []).slice().sort((a, z) => a.position - z.position);
      }));
      setTasks(taskMap);
    } catch { navigate('/'); }
    finally { setLoading(false); }
  }, [boardId]);

  useEffect(() => { loadBoard(); }, [loadBoard]);

  const handleAddColumn = async e => {
    e.preventDefault();
    if (!newColTitle.trim()) return;
    try {
      const r = await columnsApi.create(boardId, { title: newColTitle.trim() });
      setColumns(c => [...c, r.data.data]);
      setTasks(t => ({ ...t, [r.data.data.id]: [] }));
      setNewColTitle('');
      setAddingCol(false);
    } catch (e) {
      console.error('addColumn error:', e.response?.status, e.response?.data);
      const msg = e.response?.data?.message || 'Ошибка при создании колонки';
      dispatch(toast.error(msg));
    }
  };

  const handleAddTask = async (columnId, title) => {
    try {
      const r = await tasksApi.create(boardId, columnId, { title });
      setTasks(t => ({ ...t, [columnId]: [...(t[columnId] || []), r.data.data] }));
    } catch (e) {
      const msg = e.response?.data?.message || 'Ошибка при создании задачи';
      dispatch(toast.error(msg));
    }
  };

  const handleDeleteColumn = async columnId => {
    if (!confirm('Удалить колонку со всеми задачами?')) return;
    try {
      await columnsApi.delete(boardId, columnId);
      setColumns(c => c.filter(col => col.id !== columnId));
      setTasks(t => { const n = { ...t }; delete n[columnId]; return n; });
      dispatch(toast.success('Колонка удалена'));
    } catch (e) {
      console.error('deleteColumn error:', e.response?.status, e.response?.data);
      const msg = e.response?.data?.message || 'Ошибка при удалении колонки';
      dispatch(toast.error(msg));
    }
  };

  const handleDeleteTask = async (columnId, taskId) => {
    if (!confirm('Удалить задачу?')) return;
    try {
      await tasksApi.delete(boardId, columnId, taskId);
      setTasks(prev => ({
        ...prev,
        [columnId]: prev[columnId].filter(t => t.id !== taskId),
      }));
      dispatch(toast.success('Задача удалена'));
    } catch (e) {
      const msg = e.response?.data?.message || 'Ошибка при удалении задачи';
      dispatch(toast.error(msg));
    }
  };

  // DnD
  const findColumn = id => {
    if (tasks[id]) return id;
    for (const colId of Object.keys(tasks)) {
      if (tasks[colId].find(t => t.id === id)) return colId;
    }
    return null;
  };

  const onDragStart = ({ active }) => setActive(active);

  const onDragOver = ({ active, over }) => {
    if (!over) return;
    const fromCol = findColumn(active.id);
    const toCol = findColumn(over.id);
    if (!fromCol || !toCol || fromCol === toCol) return;
    setTasks(prev => {
      const fromTasks = [...prev[fromCol]];
      const toTasks = [...(prev[toCol] || [])];
      const idx = fromTasks.findIndex(t => t.id === active.id);
      const [moved] = fromTasks.splice(idx, 1);
      toTasks.push(moved);
      return { ...prev, [fromCol]: fromTasks, [toCol]: toTasks };
    });
  };

  const onDragEnd = async ({ active, over }) => {
    setActive(null);
    if (!over) return;
    const fromCol = findColumn(active.id);
    const toCol = findColumn(over.id);
    if (!fromCol || !toCol) return;
    if (fromCol === toCol) {
      setTasks(prev => {
        const items = [...prev[fromCol]];
        const oldIdx = items.findIndex(t => t.id === active.id);
        const newIdx = items.findIndex(t => t.id === over.id);
        if (oldIdx === newIdx) return prev;
        const sorted = arrayMove(items, oldIdx, newIdx);
        tasksApi.move(boardId, fromCol, active.id, { column_id: fromCol, position: newIdx }).catch(() => { });
        return { ...prev, [fromCol]: sorted };
      });
    } else {
      const newPos = tasks[toCol]?.findIndex(t => t.id === active.id) ?? 0;
      tasksApi.move(boardId, fromCol, active.id, { column_id: toCol, position: Math.max(0, newPos) }).catch(() => { });
    }
  };

  const activeTask = active ? Object.values(tasks).flat().find(t => t.id === active.id) : null;

  if (loading) return <div><Navbar /><p style={{ padding: 20 }}>Загрузка...</p></div>;

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Navbar />

      {/* Шапка доски */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #ddd',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <h2 style={{ fontSize: 16, flex: 1 }}>{board?.title}</h2>
        {board?.description && (
          <span style={{ color: '#888', fontSize: 13 }}>{board.description}</span>
        )}
        <span style={{ fontSize: 12, color: '#888' }}>
          {columns.length} кол. · {Object.values(tasks).flat().length} задач
        </span>
        <button className="btn-ghost" onClick={() => setMemberModal(true)}
          style={{ fontSize: 12 }}>
          + Участник
        </button>
      </div>

      {/* Колонки */}
      <DndContext sensors={sensors} collisionDetection={closestCorners}
        onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
        <div style={{
          display: 'flex',
          gap: 12,
          padding: '16px 20px',
          overflowX: 'auto',
          alignItems: 'flex-start',
          minHeight: 'calc(100vh - 110px)',
        }}>
          {columns.map(col => (
            <BoardColumn
              key={col.id}
              column={col}
              tasks={tasks[col.id] || []}
              onAddTask={handleAddTask}
              onTaskClick={t => setSelectedTask({ ...t, columnId: col.id })}
              onDeleteColumn={handleDeleteColumn}
              onDeleteTask={taskId => handleDeleteTask(col.id, taskId)}
            />
          ))}

          {/* Добавить колонку */}
          {addingCol ? (
            <form onSubmit={handleAddColumn} style={{
              width: 260, flexShrink: 0,
              background: '#fff', border: '1px solid #ddd',
              borderRadius: 6, padding: 10,
            }}>
              <input autoFocus placeholder="Название колонки"
                value={newColTitle}
                onChange={e => setNewColTitle(e.target.value)}
                onKeyDown={e => e.key === 'Escape' && setAddingCol(false)}
                style={{ marginBottom: 8 }}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="submit" className="btn-primary" style={{ padding: '5px 10px', fontSize: 12 }}>
                  Добавить
                </button>
                <button type="button" className="btn-ghost" onClick={() => setAddingCol(false)}
                  style={{ padding: '5px 10px', fontSize: 12 }}>
                  Отмена
                </button>
              </div>
            </form>
          ) : (
            <button onClick={() => setAddingCol(true)} style={{
              width: 260, flexShrink: 0,
              background: 'rgba(255,255,255,0.6)',
              border: '1px dashed #bbb',
              borderRadius: 6, padding: 12,
              color: '#888', fontSize: 13, cursor: 'pointer',
            }}>
              + Добавить колонку
            </button>
          )}
        </div>

        <DragOverlay>
          {activeTask && <TaskCard task={activeTask} onClick={() => { }} />}
        </DragOverlay>
      </DndContext>

      {/* Модал задачи */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          boardId={boardId}
          columnId={selectedTask.columnId}
          onClose={() => setSelectedTask(null)}
          onUpdate={loadBoard}
          onDelete={async () => {
            if (!confirm('Удалить задачу?')) return;
            await handleDeleteTask(selectedTask.columnId, selectedTask.id);
            setSelectedTask(null);
          }}
        />
      )}

      {/* Модал участников */}
      {memberModal && (
        <AddMemberModal
          boardId={boardId}
          onClose={() => setMemberModal(false)}
          onAdded={user => {
            dispatch(toast.success(`${user.username} добавлен на доску`));
            loadBoard();
          }}
        />
      )}
    </div>
  );
}