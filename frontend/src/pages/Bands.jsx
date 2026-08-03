import React, { useEffect, useState } from 'react';
import '../styles.css';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Modal, Table, StatusTag, useForm } from '../components/ui.jsx';
import { fmtNum, fmtFCFA, fmtDate, today } from '../util.js';
import { 
  Layers, 
  Plus, 
  Lock, 
  AlertCircle, 
  Building2, 
  Calendar, 
  Check, 
  X,
  XCircle,
  Hash,
  Truck,
  Coins,
  FileText,
  Calculator,
  Info
} from 'lucide-react';

export default function Bands() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [modal, setModal] = useState(false);
  const [err, setErr] = useState(null);

  const load = () => api.get('/bands').then(setRows).catch(e => setErr(e.message));

  useEffect(() => { 
    load(); 
    api.get('/buildings').then(setBuildings).catch(() => {}); 
  }, []);

  async function close(r) { 
    if (!confirm(`Clôturer définitivement la bande ${r.numero} ? Aucune modification ne sera plus possible.`)) return;
    try { 
      await api.post(`/bands/${r.id}/close`); 
      load(); 
    } catch (e) { 
      setErr(e.message); 
    } 
  }

  return (
    <div className="page-container">
      {/* HEADER DE PAGE */}
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-icon icon-emerald">
            <Layers size={24} />
          </div>
          <div>
            <h2>Bandes & Lots de production</h2>
            <p className="sub-text">Suivi du cycle de vie des lots, mortalités et états de clôture.</p>
          </div>
        </div>

        {user?.role === 'admin' && (
          <button className="btn-primary" onClick={() => setModal(true)}>
            <Plus size={18} />
            <span>Ouvrir une bande</span>
          </button>
        )}
      </div>

      {err && (
        <div className="alert alert-error">
          <AlertCircle size={18} />
          <span>{err}</span>
        </div>
      )}

      {/* TABLEAU DES BANDES */}
      <div className="card-panel">
        <Table
          columns={[
            {
              key: 'numero',
              label: 'N° bande',
              render: r => (
                <span className="font-semibold text-slate-800 font-mono">
                  {r.numero}
                </span>
              )
            },
            {
              key: 'batiment',
              label: 'Bâtiment',
              render: r => (
                <div className="flex items-center gap-2 text-slate-700">
                  <Building2 size={15} className="text-slate-400" />
                  <span>{r.batiment || '—'}</span>
                </div>
              )
            },
            {
              key: 'date_arrivee',
              label: 'Arrivée',
              render: r => (
                <div className="flex items-center gap-1.5 text-slate-600 font-mono text-xs">
                  <Calendar size={14} className="text-slate-400" />
                  <span>{fmtDate(r.date_arrivee)}</span>
                </div>
              )
            },
            {
              key: 'nb_poussins',
              label: 'Poussins',
              render: r => <span className="font-mono">{fmtNum(r.nb_poussins)}</span>
            },
            {
              key: 'effectif_vivant',
              label: 'Vivants',
              render: r => (
                <span className="font-mono font-semibold text-emerald-600">
                  {fmtNum(r.effectif_vivant)}
                </span>
              )
            },
            {
              key: 'total_morts',
              label: 'Morts',
              render: r => (
                <span className={`font-mono ${r.total_morts > 0 ? 'text-rose-600 font-medium' : 'text-slate-400'}`}>
                  {fmtNum(r.total_morts)}
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
          actions={user?.role === 'admin' ? (r) => (
            r.statut === 'ouverte' ? (
              <button className="btn-table-danger" onClick={() => close(r)} title="Clôturer la bande">
                <XCircle size={15} />
                <span>Clôturer</span>
              </button>
            ) : (
              <span className="archived-lock-badge">
                <Lock size={13} />
                <span>Archivée</span>
              </span>
            )
          ) : null}
        />
      </div>

      {/* MODAL CRÉATION BANDE */}
      {modal && (
        <BandModal 
          buildings={buildings} 
          onClose={() => setModal(false)} 
          onSaved={() => { setModal(false); load(); }} 
          setErr={setErr} 
        />
      )}
    </div>
  );
}

function BandModal({ buildings, onClose, onSaved, setErr }) {
  const [f, set] = useForm({ 
    numero: `BANDE-${new Date().getFullYear()}-`, 
    building_id: '', 
    date_arrivee: today(), 
    fournisseur: '', 
    nb_poussins: '', 
    prix_achat: '', 
    observations: '' 
  });
  const [busy, setBusy] = useState(false);

  // Calcul dynamique du coût unitaire
  const count = parseFloat(f.nb_poussins) || 0;
  const totalCost = parseFloat(f.prix_achat) || 0;
  const unitCost = count > 0 && totalCost > 0 ? (totalCost / count).toFixed(1) : 0;

  async function save() { 
    setBusy(true);
    try { 
      await api.post('/bands', {
        ...f,
        nb_poussins: parseFloat(f.nb_poussins) || 0,
        prix_achat: parseFloat(f.prix_achat) || 0
      }); 
      onSaved(); 
    } catch (e) { 
      setErr(e.message); 
      setBusy(false); 
    } 
  }

  return (
    <Modal 
      title={<div> <h2>Ouvrir une nouvelle bande</h2> </div>}
      onClose={onClose}
      footer={
        <div className="modal-actions-right">
          <button className="btn-secondary" onClick={onClose} disabled={busy} >
            <X size={14} />
            <span >Annuler</span>
          </button>
          <button className="btn-primary" onClick={save} disabled={busy}>
            <Check size={16} />
            <span>{busy ? 'Ouverture…' : 'Ouvrir la bande'}</span>
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
        
        {/* LIGNE 1 : Identifiant et Bâtiment */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label className="input-label">Numéro de bande</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Hash size={15} style={{ position: 'absolute', left: '0.75rem', color: '#94a3b8', pointerEvents: 'none', zIndex: 1 }} />
              <input 
                type="text" 
                value={f.numero} 
                onChange={set('numero')} 
                placeholder="Ex: BANDE-2026-01" 
                className="styled-input font-mono"
                autoFocus 
              />
            </div>
          </div>

          <div>
            <label className="input-label">Bâtiment d'accueil</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Building2 size={15} style={{ position: 'absolute', left: '0.75rem', color: '#94a3b8', pointerEvents: 'none', zIndex: 1 }} />
              <select 
                value={f.building_id} 
                onChange={set('building_id')}
                className="styled-input"
                style={{ appearance: 'none', cursor: 'pointer' }}
              >
                <option value="">— Choisir un bâtiment —</option>
                {buildings.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.nom} (Capacité: {fmtNum(b.capacite)})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* LIGNE 2 : Date et Fournisseur */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label className="input-label">Date d'arrivée</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Calendar size={15} style={{ position: 'absolute', left: '0.75rem', color: '#94a3b8', pointerEvents: 'none', zIndex: 1 }} />
              <input 
                type="date" 
                value={f.date_arrivee} 
                onChange={set('date_arrivee')} 
                className="styled-input font-mono"
              />
            </div>
          </div>

          <div>
            <label className="input-label">Fournisseur / Couvoir</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Truck size={15} style={{ position: 'absolute', left: '0.75rem', color: '#94a3b8', pointerEvents: 'none', zIndex: 1 }} />
              <input 
                type="text" 
                value={f.fournisseur} 
                onChange={set('fournisseur')} 
                placeholder="Ex: Couvoir du Centre" 
                className="styled-input"
              />
            </div>
          </div>
        </div>

        {/* LIGNE 3 : Volume, Coût total et Indicateur unitaire */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label className="input-label">Nombre de poussins</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Layers size={15} style={{ position: 'absolute', left: '0.75rem', color: '#94a3b8', pointerEvents: 'none', zIndex: 1 }} />
              <input 
                type="number" 
                value={f.nb_poussins} 
                onChange={set('nb_poussins')} 
                placeholder="0" 
                className="styled-input font-mono"
                style={{ paddingRight: '3.5rem' }}
              />
              <span className="input-unit">têtes</span>
            </div>
          </div>

          <div>
            <label className="input-label">Prix d'achat global</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Coins size={15} style={{ position: 'absolute', left: '0.75rem', color: '#94a3b8', pointerEvents: 'none', zIndex: 1 }} />
              <input 
                type="number" 
                value={f.prix_achat} 
                onChange={set('prix_achat')} 
                placeholder="0" 
                className="styled-input font-mono"
                style={{ paddingRight: '4.5rem' }}
              />
              <span className="input-unit">FCFA</span>
            </div>
          </div>
        </div>

        {/* KPI INDICATEUR / CALCULATEUR AUTO */}
        {unitCost > 0 && (
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '0.6rem',
            padding: '0.65rem 0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.8rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748b' }}>
              <Calculator size={15} className="text-blue-600" />
              <span>Coût unitaire estimé :</span>
            </div>
            <span className="font-mono font-semibold" style={{ color: '#0f172a' }}>
              {fmtNum(unitCost)} FCFA <span style={{ color: '#94a3b8', fontWeight: 400 }}>/ poussin</span>
            </span>
          </div>
        )}

        {/* REMARQUES */}
        <div>
          <label className="input-label">Observations / Remarques</label>
          <div style={{ position: 'relative' }}>
            <textarea 
              rows="3" 
              value={f.observations} 
              onChange={set('observations')} 
              placeholder="Notes sur la qualité du lot, conditions de transport, état sanitaire à la livraison..."
              className="styled-input"
              style={{ paddingLeft: '0.75rem', paddingTop: '0.6rem', resize: 'vertical' }}
            />
          </div>
        </div>

      </div>
    </Modal>
  );
}