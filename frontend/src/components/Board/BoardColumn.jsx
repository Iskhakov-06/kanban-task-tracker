import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import TaskCard from './TaskCard';

export default function BoardColumn({ column, tasks, onAddTask, onTaskClick, onDeleteColumn, onDeleteTask }) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');

  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  const handleAdd = async e => {
    e.preventDefault();
    if (!title.trim()) return;
    await onAddTask(column.id, title.trim());
    setTitle('');
    setAdding(false);
  };

  return (
    <div style={{
      width: 260,
      flexShrink: 0,
      background: '#f8f9fa',
      border: isOver ? '2px solid #4a90e2' : '1px solid #ddd',
      borderRadius: 6,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Шапка колонки */}
      <div style={{
        padding: '10px 12px',
        borderBottom: '1px solid #ddd',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#fff',
        borderRadius: '6px 6px 0 0',
      }}>
        <span style={{ fontWeight: 'bold', fontSize: 13 }}>
          {column.title} ({tasks.length})
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => setAdding(true)}
            style={{ background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer', color: '#555', padding: '0 4px' }}
            title="Добавить задачу"
          >+</button>
          <button
            onClick={() => onDeleteColumn(column.id)}
            style={{ background: 'transparent', border: 'none', fontSize: 13, cursor: 'pointer', color: '#aaa', padding: '0 4px' }}
            title="Удалить колонку"
          >✕</button>
        </div>
      </div>

      {/* Задачи */}
      <div ref={setNodeRef} style={{ padding: 8, flex: 1, minHeight: 40 }}>
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
              onDelete={onDeleteTask}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && !adding && (
          <p style={{ color: '#aaa', fontSize: 12, textAlign: 'center', padding: '8px 0' }}>
            Нет задач
          </p>
        )}
      </div>

      {/* Форма добавления */}
      {adding ? (
        <form onSubmit={handleAdd} style={{ padding: '6px 8px 8px', borderTop: '1px solid #ddd' }}>
          <input
            autoFocus
            placeholder="Название задачи..."
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Escape' && setAdding(false)}
            style={{ marginBottom: 6 }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="submit" className="btn-primary" style={{ padding: '5px 10px', fontSize: 12 }}>
              Добавить
            </button>
            <button type="button" className="btn-ghost" onClick={() => setAdding(false)}
              style={{ padding: '5px 10px', fontSize: 12 }}>
              Отмена
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          style={{
            background: 'transparent',
            border: 'none',
            borderTop: '1px solid #ddd',
            padding: '8px',
            color: '#888',
            fontSize: 12,
            cursor: 'pointer',
            borderRadius: '0 0 6px 6px',
            width: '100%',
            textAlign: 'left',
          }}
        >
          + Добавить задачу
        </button>
      )}
    </div>
  );
}
