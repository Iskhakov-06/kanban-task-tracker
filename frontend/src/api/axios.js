import axios from 'axios';

let accessToken = null;

export const setToken   = (t) => { accessToken = t; };
export const getToken   = ()  => accessToken;
export const clearToken = () => { accessToken = null; };

// ── Очередь запросов во время обновления токена ───────
// Пока идёт один /auth/refresh, все остальные 401 встают в очередь
// и ждут результата — не запускают свой refresh параллельно
let isRefreshing = false;
let waitingQueue  = [];  // [{ resolve, reject }, ...]

const processQueue = (error, token = null) => {
  waitingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else       resolve(token);
  });
  waitingQueue = [];
};

// ─────────────────────────────────────────────────────
const api = axios.create({
  baseURL:         '/api',
  withCredentials: true,
});

// Добавляем access токен к каждому запросу
api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    // Ошибки самого /auth/refresh не перехватываем — иначе рекурсия
    if (original.url?.includes('/auth/refresh')) {
      clearToken();
      return Promise.reject(err);
    }

    if (err.response?.status !== 401 || original._retry) {
      return Promise.reject(err);
    }

    // Если уже идёт обновление — ставим запрос в очередь
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        waitingQueue.push({ resolve, reject });
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }).catch(() => Promise.reject(err));
    }

    // Запускаем обновление токена — только один раз
    original._retry  = true;
    isRefreshing     = true;

    try {
      const { data } = await axios.post('/api/auth/refresh', {}, { withCredentials: true });
      const newToken  = data.data.accessToken;

      setToken(newToken);
      original.headers.Authorization = `Bearer ${newToken}`;

      // Разблокируем всю очередь с новым токеном
      processQueue(null, newToken);

      return api(original);
    } catch (refreshErr) {
      // Refresh не удался — отклоняем всю очередь
      processQueue(refreshErr, null);
      clearToken();
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;