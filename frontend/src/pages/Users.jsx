import React, { useEffect, useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Shield, 
  KeyRound, 
  Edit3, 
  Check, 
  X, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Mail,
  User as UserIcon,
  ShieldCheck,
  Lock,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { api } from '../api.js';
import { Modal, Table, useForm } from '../components/ui.jsx';
import { fmtDateTime } from '../util.js';

const ROLES = [
  ['admin', 'Administrateur'],
  ['production', 'Production'],
  ['magasinier', 'Magasinier'],
  ['comptable', 'Comptable'],
  ['responsable', 'Responsable'],
  ['veterinaire','Vétérinaire']
];

const MODULES = [
  'utilisateurs', 'batiments', 'bandes', 'production', 'alimentation', 
  'mortalite', 'sanitaire', 'stocks', 'achats', 'ventes', 
  'depenses', 'comptabilite', 'creances', 'salaires', 'rapports', 'audit', 'corrections'
];

const ROLE_COLORS = {
  admin: { bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' },
  production: { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' },
  magasinier: { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  comptable: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  responsable: { bg: '#fef2f2', color: '#dc2626', border: '#fecdd3' },
  veterinaire: { bg: '#ecfeff', color: '#0891b2', border: '#a5f3fc' },
};

const ACTIONS = [
  ['can_view', 'Voir'],
  ['can_create', 'Créer'],
  ['can_edit', 'Modifier'],
  ['can_delete', 'Suppr.'],
  ['can_print', 'Imprimer'],
  ['can_export', 'Exporter']
];

/* --- STYLES CSS RESPONSIVE & TYPOGRAPHIE --- */
const USERS_ENHANCED_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap');

.users-wrapper {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  color: #0f172a;
}

.users-font-mono {
  font-family: 'JetBrains Mono', monospace !important;
}

.users-page-header {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

@media (min-width: 640px) {
  .users-page-header {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
}

/* Bouton Fintech */
.btn-fintech-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background-color: #2563eb;
  color: #ffffff;
  font-weight: 600;
  font-size: 0.875rem;
  padding: 0.625rem 1.25rem;
  border-radius: 0.6rem;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
  box-shadow: 0 1px 2px rgba(37, 99, 235, 0.2);
  width: 100%;
}

@media (min-width: 640px) {
  .btn-fintech-primary {
    width: auto;
  }
}

.btn-fintech-primary:hover:not(:disabled) {
  background-color: #1d4ed8;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}

.btn-fintech-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  background-color: #ffffff;
  color: #334155;
  font-weight: 500;
  font-size: 0.8rem;
  padding: 0.4rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid #cbd5e1;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-fintech-secondary:hover {
  background-color: #f8fafc;
  border-color: #94a3b8;
  color: #0f172a;
}

/* Cartes Mobile Utilisateurs */
.users-mobile-cards {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

@media (min-width: 768px) {
  .users-mobile-cards {
    display: none;
  }
}

.users-desktop-table {
  display: none;
}

@media (min-width: 768px) {
  .users-desktop-table {
    display: block;
    background-color: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 0.85rem;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0,0,0,0.02);
  }
}

.user-card {
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 0.85rem;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.03);
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.user-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.user-card-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding-top: 0.75rem;
  border-top: 1px solid #f1f5f9;
}

.user-card-actions button {
  flex: 1 1 calc(50% - 0.25rem);
}

/* Form Styling */
.form-grid-2 {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 640px) {
  .form-grid-2 {
    grid-template-columns: 1fr 1fr;
  }
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.field-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #334155;
}

.field-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.field-icon {
  position: absolute;
  left: 0.75rem;
  color: #94a3b8;
  pointer-events: none;
}

.field-input {
  width: 100%;
  padding: 0.6rem 0.75rem 0.6rem 2.25rem;
  border-radius: 0.5rem;
  border: 1px solid #cbd5e1;
  font-size: 0.875rem;
  font-family: inherit;
  color: #0f172a;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.field-input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

/* Matrice des droits responsive */
.perms-desktop-view {
  display: none;
}
.perms-mobile-view {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

@media (min-width: 640px) {
  .perms-desktop-view {
    display: block;
    overflow-x: auto;
    border: 1px solid #e2e8f0;
    border-radius: 0.65rem;
  }
  .perms-mobile-view {
    display: none;
  }
}

.perms-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.825rem;
}

.perms-table th {
  background-color: #f8fafc;
  padding: 0.75rem;
  text-align: center;
  font-weight: 600;
  color: #475569;
  border-bottom: 1px solid #e2e8f0;
}

.perms-table td {
  padding: 0.65rem 0.75rem;
  border-bottom: 1px solid #f1f5f9;
}

.perms-module-card {
  border: 1px solid #e2e8f0;
  border-radius: 0.6rem;
  background-color: #ffffff;
  overflow: hidden;
}

.perms-module-header {
  padding: 0.75rem 1rem;
  background-color: #f8fafc;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.875rem;
  text-transform: capitalize;
}

.perms-module-body {
  padding: 0.75rem 1rem;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.65rem;
  border-top: 1px solid #e2e8f0;
  background-color: #ffffff;
}

.perm-toggle-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: #334155;
  cursor: pointer;
}
`;

// Badge de Statut
function StatusBadge({ statut }) {
  const isActive = statut === 'actif' || statut === true;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.35rem',
      padding: '0.2rem 0.55rem',
      borderRadius: '9999px',
      fontSize: '0.725rem',
      fontWeight: 600,
      backgroundColor: isActive ? '#ecfdf5' : '#fef2f2',
      color: isActive ? '#047857' : '#b91c1c',
      border: `1px solid ${isActive ? '#a7f3d0' : '#fecdd3'}`
    }}>
      <span style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        backgroundColor: isActive ? '#10b981' : '#f43f5e'
      }} />
      <span>{isActive ? 'Actif' : 'Inactif'}</span>
    </span>
  );
}

// Badge de Rôle
function RoleBadge({ role }) {
  const roleObj = ROLES.find(x => x[0] === role);
  const roleLabel = roleObj ? roleObj[1] : role;
  const style = ROLE_COLORS[role] || { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };

  return (
    <span className="users-font-mono" style={{
      fontSize: '0.725rem',
      fontWeight: 600,
      padding: '0.2rem 0.55rem',
      borderRadius: '0.375rem',
      backgroundColor: style.bg,
      color: style.color,
      border: `1px solid ${style.border}`,
      display: 'inline-block'
    }}>
      {roleLabel}
    </span>
  );
}

export default function User() {
  const [rows, setRows] = useState([]);
  const [modal, setModal] = useState(null);
  const [perms, setPerms] = useState(null);
  const [err, setErr] = useState(null);

  const load = () => api.get('/users').then(setRows).catch(e => setErr(e.message));

  useEffect(() => { load(); }, []);

  async function openPerms(u) {
    try {
      const p = await api.get(`/users/${u.id}/permissions`);
      const map = Object.fromEntries(p.map(x => [x.module, x]));
      setPerms({
        user: u,
        rows: MODULES.map(m => map[m] || {
          module: m,
          can_view: false,
          can_create: false,
          can_edit: false,
          can_delete: false,
          can_print: false,
          can_export: false
        })
      });
    } catch (e) {
      setErr(e.message);
    }
  }

  async function resetPw(u) {
    const p = prompt(`Nouveau mot de passe pour ${u.username}:`);
    if (p) {
      try {
        await api.post(`/users/${u.id}/reset-password`, { password: p });
        alert('Mot de passe réinitialisé avec succès.');
      } catch (e) {
        setErr(e.message);
      }
    }
  }

  async function resendActivation(u) {
    try {
      await api.post(`/users/${u.id}/resend-activation`);
      alert(`Nouveau lien d'activation envoyé à ${u.email}.`);
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div className="users-wrapper" style={{ padding: '1.25rem', maxWidth: '1400px', margin: '0 auto' }}>
      <style>{USERS_ENHANCED_CSS}</style>

      {/* HEADER DE LA PAGE */}
      <div className="users-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.65rem', backgroundColor: '#eff6ff', borderRadius: '0.75rem', color: '#2563eb', flexShrink: 0 }}>
            <Users size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>
                Utilisateurs & Droits
              </h2>
              <span className="users-font-mono" style={{ fontSize: '0.7rem', fontWeight: 600, backgroundColor: '#eff6ff', color: '#2563eb', padding: '0.15rem 0.5rem', borderRadius: '0.375rem', border: '1px solid #bfdbfe' }}>
                Administration
              </span>
            </div>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.825rem', color: '#64748b' }}>
              Gestion des comptes d'accès, rôles et permissions modulaires.
            </p>
          </div>
        </div>

        <button 
          type="button" 
          className="btn-fintech-primary"
          onClick={() => setModal({})}
        >
          <UserPlus size={16} />
          <span>Nouvel utilisateur</span>
        </button>
      </div>

      {err && (
        <div style={{ padding: '0.85rem 1rem', backgroundColor: '#fef2f2', border: '1px solid #fecdd3', borderRadius: '0.75rem', marginBottom: '1.25rem', color: '#991b1b', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} />
          <span>{err}</span>
        </div>
      )}

      {/* AFFICHAGE DESKTOP (TABLEAU) */}
      <div className="users-desktop-table">
        <Table 
          rows={rows} 
          empty="Aucun utilisateur enregistré."
          columns={[
            {
              key: 'username',
              label: 'Identifiant',
              render: r => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: '#0f172a' }}>
                  <UserIcon size={14} style={{ color: '#64748b' }} />
                  <span className="users-font-mono">{r.username}</span>
                </div>
              )
            },
            {
              key: 'full_name',
              label: 'Nom complet',
              render: r => <span style={{ fontWeight: 500, color: '#334155' }}>{r.full_name || '—'}</span>
            },
            {
              key: 'role',
              label: 'Rôle',
              render: r => <RoleBadge role={r.role} />
            },
            {
              key: 'is_active',
              label: 'État',
              render: r => <StatusBadge statut={r.is_active} />
            },
            {
              key: 'is_activated',
              label: 'Activation',
              render: r => r.is_activated ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#059669', fontSize: '0.775rem', fontWeight: 600 }}>
                  <CheckCircle2 size={14} />
                  <span>Activé</span>
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#d97706', fontSize: '0.775rem', fontWeight: 600 }}>
                  <Clock size={14} />
                  <span>En attente</span>
                </span>
              )
            },
            {
              key: 'last_login',
              label: 'Dernière connexion',
              render: r => (
                <div className="users-font-mono" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748b', fontSize: '0.775rem' }}>
                  <Clock size={13} style={{ color: '#94a3b8' }} />
                  <span>{r.last_login ? fmtDateTime(r.last_login) : 'Jamais'}</span>
                </div>
              )
            },
          ]}
          actions={(r) => (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <button type="button" className="btn-fintech-secondary" onClick={() => openPerms(r)}>
                <Shield size={13} style={{ color: '#2563eb' }} />
                <span>Droits</span>
              </button>
              <button type="button" className="btn-fintech-secondary" onClick={() => setModal(r)}>
                <Edit3 size={13} style={{ color: '#475569' }} />
                <span>Éditer</span>
              </button>
              {!r.is_activated && r.email && (
                <button type="button" className="btn-fintech-secondary" onClick={() => resendActivation(r)}>
                  <Mail size={13} style={{ color: '#0891b2' }} />
                  <span>Lien</span>
                </button>
              )}
              {r.is_activated && (
                <button type="button" className="btn-fintech-secondary" onClick={() => resetPw(r)}>
                  <KeyRound size={13} style={{ color: '#d97706' }} />
                  <span>MDP</span>
                </button>
              )}
            </div>
          )}
        />
      </div>

      {/* AFFICHAGE MOBILE (CARTES) */}
      <div className="users-mobile-cards">
        {rows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', backgroundColor: '#ffffff', borderRadius: '0.85rem', color: '#64748b', fontSize: '0.875rem' }}>
            Aucun utilisateur enregistré.
          </div>
        ) : (
          rows.map(r => (
            <div key={r.id || r.username} className="user-card">
              <div className="user-card-header">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span className="users-font-mono" style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>{r.username}</span>
                    <StatusBadge statut={r.is_active} />
                  </div>
                  <div style={{ fontSize: '0.825rem', color: '#475569', marginTop: '0.15rem' }}>
                    {r.full_name || 'Nom non renseigné'}
                  </div>
                </div>
                <RoleBadge role={r.role} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.775rem', color: '#64748b', borderTop: '1px solid #f8fafc', paddingTop: '0.5rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  {r.is_activated ? <CheckCircle2 size={13} style={{ color: '#059669' }} /> : <Clock size={13} style={{ color: '#d97706' }} />}
                  {r.is_activated ? 'Activé' : 'En attente'}
                </span>
                <span className="users-font-mono">
                  Dernière co: {r.last_login ? fmtDateTime(r.last_login) : 'Jamais'}
                </span>
              </div>

              <div className="user-card-actions">
                <button type="button" className="btn-fintech-secondary" onClick={() => openPerms(r)}>
                  <Shield size={13} style={{ color: '#2563eb' }} />
                  <span>Droits</span>
                </button>
                <button type="button" className="btn-fintech-secondary" onClick={() => setModal(r)}>
                  <Edit3 size={13} style={{ color: '#475569' }} />
                  <span>Éditer</span>
                </button>
                {!r.is_activated && r.email && (
                  <button type="button" className="btn-fintech-secondary" onClick={() => resendActivation(r)}>
                    <Mail size={13} style={{ color: '#0891b2' }} />
                    <span>Lien</span>
                  </button>
                )}
                {r.is_activated && (
                  <button type="button" className="btn-fintech-secondary" onClick={() => resetPw(r)}>
                    <KeyRound size={13} style={{ color: '#d97706' }} />
                    <span>MDP</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {modal && <UserModal item={modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} setErr={setErr} />}
      {perms && <PermsModal data={perms} onClose={() => setPerms(null)} onSaved={() => setPerms(null)} setErr={setErr} />}
    </div>
  );
}

// MODAL DE CRÉATION / ÉDITION D'UTILISATEUR
function UserModal({ item, onClose, onSaved, setErr }) {
  const isNew = !item.id;
  const [f, set] = useForm({
    username: item.username || '',
    full_name: item.full_name || '',
    email: item.email || '',
    role: item.role || 'production',
    password: '',
    is_active: item.is_active ?? true
  });
  const [busy, setBusy] = useState(false);

  async function save(e) {
    if (e) e.preventDefault();
    setBusy(true);
    try {
      if (isNew) await api.post('/users', f);
      else await api.put(`/users/${item.id}`, f);
      onSaved();
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  }

  const modalHeaderTitle = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.6rem', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
        {isNew ? <UserPlus size={18} /> : <Edit3 size={18} />}
      </div>
      <div>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
          {isNew ? 'Nouvel utilisateur' : 'Modifier le compte'}
        </h3>
        <p style={{ margin: '0.1rem 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
          {isNew ? 'Saisissez les identifiants pour créer un accès' : `Modifications des paramètres de ${item.username}`}
        </p>
      </div>
    </div>
  );

  return (
    <Modal 
      title={modalHeaderTitle} 
      onClose={onClose}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', width: '100%' }}>
          <button type="button" className="btn-fintech-secondary" onClick={onClose}>
            <X size={15} />
            <span>Annuler</span>
          </button>
          <button type="button" className="btn-fintech-primary" onClick={save} disabled={busy}>
            <Check size={15} />
            <span>{busy ? 'Enregistrement…' : 'Enregistrer'}</span>
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.25rem 0' }}>
        <div className="form-grid-2">
          <div className="field-group">
            <label className="field-label">Identifiant de connexion</label>
            <div className="field-input-wrap">
              <UserIcon size={16} className="field-icon" />
              <input 
                type="text" 
                className="field-input users-font-mono" 
                value={f.username} 
                onChange={set('username')} 
                disabled={!isNew}
                placeholder="ex: j.dupont"
                autoFocus={isNew}
              />
            </div>
          </div>

          <div className="field-group">
            <label className="field-label">Rôle système</label>
            <div className="field-input-wrap">
              <ShieldCheck size={16} className="field-icon" />
              <select className="field-input" value={f.role} onChange={set('role')}>
                {ROLES.map(r => (
                  <option key={r[0]} value={r[0]}>{r[1]}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="field-group">
          <label className="field-label">Nom complet</label>
          <div className="field-input-wrap">
            <UserIcon size={16} className="field-icon" />
            <input 
              type="text" 
              className="field-input" 
              value={f.full_name} 
              onChange={set('full_name')} 
              placeholder="ex: Jean Dupont"
            />
          </div>
        </div>

        <div className="field-group">
          <label className="field-label">Adresse E-mail</label>
          <div className="field-input-wrap">
            <Mail size={16} className="field-icon" />
            <input 
              type="email" 
              className="field-input" 
              value={f.email} 
              onChange={set('email')} 
              placeholder="ex: j.dupont@entreprise.cm"
            />
          </div>
        </div>

        {isNew && (
          <div className="field-group">
            <label className="field-label">Mot de passe temporaire</label>
            <div className="field-input-wrap">
              <Lock size={16} className="field-icon" style={{ color: '#d97706' }} />
              <input 
                type="password" 
                className="field-input" 
                value={f.password} 
                onChange={set('password')} 
                placeholder="••••••••"
              />
            </div>
          </div>
        )}

        {!isNew && (
          <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.6rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.825rem', fontWeight: 600, color: '#334155' }}>
              <input 
                type="checkbox" 
                style={{ width: '1rem', height: '1rem', accentColor: '#2563eb' }} 
                checked={f.is_active} 
                onChange={set('is_active')} 
              />
              <span>Compte actif et autorisé à se connecter</span>
            </label>
          </div>
        )}

        <div style={{ padding: '0.75rem', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.6rem', fontSize: '0.775rem', color: '#1e40af', lineHeight: 1.4 }}>
          💡 <strong>Note :</strong> Les droits d'accès initiaux découlent du rôle choisi. Vous pourrez affiner les accès par module via le bouton <strong>« Droits »</strong>.
        </div>
      </div>
    </Modal>
  );
}

// MODAL DE MATRICE DES PERMISSIONS (Tableau Desktop + Accordéon Mobile)
function PermsModal({ data, onClose, onSaved, setErr }) {
  const [rows, setRows] = useState(data.rows);
  const [busy, setBusy] = useState(false);
  const [openModule, setOpenModule] = useState(null);

  const toggle = (i, k) => setRows(rows.map((r, j) => j === i ? { ...r, [k]: !r[k] } : r));

  async function save() {
    setBusy(true);
    try {
      await api.put(`/users/${data.user.id}/permissions`, { permissions: rows });
      onSaved();
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  }

  const modalHeaderTitle = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.6rem', backgroundColor: '#f5f3ff', border: '1px solid #ddd6fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6d28d9', flexShrink: 0 }}>
        <Shield size={18} />
      </div>
      <div>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
          Droits — {data.user.full_name || data.user.username}
        </h3>
        <p style={{ margin: '0.1rem 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
          Définissez les autorisations granulaires par module.
        </p>
      </div>
    </div>
  );

  return (
    <Modal 
      title={modalHeaderTitle} 
      onClose={onClose}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', width: '100%' }}>
          <button type="button" className="btn-fintech-secondary" onClick={onClose}>
            <X size={15} />
            <span>Fermer</span>
          </button>
          <button type="button" className="btn-fintech-primary" onClick={save} disabled={busy}>
            <Check size={15} />
            <span>{busy ? 'Mise à jour…' : 'Enregistrer'}</span>
          </button>
        </div>
      }
    >
      {/* VUE TABLEAU DESKTOP */}
      <div className="perms-desktop-view">
        <table className="perms-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left', paddingLeft: '1rem' }}>Module</th>
              {ACTIONS.map(a => (
                <th key={a[0]}>{a[1]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.module} style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                <td style={{ paddingLeft: '1rem', fontWeight: 600, color: '#0f172a', textTransform: 'capitalize' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Layers size={13} style={{ color: '#94a3b8' }} />
                    <span>{r.module}</span>
                  </div>
                </td>
                {ACTIONS.map(a => (
                  <td key={a[0]} style={{ textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      style={{ width: '1.05rem', height: '1.05rem', cursor: 'pointer', accentColor: '#2563eb' }} 
                      checked={!!r[a[0]]} 
                      onChange={() => toggle(i, a[0])}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* VUE ACCORDÉON MOBILE */}
      <div className="perms-mobile-view">
        {rows.map((r, i) => {
          const isOpen = openModule === r.module;
          const activeCount = ACTIONS.filter(a => !!r[a[0]]).length;

          return (
            <div key={r.module} className="perms-module-card">
              <div 
                className="perms-module-header"
                onClick={() => setOpenModule(isOpen ? null : r.module)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Layers size={15} style={{ color: '#64748b' }} />
                  <span>{r.module}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.725rem', backgroundColor: activeCount > 0 ? '#eff6ff' : '#f1f5f9', color: activeCount > 0 ? '#2563eb' : '#64748b', padding: '0.15rem 0.5rem', borderRadius: '0.375rem', fontWeight: 600 }}>
                    {activeCount}/{ACTIONS.length}
                  </span>
                  {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>

              {isOpen && (
                <div className="perms-module-body">
                  {ACTIONS.map(a => (
                    <label key={a[0]} className="perm-toggle-item">
                      <input 
                        type="checkbox" 
                        style={{ width: '1rem', height: '1rem', accentColor: '#2563eb' }} 
                        checked={!!r[a[0]]} 
                        onChange={() => toggle(i, a[0])}
                      />
                      <span>{a[1]}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}