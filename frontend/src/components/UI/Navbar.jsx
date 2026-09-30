import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { logoutThunk } from '../../store/slices/authSlice';
import { addToast, toast } from '../../store/slices/toastSlice';

export default function Navbar() {
  const { user } = useSelector(s => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await dispatch(logoutThunk());
    dispatch(toast.info('Вы вышли из системы'));
    navigate('/login');
  };

  return (
    <nav style={{
      background: '#fff',
      borderBottom: '1px solid #ddd',
      padding: '10px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <Link to="/" style={{ textDecoration: 'none', fontWeight: 'bold', color: '#333', fontSize: 16 }}>
        TaskFlow
      </Link>

      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className={`role-badge role-${user.role}`}>{user.role}</span>
          <span style={{ color: '#555' }}>{user.username}</span>
          <button className="btn-ghost" onClick={handleLogout}>Выйти</button>
        </div>
      )}
    </nav>
  );
}