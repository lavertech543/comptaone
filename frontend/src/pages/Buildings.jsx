import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Modal, Table, StatusTag } from '../components/ui.jsx';
import { fmtNum } from '../util.js';
import { 
  Building2, 
  Plus, 
  Edit2, 
  AlertCircle, 
  Home, 
  Check, 
  X,
  Layers,
  Activity,
  CheckCircle2
} from 'lucide-react';

const STATUTS = [
  { value: 'vide', label: 'Vide' },
  { value: 'en_production', label: 'En production' },
  { value: 'nettoye', label: 'Nettoyé' },
  { value: 'en_preparation', label: 'En préparation' },
];

export default function Buildings() {
  const { can } = useAuth();
  const [rows, setRows] = useState([]);
  const [modal, setModal] = useState(null);
  const [err, setErr] = useState(null);

  const load = () => api.get('/buildings').then(setRows).catch(e => setErr(e.message));

  useEffect(() => { load(); }, []);

  return (
    <div className="page-container">
      {/* HEADER DE PAGE */}
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-icon icon-slate">
            <Building2 size={24} />
          </div>
          <div>
            <h2>Bâtiments & Poulaillers</h2>
            <p className="sub-text">Gestion du parc immobilier, capacités et états d'occupation.</p>
          </div>
        </div>

        {can?.('batiments', 'create') && (
          <button className="btn-primary" onClick={() => setModal({})}>
            <Plus size={18} />
            <span>Nouveau bâtiment</span>
          </button>
        )}
      </div>

      {err && (
        <div className="alert alert-error">
          <AlertCircle size={18} />
          <span>{err}</span>
        </div>
      )}

      {/* PANNEAU DE TABLEAU */}
      <div className="card-panel">
        <Table
          columns={[
            {
              key: 'nom',
              label: 'Nom / Numéro',
              render: r => (
                <div className="font-semibold text-slate-800 flex items-center gap-2">
                  <Home size={16} className="text-slate-400" />
                  <span>{r.nom}</span>
                </div>
              )
            },
            {
              key: 'capacite',
              label: 'Capacité max',
              render: r => <span className="font-mono">{fmtNum(r.capacite)}</span>
            },
            {
              key: 'effectif_actuel',
              label: 'Effectif actuel',
              render: r => {
                const effectif = r.effectif_actuel || 0;
                const pct = r.capacite > 0 ? Math.min(100, Math.round((effectif / r.capacite) * 100)) : 0;
                return (
                  <div className="capacity-cell">
                    <span className="font-mono font-medium">{fmtNum(effectif)}</span>
                    <div className="capacity-bar-bg" title={`${pct}% occupé`}>
                      <div 
                        className={`capacity-bar-fill ${pct > 90 ? 'bg-rose' : pct > 75 ? 'bg-amber' : 'bg-emerald'}`} 
                        style={{ width: `${pct}%` }} 
                      />
                    </div>
                  </div>
                );
              }
            },
            {
              key: 'bandes_ouvertes',
              label: 'Bandes ouvertes',
              render: r => (
                <span className="count-pill">
                  {r.bandes_ouvertes || 0} bande(s)
                </span>
              )
            },
            {
              key: 'statut',
              label: 'Statut',
              render: r => <StatusTag value={r.statut} />
            },
          ]}
          rows={rows}
          empty="Aucun bâtiment enregistré"
          emptySub="Cliquez sur « Nouveau bâtiment » pour créer votre première infrastructure et commencer à suivre vos poulaillers."
          actions={can?.('batiments', 'edit') ? (r) => (
            <button className="btn-table-action" onClick={() => setModal(r)} title="Modifier">
              <Edit2 size={15} />
              <span>Modifier</span>
            </button>
          ) : null}
        />
      </div>

      {/* MODAL CRÉATION / ÉDITION */}
      {modal && (
        <BuildingModal 
          item={modal} 
          onClose={() => setModal(null)} 
          onSaved={() => { setModal(null); load(); }} 
          setErr={setErr} 
        />
      )}
    </div>
  );
}

function BuildingModal({ item, onClose, onSaved, setErr }) {
  const [f, setF] = useState({ 
    nom: item.nom || '', 
    capacite: item.capacite || '', 
    statut: item.statut || 'vide', 
    is_active: item.is_active ?? true 
  });
  
  const [busy, setBusy] = useState(false);

  const handleChange = (field, value) => {
    setF(prev => ({ ...prev, [field]: value }));
  };

  async function save() {
    setBusy(true);
    try {
      const payload = {
        ...f,
        capacite: parseFloat(f.capacite) || 0
      };
      if (item.id) await api.put(`/buildings/${item.id}`, payload);
      else await api.post('/buildings', payload);
      onSaved();
    } catch (e) { 
      setErr(e.message); 
      setBusy(false); 
    }
  }

  return (
    <Modal 
      title={item.id ? 'Modifier le bâtiment' : 'Nouveau bâtiment'} 
      onClose={onClose}
      footer={
        <div className="modal-actions-right">
          <button className="btn-secondary" onClick={onClose} disabled={busy}>
            <X size={16} />
            <span>Annuler</span>
          </button>
          <button className="btn-primary" onClick={save} disabled={busy}>
            <Check size={16} />
            <span>{busy ? 'Enregistrement…' : (item.id ? 'Mettre à jour' : 'Créer le bâtiment')}</span>
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* NOM DU BÂTIMENT */}
        <div>
          <label className="input-label">Nom ou Numéro du bâtiment</label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Building2 size={15} style={{ position: 'absolute', left: '0.75rem', color: '#94a3b8', pointerEvents: 'none', zIndex: 1 }} />
            <input 
              type="text" 
              value={f.nom} 
              onChange={e => handleChange('nom', e.target.value)} 
              placeholder="Ex: Poulailler A1, Bâtiment Ouest..." 
              className="styled-input"
              autoFocus 
            />
          </div>
        </div>

        {/* CAPACITÉ MAXIMALE */}
        <div>
          <label className="input-label">Capacité maximale d'accueil</label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Layers size={15} style={{ position: 'absolute', left: '0.75rem', color: '#94a3b8', pointerEvents: 'none', zIndex: 1 }} />
            <input 
              type="number" 
              value={f.capacite} 
              onChange={e => handleChange('capacite', e.target.value)} 
              placeholder="0" 
              className="styled-input font-mono"
              style={{ paddingRight: '4.5rem' }}
            />
            <span className="input-unit">sujets</span>
          </div>
        </div>

        {/* STATUT DE L'INSTALLATION */}
        <div>
          <label className="input-label" style={{ marginBottom: '0.5rem' }}>Statut opérationnel</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
            {STATUTS.map(s => {
              const selected = f.statut === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => handleChange('statut', s.value)}
                  style={{
                    padding: '0.55rem 0.75rem',
                    borderRadius: '0.5rem',
                    border: selected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                    backgroundColor: selected ? '#eff6ff' : '#ffffff',
                    color: selected ? '#1e40af' : '#475569',
                    fontSize: '0.8rem',
                    fontWeight: selected ? 600 : 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>{s.label}</span>
                  {selected && <CheckCircle2 size={15} className="text-blue-600" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* ÉTAT ACTIF / INACTIF */}
        <div style={{ 
          marginTop: '0.25rem',
          padding: '0.75rem 0.85rem', 
          backgroundColor: '#f8fafc', 
          border: '1px solid #e2e8f0', 
          borderRadius: '0.6rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={16} style={{ color: f.is_active ? '#10b981' : '#94a3b8' }} />
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a' }}>
                Bâtiment disponible
              </div>
              <div style={{ fontSize: '0.725rem', color: '#64748b' }}>
                Permet d'affecter de nouvelles bandes à cette installation.
              </div>
            </div>
          </div>

          <label style={{ position: 'relative', display: 'inline-block', width: '36px', height: '20px', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={f.is_active} 
              onChange={e => handleChange('is_active', e.target.checked)}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: f.is_active ? '#2563eb' : '#cbd5e1',
              borderRadius: '20px',
              transition: '0.2s',
              display: 'block'
            }}>
              <span style={{
                position: 'absolute',
                content: '""',
                height: '14px',
                width: '14px',
                left: f.is_active ? '18px' : '3px',
                bottom: '3px',
                backgroundColor: '#ffffff',
                borderRadius: '50%',
                transition: '0.2s'
              }} />
            </span>
          </label>
        </div>

      </div>
    </Modal>
  );
}