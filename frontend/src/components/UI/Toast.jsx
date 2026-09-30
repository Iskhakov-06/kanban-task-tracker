import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { removeToast } from '../../store/slices/toastSlice';

export default function ToastContainer() {
  const { items } = useSelector(s => s.toast);
  const dispatch = useDispatch();

  return (
    <div className="toast-container">
      {items.map(t => (
        <ToastItem key={t.id} toast={t} onClose={() => dispatch(removeToast(t.id))} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`toast toast-${toast.type}`}
      onClick={onClose} style={{ cursor: 'pointer' }}>
      {toast.msg}
    </div>
  );
}
