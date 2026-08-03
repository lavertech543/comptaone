import React, { useEffect, useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  RefreshCw, 
  User, 
  Layers, 
  Clock, 
  AlertCircle, 
  X,
  Activity,
  Database,
  KeyRound,
  FileText
} from 'lucide-react';
import './responsive.css';
import { api } from '../api.js';
import { Table } from '../components/ui.jsx';
import { fmtDateTime } from '../util.js';

// Composant Bouton interactif autonome avec gestion interne du hover & active
function FilterButton({ onClick, isLoading }) {
  const [hovered, setHovered] = useState(false);
  const [active, setActive] = useState(false);

  let backgroundColor = '#2563eb';
  let transform = 'none';
  let boxShadow = '0 1px 2px rgba(37, 99, 235, 0.2)';

  if (active) {
    backgroundColor = '#1e3a8a';
    transform = 'scale(0.98)';
  } else if (hovered) {
    backgroundColor = '#1d4ed8';
    transform = 'translateY(-1px)';
    boxShadow = '0 4px 12px rgba(37, 99, 235, 0.35)';
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setActive(false); }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      style={{
        padding: '0.55rem 1rem',
        borderRadius: '0.6rem',
        border: 'none',
        backgroundColor: isLoading ? '#94a3b8' : backgroundColor,
        color: '#ffffff',
        fontSize: '0.825rem',
        fontWeight: '600',
        cursor: isLoading ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        transition: 'all 0.15s ease-in-out',
        transform: transform,
        boxShadow: boxShadow
      }}
    >
      <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
      <span>{isLoading ? 'Chargement...' : 'Filtrer'}</span>
    </button>
  );
}

// Badge visuel dynamique selon le type d'action
function ActionBadge({ action }) {
  const act = (action || '').toUpperCase();
  let badgeStyle = {
    bg: '#f1f5f9',
    color: '#475569',
    border: '#cbd5e1',
    dot: '#64748b'
  };

  if (act.includes('CREATE') || act.includes('ADD') || act.includes('AJOUT')) {
    badgeStyle = { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0', dot: '#10b981' };
  } else if (act.includes('UPDATE') || act.includes('EDIT') || act.includes('MODIF')) {
    badgeStyle = { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', dot: '#3b82f6' };
  } else if (act.includes('DELETE') || act.includes('SUPPR') || act.includes('REMOVE')) {
    badgeStyle = { bg: '#fef2f2', color: '#b91c1c', border: '#fecdd3', dot: '#f43f5e' };
  } else if (act.includes('LOGIN') || act.includes('AUTH') || act.includes('CONNEXION')) {
    badgeStyle = { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe', dot: '#8b5cf6' };
  }

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.35rem',
      padding: '0.2rem 0.6rem',
      borderRadius: '9999px',
      fontSize: '0.725rem',
      fontWeight: '600',
      backgroundColor: badgeStyle.bg,
      color: badgeStyle.color,
      border: `1px solid ${badgeStyle.border}`,
      fontFamily: 'JetBrains Mono, monospace'
    }}>
      <span style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        backgroundColor: badgeStyle.dot
      }} />
      {action}
    </span>
  );
}

export default function Audit() {
  const [rows, setRows] = useState([]);
  const [f, setF] = useState({ module: '', action: '', user: '' });
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    setErr(null);
    const q = new URLSearchParams(Object.entries(f).filter(([, v]) => v.trim() !== '')).toString();
    api.get('/audit' + (q ? '?' + q : ''))
      .then(res => setRows(res || []))
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { 
    load(); 
  }, []);

  const handleResetFilters = () => {
    setF({ module: '', action: '', user: '' });
  };

  const hasActiveFilters = Boolean(f.module || f.action || f.user);

  return (
    <div style={{ padding: '1.5rem', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* HEADER DE PAGE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.6rem', backgroundColor: '#eff6ff', borderRadius: '0.75rem', color: '#2563eb' }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', tracking: '-0.02em' }}>
                Journal d'audit
              </h2>
              <span style={{ 
                fontFamily: 'JetBrains Mono, monospace', 
                fontSize: '0.7rem', 
                fontWeight: 600, 
                backgroundColor: '#f1f5f9', 
                color: '#475569', 
                padding: '0.15rem 0.5rem', 
                borderRadius: '0.375rem',
                border: '1px solid #e2e8f0'
              }}>
                Sécurité & Traçabilité
              </span>
            </div>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.825rem', color: '#64748b' }}>
              Historique en temps réel des actions et modifications effectuées sur le système.
            </p>
          </div>
        </div>
      </div>

      {/* BARRE DE FILTRES FINTECH */}
      <div style={{ 
        backgroundColor: '#ffffff', 
        border: '1px solid #e2e8f0', 
        borderRadius: '0.85rem', 
        padding: '1rem 1.25rem', 
        marginBottom: '1.25rem',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
          {/* Champ Utilisateur */}
          <div style={{ position: 'relative', flex: '1 1 180px' }}>
            <User size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text"
              placeholder="Utilisateur..." 
              value={f.user} 
              onChange={e => setF({ ...f, user: e.target.value })}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem 0.5rem 2.25rem',
                borderRadius: '0.5rem',
                border: '1px solid #cbd5e1',
                fontSize: '0.825rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Champ Module */}
          <div style={{ position: 'relative', flex: '1 1 160px' }}>
            <Layers size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text"
              placeholder="Module..." 
              value={f.module} 
              onChange={e => setF({ ...f, module: e.target.value })}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem 0.5rem 2.25rem',
                borderRadius: '0.5rem',
                border: '1px solid #cbd5e1',
                fontSize: '0.825rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Action / Boutons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                style={{
                  padding: '0.55rem 0.75rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#f8fafc',
                  color: '#64748b',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
              >
                <X size={14} />
                <span>Effacer</span>
              </button>
            )}

            <FilterButton onClick={load} isLoading={loading} />
          </div>
        </div>
      </div>

      {/* ERREUR */}
      {err && (
        <div style={{ 
          padding: '0.85rem 1rem', 
          backgroundColor: '#fef2f2', 
          border: '1px solid #fecdd3', 
          borderRadius: '0.75rem', 
          marginBottom: '1.25rem',
          color: '#991b1b',
          fontSize: '0.825rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertCircle size={16} />
          <span>{err}</span>
        </div>
      )}

      {/* TABLEAU DES ENTRÉES D'AUDIT */}
      <div style={{ 
        backgroundColor: '#ffffff', 
        border: '1px solid #e2e8f0', 
        borderRadius: '0.85rem', 
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <Table 
          rows={rows} 
          empty="Aucune entrée dans le journal d'audit." 
          columns={[
            {
              key: 'created_at',
              label: 'Date & heure',
              render: r => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#475569', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.775rem' }}>
                  <Clock size={13} style={{ color: '#94a3b8' }} />
                  <span>{fmtDateTime(r.created_at)}</span>
                </div>
              )
            },
            {
              key: 'username',
              label: 'Utilisateur',
              render: r => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: '#0f172a' }}>
                  <User size={13} style={{ color: '#64748b' }} />
                  <span>{r.username || r.user || 'Système'}</span>
                </div>
              )
            },
            {
              key: 'action',
              label: 'Action',
              render: r => <ActionBadge action={r.action} />
            },
            {
              key: 'module',
              label: 'Module',
              render: r => (
                <span style={{ 
                  fontSize: '0.75rem', 
                  fontWeight: 600, 
                  color: '#334155',
                  backgroundColor: '#f1f5f9',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '0.35rem'
                }}>
                  {r.module || 'Général'}
                </span>
              )
            },
            {
              key: 'details',
              label: 'Détails',
              render: r => (
                <span style={{ fontSize: '0.825rem', color: '#64748b', wordBreak: 'break-word' }}>
                  {r.details || '—'}
                </span>
              )
            },
          ]}
        />
      </div>
    </div>
  );
}