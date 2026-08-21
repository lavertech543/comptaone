import { createContext, useContext, useEffect, useState } from 'react';
import { api, setToken, getToken, onSessionExpire, touchActivity } from '../api.js';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    onSessionExpire((msg) => { setUser(null); if (msg) setNotice(msg); });
    (async () => {
      try {
        const setupRes = await api.get('/auth/setup-status');
        if (setupRes && setupRes.setupRequired) {
          setSetupRequired(true);
        } else if (getToken()) {
          const me = await api.get('/auth/me');
          setUser(me.user);
          setPermissions(me.permissions);
        }
      } catch (err) {
        if (getToken()) {
          try {
            const me = await api.get('/auth/me');
            setUser(me.user);
            setPermissions(me.permissions);
          } catch {
            setToken(null);
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const h = () => touchActivity();
    ['click','keydown','mousemove'].forEach(e => window.addEventListener(e, h));
    return () => ['click','keydown','mousemove'].forEach(e => window.removeEventListener(e, h));
  }, []);

  async function login(username, password) {
    const r = await api.post('/auth/login', { username, password });
    setToken(r.token); touchActivity(); setUser(r.user); setPermissions(r.permissions);
  }

  async function setupAdmin(fullName, email, password) {
    const r = await api.post('/auth/setup-admin', { fullName, email, password });
    setToken(r.token);
    touchActivity();
    setUser(r.user);
    setPermissions(r.permissions);
    setSetupRequired(false);
  }

  async function logout() {
    try { await api.post('/auth/logout'); } catch {}
    setToken(null); setUser(null); setPermissions({});
  }

  async function completePasswordChange() {
    setUser(prev => prev ? { ...prev, must_change_password: false } : prev);
  }

  const can = (module, action='view') =>
    user?.role === 'admin' || !!permissions?.[module]?.[action];

  return (
    <AuthCtx.Provider value={{ user, permissions, loading, setupRequired, login, setupAdmin, logout, can, notice, setNotice, completePasswordChange }}>
      {children}
    </AuthCtx.Provider>
  );
}