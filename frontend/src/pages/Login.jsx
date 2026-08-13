import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { User, Lock, LogIn, AlertCircle, Info, Eye, EyeOff } from 'lucide-react';

import logoNk from './photo.png';
import frame from './ip.png';
import './Login.css'; // Importation de ton fichier CSS responsive

export default function Login() {
  const { login, notice } = useAuth();
  const [username, setU] = useState('');
  const [password, setP] = useState('');
  const [showPassword, setShowPassword] = useState(false); // État pour la visibilité
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault(); 
    setErr(null); 
    setBusy(true);
    try { 
      await login(username, password); 
    } catch (e) { 
      setErr(e.message); 
    } finally { 
      setBusy(false); 
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        
        {/* En-tête avec Logo */}
        <div className="login-header">
          <img src={frame} alt="N&K SARL Logo" className="login-logo" />
          <h2>ComptaOne</h2>
          <p className="sub">Portail de gestion & comptabilité</p>
        </div>

        {/* Formulaire */}
        <form onSubmit={submit} className="login-form">
          {notice && (
            <div className="alert alert-info">
              <Info size={18} className="alert-icon" />
              <span>{notice}</span>
            </div>
          )}

          {err && (
            <div className="alert alert-error">
              <AlertCircle size={18} className="alert-icon" />
              <span>{err}</span>
            </div>
          )}

          <div className="field">
            <label htmlFor="username">Identifiant</label>
            <div className="input-wrapper">
              <User size={18} className="input-icon" />
              <input 
                id="username"
                type="text" 
                value={username} 
                onChange={e => setU(e.target.value)} 
                placeholder="Nom d'utilisateur"
                autoFocus 
                required 
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="password">Mot de passe</label>
            <div className="input-wrapper">
              <Lock size={18} className="input-icon" />
              <input 
                id="password"
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={e => setP(e.target.value)} 
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

          <button className="btn-login" type="submit" disabled={busy}>
            {busy ? (
              <span>Connexion en cours…</span>
            ) : (
              <>
                <LogIn size={18} />
                <span>Se connecter</span>
              </>
            )}
          </button>
        </form>

        <footer className="login-footer">
          <p>© {new Date().getFullYear()} ComptaOne • Tous droits réservés</p>
        </footer>

      </div>
    </div>
  );
}