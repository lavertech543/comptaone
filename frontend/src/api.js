const TOKEN_KEY = 'nk_token';
let inactivityTimer = null;
const onExpire = [];
export const onSessionExpire = (cb) => onExpire.push(cb);

export function getToken() { return localStorage.getItem(TOKEN_KEY); }
export function setToken(t) { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); }

// Suivi d'activité pour déconnexion auto (4.1)
export function touchActivity() { localStorage.setItem('nk_last_activity', String(Date.now())); }

async function req(method, path, body, isForm) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = 'Bearer ' + token;
  headers['x-last-activity'] = localStorage.getItem('nk_last_activity') || String(Date.now());
  let opts = { method, headers };
  if (body && !isForm) { headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  if (body && isForm) opts.body = body;
  const res = await fetch('/api' + path, opts);
  touchActivity();
  if (res.status === 440) { setToken(null); onExpire.forEach(f => f('Session expirée pour inactivité')); throw new Error('Session expirée'); }
  if (res.status === 401) { setToken(null); onExpire.forEach(f => f()); }
  if (!res.ok) {
    let msg = 'Erreur';
    try { msg = (await res.json()).error || msg; } catch {}
    throw new Error(msg);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res;
}

export const api = {
  get: (p) => req('GET', p),
  post: (p, b) => req('POST', p, b),
  put: (p, b) => req('PUT', p, b),
  del: (p) => req('DELETE', p),
  upload: (p, form) => req('POST', p, form, true),
};
