import axios from 'axios';

const api = axios.create({
  baseURL: 'https://dairy-management-6s73.onrender.com/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
});
// ── Attach JWT to every request ───────────────────────────────
api.interceptors.request.use(config => {
  const impersonateToken = sessionStorage.getItem('amrit_impersonate_token');
  const token = impersonateToken || localStorage.getItem('amrit_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Request deduplication for GET requests ────────────────────
// If the same GET URL is already in-flight, return the same promise.
const _inflight = new Map();

const _origGet = api.get.bind(api);
api.get = (url, config) => {
  const params = config?.params ? JSON.stringify(config.params) : '';
  const key = url + params;

  if (_inflight.has(key)) return _inflight.get(key);

  const promise = _origGet(url, config).finally(() => {
    _inflight.delete(key);
  });

  _inflight.set(key, promise);
  return promise;
};

// ── Handle 401 — clear session and redirect to correct login ──
// Does NOT expose which role the user was — just clears and redirects
// to the generic /app gate which shows the subscription message.
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      if (sessionStorage.getItem('amrit_impersonate_token')) {
        sessionStorage.removeItem('amrit_impersonate_token');
        sessionStorage.removeItem('amrit_impersonate_user');
        window.location.reload();
        return Promise.reject(err);
      }

      const hadToken = !!localStorage.getItem('amrit_token');
      localStorage.removeItem('amrit_token');
      localStorage.removeItem('amrit_user');

      // Prevent redirect loops if already on root (login)
      const isAuthPage = window.location.pathname === '/';
      if (hadToken && !isAuthPage) {
        window.location.href = '/';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
