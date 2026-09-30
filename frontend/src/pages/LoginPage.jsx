import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { loginThunk, clearError } from '../store/slices/authSlice';
import { authApi } from '../api';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [forgot, setForgot] = useState(false);
  const [fpEmail, setFpEmail] = useState('');
  const [fpDone, setFpDone] = useState(false);
  const [fpLoading, setFpLoading] = useState(false);
  const [fpError, setFpError] = useState('');

  const { loading, error } = useSelector(s => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const onChange = e => {
    dispatch(clearError());
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const onSubmit = async e => {
    e.preventDefault();
    const res = await dispatch(loginThunk(form));
    if (loginThunk.fulfilled.match(res)) navigate('/');
  };

  const onForgot = async e => {
    e.preventDefault();
    setFpLoading(true);
    setFpError('');
    try {
      await authApi.forgotPassword({ email: fpEmail });
      setFpDone(true);
    } catch (err) {
      setFpError(err.response?.data?.message || 'Ошибка. Попробуйте позже.');
    } finally {
      setFpLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 380, margin: '80px auto', padding: '0 16px' }}>
      <div className="card">
        <h2 style={{ textAlign: 'center', marginBottom: 20 }}>
          {forgot ? 'Восстановление пароля' : 'Вход'}
        </h2>

        {/* Форма входа */}
        {!forgot && (
          <>
            <form onSubmit={onSubmit}>
              <div className="form-group">
                <label>Email</label>
                <input name="email" type="email" value={form.email} onChange={onChange} required />
              </div>
              <div className="form-group">
                <label>Пароль</label>
                <input name="password" type="password" value={form.password} onChange={onChange} required />
              </div>
              {error && <p className="form-error">{error}</p>}
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? 'Загрузка...' : 'Войти'}
              </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: 12, fontSize: 13 }}>
              <span onClick={() => setForgot(true)}
                style={{ color: '#4a90e2', cursor: 'pointer' }}>
                Забыли пароль?
              </span>
            </p>
            <p style={{ textAlign: 'center', marginTop: 8, fontSize: 13, color: '#555' }}>
              Нет аккаунта?{' '}
              <Link to="/register" style={{ color: '#4a90e2' }}>Зарегистрироваться</Link>
            </p>
          </>
        )}

        {/* Форма сброса пароля */}
        {forgot && !fpDone && (
          <>
            <form onSubmit={onForgot}>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={fpEmail}
                  onChange={e => setFpEmail(e.target.value)} required />
              </div>
              {fpError && <p className="form-error">{fpError}</p>}
              <button type="submit" className="btn-primary w-full" disabled={fpLoading}>
                {fpLoading ? 'Отправка...' : 'Отправить ссылку'}
              </button>
            </form>
            <p style={{ textAlign: 'center', marginTop: 12, fontSize: 13 }}>
              <span onClick={() => setForgot(false)}
                style={{ color: '#4a90e2', cursor: 'pointer' }}>
                ← Назад
              </span>
            </p>
          </>
        )}

        {/* Успех */}
        {forgot && fpDone && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ marginBottom: 16, color: '#555' }}>
              Письмо отправлено! Проверьте почту и папку «Спам».
            </p>
            <button className="btn-ghost w-full"
              onClick={() => { setForgot(false); setFpDone(false); }}>
              Назад к входу
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
