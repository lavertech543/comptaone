import React, { useState } from 'react';
import { api } from '../api.js';
import { Lock, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import './Login.css'; 

export default function SetPassword() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

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
      setErr(e.message || 'Une erreur est survenue.');
    } finally {
      setBusy(false);
    }
  }

  // Écran : Lien invalide
  if (!token) {
    return (
      <div className="sp-page">
        <div className="sp-card sp-card-center">
          <div className="sp-icon-wrapper sp-icon-error">
            <AlertCircle size={32} />
          </div>
          <h2>Lien invalide</h2>
          <p className="sp-sub">
            Le jeton d'activation est manquant ou à expiré. Veuillez contacter votre administrateur.
          </p>
          <a href="/" className="sp-btn sp-btn-secondary">
            <ArrowLeft size={16} />
            <span>Retour à l'accueil</span>
          </a>
        </div>
      </div>
    );
  }

  // Écran : Succès
  if (done) {
    return (
      <div className="sp-page">
        <div className="sp-card sp-card-center">
          <div className="sp-icon-wrapper sp-icon-success">
            <CheckCircle size={32} />
          </div>
          <h2>Mot de passe défini !</h2>
          <p className="sp-sub">
            Votre compte est désormais actif. Vous pouvez vous connecter à votre espace.
          </p>
          <a href="/" className="sp-btn sp-btn-primary">
            Aller à la connexion
          </a>
        </div>
      </div>
    );
  }

  // Écran : Formulaire de définition du mot de passe
  return (
    <div className="sp-page">
      <div className="sp-card">
        <div className="sp-header">
          <h2>Activation du compte</h2>
          <p className="sp-sub">Définissez votre mot de passe pour sécuriser votre accès.</p>
        </div>

        <form onSubmit={submit} className="sp-form">
          {err && (
            <div className="sp-alert">
              <AlertCircle size={18} className="sp-alert-icon" />
              <span>{err}</span>
            </div>
          )}

          <div className="sp-field">
            <label htmlFor="new-password">Nouveau mot de passe</label>
            <div className="sp-input-wrapper">
              <Lock size={18} className="sp-input-icon" />
              <input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="sp-input"
              />
            </div>
          </div>

          <div className="sp-field">
            <label htmlFor="confirm-password">Confirmer le mot de passe</label>
            <div className="sp-input-wrapper">
              <Lock size={18} className="sp-input-icon" />
              <input
                id="confirm-password"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="sp-input"
              />
            </div>
          </div>

          <button className="sp-btn sp-btn-primary" type="submit" disabled={busy}>
            {busy ? 'Enregistrement…' : 'Activer mon compte'}
          </button>
        </form>
      </div>
    </div>
  );
}