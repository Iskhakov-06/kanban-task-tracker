import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api';

export default function RegisterPage() {
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onChange = e => {
    setError('');
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const onSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.register(form);
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  if (done) return (
    <div style={{ maxWidth: 380, margin: '80px auto', padding: '0 16px' }}>
      <div className="card" style={{ textAlign: 'center' }}>
        <h2 style={{ marginBottom: 12 }}>Проверьте почту</h2>
        <p style={{ color: '#555', marginBottom: 16 }}>
          Мы отправили письмо на <b>{form.email}</b>. Подтвердите email чтобы войти.
        </p>
        <button className="btn-primary w-full" onClick={() => navigate('/login')}>
          Войти
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 380, margin: '80px auto', padding: '0 16px' }}>
      <div className="card">
        <h2 style={{ textAlign: 'center', marginBottom: 20 }}>Регистрация</h2>
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label>Имя пользователя</label>
            <input name="username" value={form.username} onChange={onChange} required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input name="email" type="email" value={form.email} onChange={onChange} required />
          </div>
          <div className="form-group">
            <label>Пароль</label>
            <input name="password" type="password"
              placeholder="Мин. 8 символов, 1 заглавная, 1 цифра"
              value={form.password} onChange={onChange} required />
          </div>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Загрузка...' : 'Зарегистрироваться'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 12, fontSize: 13, color: '#555' }}>
          Уже есть аккаунт?{' '}
          <Link to="/login" style={{ color: '#4a90e2' }}>Войти</Link>
        </p>
      </div>
    </div>
  );
}
