import React, { useState, useMemo } from 'react';
import { api } from '../api.js';
import { Lock, CheckCircle, AlertCircle, ArrowLeft, Eye, EyeOff, ShieldCheck, Check, X } from 'lucide-react';

const componentStyles = `
.sp-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 50% 0%, #e0e7ff 0%, #f1f5f9 50%, #e2e8f0 100%);
  font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  padding: 24px;
  color: #0f172a;
  box-sizing: border-box;
}
.sp-card {
  width: 100%;
  max-width: 440px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 24px;
  padding: 40px 32px;
  box-shadow: 0 20px 40px -15px rgba(15, 23, 42, 0.08), 0 0 30px rgba(99, 102, 241, 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.sp-card-center {
  text-align: center;
}
.sp-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: rgba(99, 102, 241, 0.08);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 100px;
  color: #4f46e5;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 20px;
}
.sp-header {
  margin-bottom: 28px;
  text-align: center;
}
.sp-title {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #0f172a;
  margin: 0 0 8px 0;
}
.sp-sub {
  color: #64748b;
  font-size: 14px;
  line-height: 1.5;
  margin: 0;
}
.sp-icon-wrapper {
  width: 64px;
  height: 64px;
  border-radius: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px auto;
}
.sp-icon-error {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.2);
}
.sp-icon-success {
  background: rgba(34, 197, 94, 0.1);
  color: #16a34a;
  border: 1px solid rgba(34, 197, 94, 0.2);
}
.sp-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.sp-alert {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 14px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #dc2626;
  font-size: 13px;
  line-height: 1.4;
}
.sp-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sp-label {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.sp-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}
.sp-input-icon {
  position: absolute;
  left: 14px;
  color: #94a3b8;
  transition: color 0.2s ease;
  pointer-events: none;
}
.sp-input {
  width: 100%;
  padding: 13px 44px 13px 44px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 14px;
  color: #0f172a;
  font-size: 15px;
  outline: none;
  transition: all 0.2s ease;
  box-sizing: border-box;
}
.sp-input::placeholder {
  color: #94a3b8;
}
.sp-input:focus {
  background: #ffffff;
  border-color: #6366f1;
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15);
}
.sp-input-wrapper:focus-within .sp-input-icon {
  color: #4f46e5;
}
.sp-toggle-btn {
  position: absolute;
  right: 12px;
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 6px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}
.sp-toggle-btn:hover {
  color: #334155;
  background: rgba(15, 23, 42, 0.05);
}
.sp-strength-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
}
.sp-strength-bars {
  display: flex;
  gap: 4px;
  height: 4px;
}
.sp-strength-bar {
  flex: 1;
  height: 100%;
  border-radius: 2px;
  background: #e2e8f0;
  transition: background 0.3s ease;
}
.sp-strength-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #64748b;
}
.sp-match-tag {
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
}
.sp-match-tag.valid {
  color: #16a34a;
}
.sp-match-tag.invalid {
  color: #dc2626;
}
.sp-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px 24px;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: none;
  margin-top: 6px;
}
.sp-btn-primary {
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  color: #ffffff;
  box-shadow: 0 4px 14px rgba(79, 70, 229, 0.25);
}
.sp-btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(79, 70, 229, 0.35);
}
.sp-btn-primary:active:not(:disabled) {
  transform: translateY(0);
}
.sp-btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.sp-btn-secondary {
  background: #ffffff;
  color: #334155;
  border: 1px solid #cbd5e1;
}
.sp-btn-secondary:hover {
  background: #f8fafc;
  color: #0f172a;
}
.sp-loader {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: sp-spin 0.8s linear infinite;
}
@keyframes sp-spin {
  to { transform: rotate(360deg); }
}
`;

export default function SetPassword() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [err, setErr] = useState(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const strength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: '' };
    let score = 0;
    if (password.length >= 8) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { score: 1, label: 'Faible', color: '#ef4444' };
    if (score <= 3) return { score: 2, label: 'Moyen', color: '#f59e0b' };
    return { score: 3, label: 'Robuste', color: '#16a34a' };
  }, [password]);

  const isMatching = confirm.length > 0 && password === confirm;
  const isMismatch = confirm.length > 0 && password !== confirm;

  async function submit(e) {
    e.preventDefault();
    setErr(null);

    if (password !== confirm) {
      setErr('Les mots de passe ne correspondent pas.');
      return;
    }

    setBusy(true);
    try {
      await api.post('/auth/set-password', { token, password });
      setDone(true);
    } catch (e) {
      setErr(e.message || "Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setBusy(false);
    }
  }

  // Écran : Lien invalide ou expiré
  if (!token) {
    return (
      <main className="sp-page">
        <style>{componentStyles}</style>
        <div className="sp-card sp-card-center">
          <div className="sp-icon-wrapper sp-icon-error">
            <AlertCircle size={32} />
          </div>
          <h2 className="sp-title">Lien invalide</h2>
          <p className="sp-sub">
            Le jeton d'activation est manquant ou a expiré. Veuillez contacter votre administrateur pour obtenir un nouveau lien.
          </p>
          <a href="/" className="sp-btn sp-btn-secondary" style={{ marginTop: '24px' }}>
            <ArrowLeft size={18} />
            <span>Retour à l'accueil</span>
          </a>
        </div>
      </main>
    );
  }

  // Écran : Confirmation / Succès
  if (done) {
    return (
      <main className="sp-page">
        <style>{componentStyles}</style>
        <div className="sp-card sp-card-center">
          <div className="sp-icon-wrapper sp-icon-success">
            <CheckCircle size={32} />
          </div>
          <h2 className="sp-title">Compte activé !</h2>
          <p className="sp-sub">
            Votre mot de passe a été défini avec succès. Vous pouvez maintenant vous connecter à votre espace personnel.
          </p>
          <a href="/" className="sp-btn sp-btn-primary" style={{ marginTop: '24px' }}>
            <span>Aller à la connexion</span>
          </a>
        </div>
      </main>
    );
  }

  // Écran : Formulaire
  return (
    <main className="sp-page">
      <style>{componentStyles}</style>
      <div className="sp-card">
        <div className="sp-header">
          <div className="sp-badge">
            <ShieldCheck size={16} />
            <span>Espace Sécurisé</span>
          </div>
          <h2 className="sp-title">Activation du compte</h2>
          <p className="sp-sub">Définissez votre mot de passe pour finaliser la création de votre compte.</p>
        </div>

        <form onSubmit={submit} className="sp-form">
          {err && (
            <div className="sp-alert">
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{err}</span>
            </div>
          )}

          {/* Champ Nouveau mot de passe */}
          <div className="sp-field">
            <label htmlFor="new-password" className="sp-label">
              <span>Nouveau mot de passe</span>
            </label>
            <div className="sp-input-wrapper">
              <Lock size={18} className="sp-input-icon" />
              <input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="sp-input"
              />
              <button
                type="button"
                className="sp-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Indicateur de force */}
            {password.length > 0 && (
              <div className="sp-strength-container">
                <div className="sp-strength-bars">
                  <div
                    className="sp-strength-bar"
                    style={{ background: strength.score >= 1 ? strength.color : undefined }}
                  />
                  <div
                    className="sp-strength-bar"
                    style={{ background: strength.score >= 2 ? strength.color : undefined }}
                  />
                  <div
                    className="sp-strength-bar"
                    style={{ background: strength.score >= 3 ? strength.color : undefined }}
                  />
                </div>
                <div className="sp-strength-meta">
                  <span>Force du mot de passe :</span>
                  <span style={{ color: strength.color, fontWeight: 600 }}>{strength.label}</span>
                </div>
              </div>
            )}
          </div>

          {/* Champ Confirmation du mot de passe */}
          <div className="sp-field">
            <label htmlFor="confirm-password" className="sp-label">
              <span>Confirmer le mot de passe</span>
              {isMatching && (
                <span className="sp-match-tag valid">
                  <Check size={14} /> Identiques
                </span>
              )}
              {isMismatch && (
                <span className="sp-match-tag invalid">
                  <X size={14} /> Différents
                </span>
              )}
            </label>
            <div className="sp-input-wrapper">
              <Lock size={18} className="sp-input-icon" />
              <input
                id="confirm-password"
                type={showConfirm ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="sp-input"
              />
              <button
                type="button"
                className="sp-toggle-btn"
                onClick={() => setShowConfirm(!showConfirm)}
                tabIndex={-1}
                aria-label={showConfirm ? 'Masquer la confirmation' : 'Afficher la confirmation'}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button className="sp-btn sp-btn-primary" type="submit" disabled={busy}>
            {busy ? <div className="sp-loader" /> : 'Activer mon compte'}
          </button>
        </form>
      </div>
    </main>
  );
}