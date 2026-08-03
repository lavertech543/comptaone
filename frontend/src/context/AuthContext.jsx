import { createContext, useContext, useEffect, useState } from 'react';
import { api, setToken, getToken, onSessionExpire, touchActivity } from '../api.js';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    onSessionExpire((msg) => { setUser(null); if (msg) setNotice(msg); });
    (async () => {
      if (getToken()) {
        try { const me = await api.get('/auth/me'); setUser(me.user); setPermissions(me.permissions); }
        catch { setToken(null); }
      }
      setLoading(false);
    })();
  }, []);

  // suivi activité globale
  useEffect(() => {
    const h = () => touchActivity();
    ['click','keydown','mousemove'].forEach(e => window.addEventListener(e, h));
    return () => ['click','keydown','mousemove'].forEach(e => window.removeEventListener(e, h));
  }, []);

  async function login(username, password) {
    const r = await api.post('/auth/login', { username, password });
    setToken(r.token); touchActivity(); setUser(r.user); setPermissions(r.permissions);
  }
  async function logout() {
    try { await api.post('/auth/logout'); } catch {}
    setToken(null); setUser(null); setPermissions({});
  }
  const can = (module, action='view') =>
    user?.role === 'admin' || !!permissions?.[module]?.[action];

  return (
    <AuthCtx.Provider value={{ user, permissions, loading, login, logout, can, notice, setNotice }}>
      {children}
    </AuthCtx.Provider>
  );
}
