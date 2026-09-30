import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authApi } from '../api';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) { setStatus('error'); setMessage('Токен не найден'); return; }

    authApi.verifyEmail(token)  
      .then(() => {
        setStatus('success');
        setTimeout(() => navigate('/login'), 3000);
      })
      .catch(err => {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Ссылка недействительна или устарела');
      });
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        width: 380, background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: 32, textAlign: 'center',
        boxShadow: 'var(--shadow)',
      }}>
        {status === 'loading' && (
          <>
            <span className="spinner" style={{ width: 32, height: 32, margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--text3)' }}>Подтверждаем email...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <h3 style={{ marginBottom: 8 }}>Email подтверждён!</h3>
            <p style={{ color: 'var(--text3)', fontSize: 13 }}>
              Перенаправляем на страницу входа...
            </p>
          </>
        )}
        {status === 'error' && (
          <>
            <div style={{ fontSize: 40, marginBottom: 12 }}>❌</div>
            <h3 style={{ marginBottom: 8 }}>Ошибка</h3>
            <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 20 }}>{message}</p>
            <button className="btn-primary w-full" onClick={() => navigate('/login')}>
              На страницу входа
            </button>
          </>
        )}
      </div>
    </div>
  );
}