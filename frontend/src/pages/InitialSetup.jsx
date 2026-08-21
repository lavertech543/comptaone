import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { User, Mail, Lock, ShieldCheck, AlertCircle, Eye, EyeOff, CheckCircle } from 'lucide-react';

import frame from './ip.png';
import './login.css';

export default function InitialSetup() {
  const { setupAdmin } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr(null);

    if (!fullName.trim() || !email.trim() || !password) {
      setErr('Veuillez remplir tous les champs.');
      return;
    }

    if (password !== confirmPassword) {
      setErr('Les mots de passe ne correspondent pas.');
      return;
    }

    if (password.length < 6) {
      setErr('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setBusy(true);
    try {
      await setupAdmin(fullName, email, password);
    } catch (e) {
      setErr(e.message || 'Une erreur est survenue lors de la création du compte.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-container">
      <div className="login-card" style={{ maxWidth: '440px' }}>

        {/* En-tête avec Logo et badge Première Connexion */}
        <div className="login-header">
          <img src={frame} alt="N&K SARL Logo" className="login-logo" />
          <h2>ComptaOne</h2>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(59, 130, 246, 0.1)',
            color: '#2563eb',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '0.85rem',
            fontWeight: '600',
            marginTop: '8px'
          }}>
            <ShieldCheck size={16} />
            Initialisation du système
          </div>
          <p className="sub" style={{ marginTop: '6px' }}>
            Création du compte Administrateur principal
          </p>
        </div>

        {/* Formulaire de création */}
        <form onSubmit={handleSubmit} className="login-form">
          {err && (
            <div className="alert alert-error">
              <AlertCircle size={18} className="alert-icon" />
              <span>{err}</span>
            </div>
          )}

          <div className="field">
            <label htmlFor="fullName">Nom complet</label>
            <div className="input-wrapper">
              <User size={18} className="input-icon" />
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="ex. Jean Dupont"
                autoFocus
                required
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="email">Adresse Email Administrateur</label>
            <div className="input-wrapper">
              <Mail size={18} className="input-icon" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@ferme-nk.com"
                required
              />
            </div>
            <small style={{ color: '#6b7280', fontSize: '0.78rem', marginTop: '3px' }}>
              Cet email vous servira d'identifiant de connexion administrateur.
            </small>
          </div>

          <div className="field">
            <label htmlFor="password">Mot de passe</label>
            <div className="input-wrapper">
              <Lock size={18} className="input-icon" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                className="btn-toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="field">
            <label htmlFor="confirmPassword">Confirmer le mot de passe</label>
            <div className="input-wrapper">
              <Lock size={18} className="input-icon" />
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button className="btn-login" type="submit" disabled={busy}>
            {busy ? (
              <span>Création du compte en cours…</span>
            ) : (
              <>
                <CheckCircle size={18} />
                <span>Créer le compte Administrateur</span>
              </>
            )}
          </button>
        </form>

        <footer className="login-footer">
          <p>© {new Date().getFullYear()} ComptaOne • Configuration initiale</p>
        </footer>

      </div>
    </div>
  );
}
