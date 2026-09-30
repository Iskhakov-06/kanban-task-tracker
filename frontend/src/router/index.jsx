import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMeThunk } from '../store/slices/authSlice';

import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import HomePage from '../pages/HomePage';
import BoardPage from '../pages/BoardPage';
import VerifyEmailPage from '../pages/VerifyEmailPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';

// Защищённый роут — редирект на /login если не авторизован
function PrivateRoute({ children }) {
  const { user, checked } = useSelector(s => s.auth);
  const location = useLocation();

  if (!checked) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  );

  return user
    ? children
    : <Navigate to="/login" state={{ from: location }} replace />;
}

// Публичный роут — редирект на / если уже авторизован
function PublicRoute({ children }) {
  const { user, checked } = useSelector(s => s.auth);
  if (!checked) return null;
  return user ? <Navigate to="/" replace /> : children;
}

export default function AppRouter() {
  const dispatch = useDispatch();

  // При старте пробуем восстановить сессию через refresh cookie
  useEffect(() => { dispatch(fetchMeThunk()); }, []);

  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/" element={<PrivateRoute><HomePage /></PrivateRoute>} />
      <Route path="/board/:id" element={<PrivateRoute><BoardPage /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
