const TOKEN_KEY = 'nk_token';
const onExpire = [];
export const onSessionExpire = (cb) => onExpire.push(cb);

// VULN-20 FIX: Utilisation prioritaire de sessionStorage pour réduire l'exposition à la persistance XSS
export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
}

export function setToken(t) {
  if (t) {
    sessionStorage.setItem(TOKEN_KEY, t);
    localStorage.setItem(TOKEN_KEY, t);
  } else {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem('nk_last_activity');
    localStorage.removeItem('nk_last_activity');
  }
}

// Suivi d'activité pour déconnexion auto (4.1)
export function touchActivity() {
  const now = String(Date.now());
  sessionStorage.setItem('nk_last_activity', now);
  localStorage.setItem('nk_last_activity', now);
}

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
