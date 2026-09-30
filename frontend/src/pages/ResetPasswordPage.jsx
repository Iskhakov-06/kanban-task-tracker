import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authApi } from '../api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  const token = searchParams.get('token');

  const onSubmit = async e => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authApi.resetPassword({ token, ...form });
      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Ссылка недействительна или устарела');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)',
    }}>
      <div style={{
        width: 380, background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: 32,
        boxShadow: 'var(--shadow)',
      }}>
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 22, color: 'var(--accent2)', marginBottom: 6 }}>
            task<span style={{ color: 'var(--text2)' }}>flow</span>
          </div>
          <p style={{ color: 'var(--text3)', fontSize: 13 }}>Новый пароль</p>
        </div>

        {!done ? (
          <form onSubmit={onSubmit}>
            <div className="form-group">
              <label>Новый пароль</label>
              <input
                type="password"
                placeholder="Мин. 8 символов, 1 заглавная, 1 цифра"
                value={form.password}
                onChange={e => { setError(''); setForm(f => ({ ...f, password: e.target.value })); }}
                required
              />
            </div>
            <div className="form-group">
              <label>Повторите пароль</label>
              <input
                type="password"
                placeholder="••••••••"
                value={form.confirmPassword}
                onChange={e => { setError(''); setForm(f => ({ ...f, confirmPassword: e.target.value })); }}
                required
              />
            </div>

            {error && <div className="form-error" style={{ marginBottom: 12 }}>{error}</div>}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading
                ? <span className="spinner" style={{ width: 16, height: 16 }} />
                : 'Сохранить пароль'}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <h3 style={{ marginBottom: 8 }}>Пароль изменён!</h3>
            <p style={{ color: 'var(--text3)', fontSize: 13 }}>
              Перенаправляем на страницу входа...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
