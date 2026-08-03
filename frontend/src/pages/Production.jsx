import React, { useEffect, useState } from 'react';
import './type.css';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Modal, Table } from '../components/ui.jsx';
import { fmtNum, fmtDate, today } from '../util.js';
import { 
  Utensils, 
  Skull, 
  Syringe, 
  Plus, 
  AlertCircle, 
  Calendar, 
  Layers, 
  Check, 
  X,
  Activity,
  Wheat,
  Package,
  Sun,
  Sunset,
  Sunrise,
  Sparkles,
  RotateCcw,
  Egg,
  TrendingUp,
  Feather,
  Calculator,
  CheckCircle2
} from 'lucide-react';

const TABS = [
  { key: 'feedings', label: 'Alimentation', module: 'alimentation', path: '/production/feedings', icon: Utensils },
  { key: 'mortalities', label: 'Mortalité', module: 'mortalite', path: '/production/mortalities', icon: Skull },
  { key: 'treatments', label: 'Sanitaire / Soins', module: 'sanitaire', path: '/production/treatments', icon: Syringe },
];

const TYPES_ALIMENT = [
  { id: 'demarrage', label: 'Démarrage', desc: 'S1 à S3', icon: Feather },
  { id: 'croissance', label: 'Croissance', desc: 'S4 à S6', icon: TrendingUp },
  { id: 'finition', label: 'Finition', desc: 'S7+', icon: Package },
  { id: 'pondeuse', label: 'Pondeuse', desc: 'Période de ponte', icon: Egg },
  { id: 'autre', label: 'Autre / Spécial', desc: 'Saisie libre', icon: Sparkles }
];

const MOMENTS = [
  { value: 'matin', label: 'Matin', detail: '06h - 10h', icon: Sunrise },
  { value: 'midi', label: 'Midi', detail: '12h - 14h', icon: Sun },
  { value: 'soir', label: 'Soir', detail: '16h - 18h', icon: Sunset }
];

const QUICK_ADD_KG = [5, 10, 25, 50];

export default function Production() {
  const { can } = useAuth();
  const avail = TABS.filter(t => can(t.module, 'view'));
  const [tab, setTab] = useState(avail[0]?.key || 'feedings');
  const [rows, setRows] = useState([]);
  const [bands, setBands] = useState([]);
  const [modal, setModal] = useState(false);
  const [err, setErr] = useState(null);

  const active = TABS.find(t => t.key === tab) || TABS[0];

  const load = () => api.get(active.path).then(setRows).catch(e => setErr(e.message));
  
  useEffect(() => { load(); }, [tab]);

  // CHARGEMENT DE TOUTES LES BANDES SANS NUL FILTRE
  useEffect(() => { 
    api.get('/bands')
      .then(res => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        setBands(list); // Stocke directement les 4 bandes renvoyées par l'API
      })
      .catch(e => {
        console.error("Erreur lors de la récupération des bandes :", e);
        setErr("Impossible de charger la liste des bandes.");
      }); 
  }, []);

  const cols = {
    feedings: [
      {
        key: 'date_op',
        label: 'Date',
        render: r => (
          <div className="flex items-center gap-1.5 text-slate-600 font-mono text-xs">
            <Calendar size={14} className="text-slate-400" />
            <span>{fmtDate(r.date_op)}</span>
          </div>
        )
      },
      {
        key: 'bande',
        label: 'Bande',
        render: r => (
          <div className="flex items-center gap-1.5 font-semibold text-slate-800 font-mono">
            <Layers size={14} className="text-slate-400" />
            <span>{r.bande || r.nom_bande || r.numero || '—'}</span>
          </div>
        )
      },
      { 
        key: 'type_aliment', 
        label: "Type d'aliment",
        render: r => (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Utensils size={12} />
            {r.type_aliment}
          </span>
        )
      },
      {
        key: 'quantite_kg',
        label: 'Quantité (kg)',
        render: r => (
          <span className="font-mono font-bold text-emerald-700 bg-emerald-50/60 px-2 py-0.5 rounded text-sm">
            {fmtNum(r.quantite_kg)} kg
          </span>
        )
      },
    ],
    mortalities: [
      {
        key: 'date_op',
        label: 'Date',
        render: r => (
          <div className="flex items-center gap-1.5 text-slate-600 font-mono text-xs">
            <Calendar size={14} className="text-slate-400" />
            <span>{fmtDate(r.date_op)}</span>
          </div>
        )
      },
      {
        key: 'bande',
        label: 'Bande',
        render: r => (
          <div className="flex items-center gap-1.5 font-semibold text-slate-800 font-mono">
            <Layers size={14} className="text-slate-400" />
            <span>{r.bande || r.nom_bande || r.numero || '—'}</span>
          </div>
        )
      },
      {
        key: 'nombre',
        label: 'Nombre',
        render: r => (
          <span className="font-mono font-bold text-rose-600">
            {fmtNum(r.nombre)} sujets
          </span>
        )
      },
      { key: 'cause', label: 'Cause suspectée / observée' },
    ],
    treatments: [
      {
        key: 'date_op',
        label: 'Date',
        render: r => (
          <div className="flex items-center gap-1.5 text-slate-600 font-mono text-xs">
            <Calendar size={14} className="text-slate-400" />
            <span>{fmtDate(r.date_op)}</span>
          </div>
        )
      },
      {
        key: 'bande',
        label: 'Bande',
        render: r => (
          <div className="flex items-center gap-1.5 font-semibold text-slate-800 font-mono">
            <Layers size={14} className="text-slate-400" />
            <span>{r.bande || r.nom_bande || r.numero || '—'}</span>
          </div>
        )
      },
      {
        key: 'produit',
        label: 'Produit',
        render: r => <span className="font-semibold text-slate-800">{r.produit}</span>
      },
      {
        key: 'type',
        label: 'Type',
        render: r => <span className="treatment-badge">{r.type}</span>
      },
      { key: 'dose', label: 'Dose administrée' },
    ],
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-icon icon-emerald">
            <Activity size={24} />
          </div>
          <div>
            <h2>Suivi de Production</h2>
            <p className="sub-text">Saisie quotidienne de l'alimentation, mortalité et soins sanitaires.</p>
          </div>
        </div>

        {can(active.module, 'create') && (
          <button className="btn-primary" onClick={() => setModal(true)}>
            <Plus size={18} />
            <span>Saisir un enregistrement</span>
          </button>
        )}
      </div>

      {err && (
        <div className="alert alert-error">
          <AlertCircle size={18} />
          <span>{err}</span>
        </div>
      )}

      <div className="card-panel">
        <div className="tabs-header">
          <div className="tabs-bar">
            {avail.map(t => {
              const Icon = t.icon;
              const isActive = tab === t.key;
              return (
                <button 
                  key={t.key} 
                  className={`tab-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setTab(t.key)}
                >
                  <Icon size={16} />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <Table columns={cols[tab]} rows={rows} empty="Aucun enregistrement trouvé." />
      </div>

      {modal && (
        <ProdModal 
          tab={tab} 
          bands={bands} 
          onClose={() => setModal(false)} 
          onSaved={() => { setModal(false); load(); }} 
          setErr={setErr} 
        />
      )}
    </div>
  );
}

function ProdModal({ tab, bands, onClose, onSaved, setErr }) {
  const [f, setF] = useState({ 
    band_id: bands && bands.length > 0 ? String(bands[0].id) : '', 
    date_op: today(), 
    quantite_kg: '', 
    type_aliment: 'Démarrage', 
    type_aliment_custom: '',
    moment: 'matin',
    nombre: '', 
    cause: '', 
    produit: '', 
    type: 'vaccin', 
    dose: '', 
    observations: '' 
  });
  
  const [busy, setBusy] = useState(false);

  // Synchronise la sélection initiale dès que les bandes sont disponibles
  useEffect(() => {
    if (bands && bands.length > 0 && !f.band_id) {
      setF(prev => ({ ...prev, band_id: String(bands[0].id) }));
    }
  }, [bands]);

  const handleChange = (field, value) => setF(prev => ({ ...prev, [field]: value }));

  const handleAddKg = (amount) => {
    setF(prev => {
      const current = parseFloat(prev.quantite_kg) || 0;
      return { ...prev, quantite_kg: (current + amount).toString() };
    });
  };

  const handleResetKg = () => setF(prev => ({ ...prev, quantite_kg: '' }));

  const path = { 
    feedings: '/production/feedings', 
    mortalities: '/production/mortalities', 
    treatments: '/production/treatments' 
  }[tab];

  const modalTitles = {
    feedings: "Distributions d'Alimentation",
    mortalities: "Déclaration de Mortalité",
    treatments: "Administration Sanitaire"
  };

  async function save() { 
    setBusy(true); 
    try { 
      const payload = { 
        ...f,
        band_id: parseInt(f.band_id, 10) || null
      };

      if (tab === 'feedings') {
        payload.quantite_kg = parseFloat(f.quantite_kg) || 0;
        if (f.type_aliment === 'Autre / Spécial' && f.type_aliment_custom) {
          payload.type_aliment = f.type_aliment_custom;
        }
      } else if (tab === 'mortalities') {
        payload.nombre = parseInt(f.nombre, 10) || 0;
      }

      await api.post(path, payload); 
      onSaved(); 
    } catch (e) { 
      setErr(e.message || 'Une erreur est survenue lors de la sauvegarde'); 
      setBusy(false); 
    } 
  }

  const qteKg = parseFloat(f.quantite_kg) || 0;
  const coutEstime = qteKg * 350;
  const nbSacs = (qteKg / 50).toFixed(1);

  return (
    <Modal 
      title={modalTitles[tab]} 
      onClose={onClose}
      footer={
        <div className="modal-actions-right">
          <button className="btn-secondary" onClick={onClose} disabled={busy}>
            <X size={16} />
            <span>Annuler</span>
          </button>
          <button className="btn-primary" onClick={save} disabled={busy || !f.band_id}>
            <Check size={16} />
            <span>{busy ? 'Enregistrement…' : 'Enregistrer la Saisie'}</span>
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* SELECTEUR DE BANDE CORRIGÉ ET INCLUSIF */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem' }}>
          <div>
            <label className="input-label">Bande concernée</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Layers size={15} style={{ position: 'absolute', left: '0.75rem', color: '#94a3b8', pointerEvents: 'none', zIndex: 1 }} />
              <select 
                value={String(f.band_id || '')} 
                onChange={e => handleChange('band_id', e.target.value)}
                className="styled-input"
                style={{ paddingLeft: '2.25rem', width: '100%' }}
              >
                <option value="">
                  {bands && bands.length > 0 
                    ? `— Choisir une bande (${bands.length} disponibles) —` 
                    : 'Aucune bande disponible'}
                </option>

                {bands && bands.map((b, index) => {
                  const nomBande = b.numero || b.nom || b.code || b.libelle || `Bande #${b.id || index + 1}`;
                  const batimentInfo = b.batiment ? ` (${b.batiment})` : '';
                  const statutInfo = b.statut ? ` - [${b.statut}]` : '';

                  return (
                    <option key={b.id || index} value={String(b.id)}>
                      {nomBande}{batimentInfo}{statutInfo}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div>
            <label className="input-label">Date de distribution</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Calendar size={15} style={{ position: 'absolute', left: '0.75rem', color: '#94a3b8', pointerEvents: 'none', zIndex: 1 }} />
              <input 
                type="date" 
                value={f.date_op} 
                onChange={e => handleChange('date_op', e.target.value)} 
                className="styled-input"
                style={{ paddingLeft: '2.25rem', width: '100%' }}
              />
            </div>
          </div>
        </div>

        {/* ALIMENTATION */}
        {tab === 'feedings' && (
          <>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label className="input-label" style={{ margin: 0 }}>Type d'aliment distribué</label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                {TYPES_ALIMENT.map(item => {
                  const IconComp = item.icon;
                  const selected = f.type_aliment === item.label;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleChange('type_aliment', item.label)}
                      style={{
                        padding: '0.65rem 0.75rem',
                        borderRadius: '0.75rem',
                        border: selected ? '2px solid #059669' : '1px solid #e2e8f0',
                        backgroundColor: selected ? '#f0fdf4' : '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.4rem',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <div style={{ 
                          display: 'flex', alignItems: 'center', justifyContent: 'center', 
                          width: '26px', height: '26px', borderRadius: '0.5rem', 
                          backgroundColor: selected ? '#10b981' : '#f1f5f9',
                          color: selected ? '#ffffff' : '#64748b' 
                        }}>
                          <IconComp size={14} />
                        </div>
                        {selected && <CheckCircle2 size={16} style={{ color: '#059669' }} />}
                      </div>
                      <div>
                        <div style={{ fontWeight: selected ? 700 : 600, fontSize: '0.8rem', color: selected ? '#065f46' : '#334155' }}>
                          {item.label}
                        </div>
                        <div style={{ fontSize: '0.675rem', color: selected ? '#047857' : '#94a3b8' }}>
                          {item.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {f.type_aliment === 'Autre / Spécial' && (
                <div style={{ marginTop: '0.6rem' }}>
                  <input 
                    type="text" 
                    value={f.type_aliment_custom} 
                    onChange={e => handleChange('type_aliment_custom', e.target.value)} 
                    placeholder="Saisissez la formule..." 
                    className="styled-input"
                    style={{ width: '100%' }}
                    autoFocus
                  />
                </div>
              )}
            </div>

            <div>
              <label className="input-label" style={{ marginBottom: '0.4rem' }}>Moment de la distribution</label>
              <div style={{ 
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.35rem', 
                backgroundColor: '#f8fafc', padding: '0.3rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' 
              }}>
                {MOMENTS.map(m => {
                  const MIcon = m.icon;
                  const active = f.moment === m.value;
                  return (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => handleChange('moment', m.value)}
                      style={{
                        padding: '0.5rem', borderRadius: '0.5rem', border: 'none',
                        backgroundColor: active ? '#ffffff' : 'transparent',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                        color: active ? '#0f172a' : '#64748b'
                      }}
                    >
                      <MIcon size={15} style={{ color: active ? '#059669' : '#94a3b8' }} />
                      <div style={{ textAlign: 'left', lineHeight: 1.1 }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: active ? 700 : 500 }}>{m.label}</div>
                        <div style={{ fontSize: '0.625rem', color: '#94a3b8' }}>{m.detail}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.85rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="input-label" style={{ margin: 0, color: '#0f172a', fontWeight: 700 }}>
                  Quantité totale servie
                </label>
                {qteKg > 0 && (
                  <button type="button" onClick={handleResetKg} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <RotateCcw size={12} />
                    <span>Réinitialiser</span>
                  </button>
                )}
              </div>

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Wheat size={20} style={{ position: 'absolute', left: '1rem', color: '#10b981' }} />
                <input 
                  type="number" 
                  step="0.1"
                  value={f.quantite_kg} 
                  onChange={e => handleChange('quantite_kg', e.target.value)} 
                  placeholder="0.0" 
                  style={{
                    width: '100%', paddingLeft: '2.75rem', paddingRight: '4rem', paddingTop: '0.65rem', paddingBottom: '0.65rem',
                    fontSize: '1.5rem', fontWeight: 800, fontFamily: 'monospace', color: '#065f46', backgroundColor: '#ffffff',
                    border: '2px solid #cbd5e1', borderRadius: '0.65rem', outline: 'none'
                  }}
                  autoFocus 
                />
                <span style={{ position: 'absolute', right: '1rem', fontWeight: 800, color: '#059669', fontSize: '1rem', fontFamily: 'monospace', backgroundColor: '#ecfdf5', padding: '0.2rem 0.5rem', borderRadius: '0.4rem', border: '1px solid #a7f3d0' }}>
                  KG
                </span>
              </div>

              <div>
                <div style={{ fontSize: '0.68rem', color: '#64748b', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Ajout rapide par sac ou portion :
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {QUICK_ADD_KG.map(amount => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => handleAddKg(amount)}
                      style={{
                        flex: 1, padding: '0.35rem 0.5rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '0.5rem',
                        fontSize: '0.75rem', fontWeight: 700, color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem'
                      }}
                    >
                      <span>+{amount} kg</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {qteKg > 0 && (
              <div style={{ padding: '0.85rem 1rem', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '0.75rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{ padding: '0.5rem', backgroundColor: '#10b981', color: '#ffffff', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Calculator size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: '#047857', fontWeight: 600 }}>COÛT ESTIMÉ</div>
                    <div style={{ fontFamily: 'monospace', fontWeight: 800, color: '#065f46', fontSize: '1rem' }}>~ {fmtNum(coutEstime)} XAF</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', borderLeft: '1px solid #a7f3d0', paddingLeft: '1rem' }}>
                  <div style={{ padding: '0.5rem', backgroundColor: '#059669', color: '#ffffff', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Package size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: '#047857', fontWeight: 600 }}>VOLUME EN SACS</div>
                    <div style={{ fontFamily: 'monospace', fontWeight: 800, color: '#065f46', fontSize: '1rem' }}>{nbSacs} sac(s)</div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* MORTALITÉ */}
        {tab === 'mortalities' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="input-label">Nombre de sujets morts</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Skull size={15} style={{ position: 'absolute', left: '0.75rem', color: '#e11d48', pointerEvents: 'none', zIndex: 1 }} />
                <input 
                  type="number" 
                  value={f.nombre} 
                  onChange={e => handleChange('nombre', e.target.value)} 
                  placeholder="0" 
                  className="styled-input font-mono"
                  style={{ paddingLeft: '2.25rem', color: '#be123c', fontWeight: 700, width: '100%' }}
                  autoFocus 
                />
              </div>
            </div>

            <div>
              <label className="input-label">Cause suspectée</label>
              <input 
                type="text" 
                value={f.cause} 
                onChange={e => handleChange('cause', e.target.value)} 
                placeholder="Ex: Picage, Chaleur, Inconnue..." 
                className="styled-input"
                style={{ width: '100%' }}
              />
            </div>
          </div>
        )}

        {/* SANITAIRE */}
        {tab === 'treatments' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label className="input-label">Produit / Vaccin</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Syringe size={15} style={{ position: 'absolute', left: '0.75rem', color: '#94a3b8', pointerEvents: 'none', zIndex: 1 }} />
                  <input 
                    type="text" 
                    value={f.produit} 
                    onChange={e => handleChange('produit', e.target.value)} 
                    placeholder="Ex: Gumboro / Vitamines" 
                    className="styled-input"
                    style={{ paddingLeft: '2.25rem', width: '100%' }}
                    autoFocus 
                  />
                </div>
              </div>

              <div>
                <label className="input-label">Type d'intervention</label>
                <select 
                  value={f.type} 
                  onChange={e => handleChange('type', e.target.value)}
                  className="styled-input"
                  style={{ width: '100%' }}
                >
                  <option value="vaccin">Vaccin</option>
                  <option value="traitement">Traitement curatif</option>
                  <option value="medicament">Vitamines / Anti-stress</option>
                </select>
              </div>
            </div>

            <div>
              <label className="input-label">Dose administrée</label>
              <input 
                type="text" 
                value={f.dose} 
                onChange={e => handleChange('dose', e.target.value)} 
                placeholder="Ex: 1L / 1000L d'eau" 
                className="styled-input"
                style={{ width: '100%' }}
              />
            </div>
          </>
        )}

        {/* OBSERVATIONS */}
        <div>
          <label className="input-label">Observations complémentaires</label>
          <textarea 
            rows="2" 
            value={f.observations} 
            onChange={e => handleChange('observations', e.target.value)} 
            placeholder="Remarques..." 
            className="styled-input"
            style={{ padding: '0.6rem 0.75rem', resize: 'vertical', width: '100%' }}
          />
        </div>

      </div>
    </Modal>
  );
}