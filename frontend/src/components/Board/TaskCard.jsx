import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function TaskCard({ task, onClick, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', task },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onClick}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        background: '#fff',
        border: '1px solid #ddd',
        borderRadius: 4,
        padding: '8px 10px',
        marginBottom: 6,
        cursor: 'grab',
        userSelect: 'none',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 6,
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, marginBottom: 4 }}>{task.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className={`priority priority-${task.priority}`}>{task.priority}</span>
          {task.assignee && (
            <span style={{ fontSize: 11, color: '#888' }}>
              👤 {task.assignee.username}
            </span>
          )}
          {task.due_date && (
            <span style={{ fontSize: 11, color: '#888' }}>
              📅 {new Date(task.due_date).toLocaleDateString('ru')}
            </span>
          )}
        </div>
      </div>

      {onDelete && (
        <button
          onClick={e => { e.stopPropagation(); onDelete(task.id); }}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#ccc',
            fontSize: 14,
            cursor: 'pointer',
            padding: '0 2px',
            lineHeight: 1,
            flexShrink: 0,
          }}
          title="Удалить"
        >
          ✕
        </button>
      )}
    </div>
  );
}
