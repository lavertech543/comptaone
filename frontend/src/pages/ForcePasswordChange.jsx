import { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import LogoutConfirmModal from '../components/LogoutConfirmModal.jsx';
import { Lock, AlertCircle, ShieldAlert, LogOut, CheckCircle2 } from 'lucide-react';

export default function ForcePasswordChange() {
  const { user, completePasswordChange, logout } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr(null);
    if (newPassword !== confirm) {
      setErr('Les mots de passe ne correspondent pas.');
      return;
    }
    setBusy(true);
    try {
      await api.post('/auth/change-password', { oldPassword, newPassword });
      completePasswordChange();
    } catch (e) {
      setErr(e.response?.data?.message || e.message || 'Une erreur est survenue.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="force-pwd-wrapper">
      <style>{`
        .force-pwd-wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          padding: 1.25rem;
          box-sizing: border-box;
        }

        .force-pwd-card {
          background: #ffffff;
          width: 100%;
          max-width: 440px;
          border-radius: 16px;
          box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04);
          padding: 2.5rem 2rem;
          border: 1px solid rgba(226, 232, 240, 0.8);
          box-sizing: border-box;
        }

        .header-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          margin-bottom: 1.75rem;
        }

        .icon-badge {
          width: 48px;
          height: 48px;
          background-color: #fffbeb;
          border: 1px solid #fef3c7;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
          color: #d97706;
        }

        .title {
          margin: 0 0 0.5rem 0;
          font-size: 1.35rem;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -0.02em;
        }

        .subtitle {
          margin: 0;
          font-size: 0.875rem;
          color: #64748b;
          line-height: 1.5;
        }

        .alert-error {
          display: flex;
          align-items: flex-start;
          gap: 0.625rem;
          background-color: #fef2f2;
          border: 1px solid #fee2e2;
          color: #991b1b;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          font-size: 0.84rem;
          margin-bottom: 1.5rem;
          line-height: 1.4;
        }

        .field-group {
          display: flex;
          flex-direction: column;
          gap: 1.125rem;
          margin-bottom: 1.5rem;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }

        .field label {
          font-size: 0.8125rem;
          font-weight: 600;
          color: #334155;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 0.875rem;
          color: #94a3b8;
          pointer-events: none;
          transition: color 0.15s ease;
        }

        .input-wrapper input {
          width: 100%;
          padding: 0.6875rem 0.875rem 0.6875rem 2.5rem;
          font-size: 0.9375rem;
          color: #0f172a;
          background-color: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          outline: none;
          transition: all 0.15s ease;
          box-sizing: border-box;
        }

        .input-wrapper input:focus {
          background-color: #ffffff;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        }

        .input-wrapper input:focus + .input-icon,
        .input-wrapper input:focus ~ .input-icon {
          color: #2563eb;
        }

        .btn-submit {
          width: 100%;
          padding: 0.75rem 1rem;
          background-color: #2563eb;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        }

        .btn-submit:hover:not(:disabled) {
          background-color: #1d4ed8;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
        }

        .btn-submit:active:not(:disabled) {
          transform: translateY(1px);
        }

        .btn-submit:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .btn-logout {
          margin-top: 1.25rem;
          background: none;
          border: none;
          color: #64748b;
          font-size: 0.8125rem;
          font-weight: 500;
          cursor: pointer;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.375rem;
          padding: 0.5rem;
          border-radius: 6px;
          transition: all 0.15s ease;
        }

        .btn-logout:hover {
          color: #0f172a;
          background-color: #f1f5f9;
        }

        /* Spinner d'attente */
        .spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: #ffffff;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 480px) {
          .force-pwd-card {
            padding: 1.75rem 1.25rem;
            border-radius: 12px;
          }
        }
      `}</style>

      <div className="force-pwd-card">
        <div className="header-container">
          <div className="icon-badge">
            <ShieldAlert size={24} />
          </div>
          <h2 className="title">Sécurisez votre compte</h2>
          <p className="subtitle">
            Pour votre sécurité, vous devez définir un nouveau mot de passe avant de continuer.
          </p>
        </div>

        {err && (
          <div className="alert-error" role="alert">
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{err}</span>
          </div>
        )}

        <form onSubmit={submit}>
          <div className="field-group">
            <div className="field">
              <label htmlFor="oldPassword">Mot de passe actuel</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  id="oldPassword"
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="newPassword">Nouveau mot de passe</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 6 caractères"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="confirmPassword">Confirmer le nouveau mot de passe</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Répétez le mot de passe"
                  required
                  minLength={6}
                />
              </div>
            </div>
          </div>

          <button className="btn-submit" type="submit" disabled={busy}>
            {busy ? (
              <>
                <span className="spinner" />
                Enregistrement…
              </>
            ) : (
              'Définir mon mot de passe'
            )}
          </button>
        </form>

        <button onClick={() => setLogoutConfirm(true)} className="btn-logout" type="button">
          <LogOut size={16} />
          Se déconnecter
        </button>
      </div>

      <LogoutConfirmModal
        open={logoutConfirm}
        onClose={() => setLogoutConfirm(false)}
        onConfirm={() => { setLogoutConfirm(false); logout(); }}
        userName={user?.full_name}
      />
    </div>
  );
}