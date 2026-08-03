import { useEffect, useState, useMemo } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Modal, Table, StatusTag } from '../components/ui.jsx';
import { fmtFCFA, fmtDate, today } from '../util.js';
import { 
  Users, 
  Plus, 
  AlertCircle, 
  Calendar, 
  Check, 
  X, 
  CreditCard, 
  User, 
  Search, 
  Wallet, 
  Smartphone, 
  Building, 
  CheckCircle2, 
  Coins, 
  FileText, 
  Clock, 
  ArrowUpRight,
  ShieldAlert,
  HandCoins,
  Receipt
} from 'lucide-react';

const PAYMENTS = [
  { value: 'Espèces', label: 'Espèces', icon: Wallet },
  { value: 'Mobile Money', label: 'Mobile Money', icon: Smartphone },
  { value: 'Virement', label: 'Virement', icon: Building },
  { value: 'Chèque', label: 'Chèque', icon: CreditCard },
];

export default function Receivables() {
  const { can } = useAuth();
  const [rows, setRows] = useState([]);
  const [modal, setModal] = useState(null);
  const [err, setErr] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const load = () => api.get('/receivables').then(setRows).catch(e => setErr(e.message));

  useEffect(() => { load(); }, []);

  // Calculs statistiques pour les créances clients
  const stats = useMemo(() => {
    let total = 0;
    let paye = 0;
    let solde = 0;
    let enRetard = 0;
    const now = new Date();

    rows.forEach(r => {
      total += Number(r.montant || 0);
      paye += Number(r.montant_paye || 0);
      solde += Number(r.solde || 0);
      
      if (r.solde > 0 && r.date_echeance && new Date(r.date_echeance) < now) {
        enRetard += Number(r.solde || 0);
      }
    });

    return { total, paye, solde, enRetard };
  }, [rows]);

  // Filtrage par nom de client
  const filteredRows = useMemo(() => {
    if (!searchQuery) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter(r => r.client && r.client.toLowerCase().includes(q));
  }, [rows, searchQuery]);

  return (
    <div className="page-container">
      {/* HEADER DE LA PAGE */}
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-icon icon-blue">
            <Users size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2>Créances Clients</h2>
              <span className="pro-pill-blue">Recouvrement</span>
            </div>
            <p className="sub-text">Suivi des impayés, des échéances et historique des encaissements.</p>
          </div>
        </div>

        {can('creances', 'create') && (
          <button 
            type="button" 
            className="btn-primary-fintech" 
            onClick={() => setModal({ new: true })}
          >
            <Plus size={16} />
            <span>Nouvelle créance</span>
          </button>
        )}
      </div>

      {err && (
        <div className="alert alert-error">
          <AlertCircle size={18} />
          <span>{err}</span>
        </div>
      )}

      {/* KPI STRIP RECOUVRABLE */}
      <div className="kpi-grid-4">
        <div className="quick-kpi-card">
          <div className="kpi-icon-wrapper indigo">
            <Receipt size={20} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Total Créances</span>
            <span className="kpi-value text-indigo font-mono">{fmtFCFA(stats.total)}</span>
          </div>
        </div>

        <div className="quick-kpi-card">
          <div className="kpi-icon-wrapper emerald">
            <ArrowUpRight size={20} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Total Encaissé</span>
            <span className="kpi-value text-emerald font-mono">{fmtFCFA(stats.paye)}</span>
          </div>
        </div>

        <div className="quick-kpi-card">
          <div className="kpi-icon-wrapper amber">
            <Clock size={20} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Reste à Recouvrer</span>
            <span className="kpi-value text-amber font-mono">{fmtFCFA(stats.solde)}</span>
          </div>
        </div>

        <div className="quick-kpi-card">
          <div className="kpi-icon-wrapper rose">
            <ShieldAlert size={20} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Créances en Retard</span>
            <span className="kpi-value text-rose font-mono">{fmtFCFA(stats.enRetard)}</span>
          </div>
        </div>
      </div>

      {/* TABLEAU DES CRÉANCES */}
      <div className="card-panel-fintech">
        <div className="panel-top-bar">
          <div className="panel-title-sm">
            <HandCoins size={16} className="text-slate-400" />
            <span>Portefeuille de créances</span>
          </div>

          <div className="table-search-box">
            <Search size={15} className="search-icon" />
            <input 
              type="text" 
              placeholder="Rechercher un client..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button type="button" className="clear-search" onClick={() => setSearchQuery('')}>
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        <Table 
          rows={filteredRows} 
          columns={[
            {
              key: 'client',
              label: 'Client',
              render: r => (
                <div className="flex items-center gap-2">
                  <User size={14} className="text-slate-400" />
                  <span className="font-semibold text-slate-800">{r.client}</span>
                </div>
              )
            },
            {
              key: 'montant',
              label: 'Montant Initial',
              render: r => (
                <span className="font-mono text-slate-700 font-medium">
                  {fmtFCFA(r.montant)}
                </span>
              )
            },
            {
              key: 'montant_paye',
              label: 'Payé',
              render: r => (
                <span className="font-mono text-emerald-600 font-medium">
                  {fmtFCFA(r.montant_paye)}
                </span>
              )
            },
            {
              key: 'solde',
              label: 'Solde Restant',
              render: r => {
                const hasSolde = Number(r.solde) > 0;
                return (
                  <span className={`font-mono font-bold ${hasSolde ? 'text-rose-600' : 'text-slate-400'}`}>
                    {fmtFCFA(r.solde)}
                  </span>
                );
              }
            },
            {
              key: 'date_echeance',
              label: 'Échéance',
              render: r => (
                <div className="table-date-cell">
                  <Calendar size={13} className="text-slate-400" />
                  <span>{fmtDate(r.date_echeance)}</span>
                </div>
              )
            },
            {
              key: 'statut',
              label: 'Statut',
              render: r => <StatusTag value={r.statut} />
            }
          ]}
          actions={can('creances', 'edit') ? (r) => r.statut !== 'solde' ? (
            <button 
              type="button" 
              className="btn-primary-fintech btn-sm" 
              onClick={() => setModal({ pay: r })}
            >
              <HandCoins size={13} />
              <span>Encaisser</span>
            </button>
          ) : null : null}
          empty="Aucune créance enregistrée."
        />
      </div>

      {modal && (
        <RecModal 
          modal={modal} 
          onClose={() => setModal(null)} 
          onSaved={() => { setModal(null); load(); }} 
          setErr={setErr} 
        />
      )}
    </div>
  );
}

// MODAL D'AJOUT ET D'ENCAISSEMENT UNIFIÉ ET SÉCURISÉ
function RecModal({ modal, onClose, onSaved, setErr }) {
  const pay = modal.pay;

  // État local explicite
  const [f, setF] = useState(
    pay ? {
      montant: pay.solde,
      mode_paiement: 'Espèces',
      date_op: today()
    } : {
      client: '',
      montant: '',
      date_creation: today(),
      date_echeance: '',
      observations: ''
    }
  );

  const [busy, setBusy] = useState(false);

  const handleChange = (field, value) => {
    setF(prev => ({ ...prev, [field]: value }));
  };

  async function save(e) {
    if (e) e.preventDefault();

    if (!f.montant || Number(f.montant) <= 0) {
      if (setErr) setErr("Veuillez saisir un montant valide.");
      return;
    }

    setBusy(true);
    try {
      if (pay) {
        await api.post(`/receivables/${pay.id}/payment`, f);
      } else {
        await api.post('/receivables', f);
      }
      onSaved();
    } catch (e) {
      if (setErr) setErr(e.message);
      setBusy(false);
    }
  }

  return (
    <Modal 
      title={<h1 style={{color:'#10b981',fontSize:'1.25em',margin:'15px'}}>{pay ? `Encaissement — ${pay.client}` : 'Nouvelle créance client'}</h1>} 
      onClose={onClose}
      footer={
        <div className="modal-actions-right">
          <button type="button" className="btn-secondary" onClick={onClose}>
            <X size={16} />
            <span>Annuler</span>
          </button>
          <button type="button" className="btn-primary-fintech" onClick={save} disabled={busy}>
            <Check size={16} />
            <span>{busy ? 'Enregistrement…' : 'Valider'}</span>
          </button>
        </div>
      }
    >
      <div className="fintech-form-container">

        {pay ? (
          /* ================= MODE ENCAISSEMENT ================= */
          <>
            <div className="kpi-banner-solde">
              <span className="text-slate-500 text-xs uppercase font-semibold">Solde à recouvrer</span>
              <span className="text-xl font-bold font-mono text-rose-600">{fmtFCFA(pay.solde)}</span>
            </div>

            <div className="form-row-2">
              <div className="input-group-styled highlight">
                <label className="input-label">Montant à encaisser (FCFA)</label>
                <div className="input-icon-wrapper">
                  <Coins size={18} className="input-icon text-amber-500" />
                  <input 
                    type="number" 
                    className="styled-input text-lg font-bold font-mono"
                    value={f.montant || ''} 
                    onChange={e => handleChange('montant', e.target.value)} 
                    placeholder="0"
                    autoFocus
                  />
                </div>
              </div>

              <div className="input-group-styled">
                <label className="input-label">Date du règlement</label>
                <div className="input-icon-wrapper">
                  <Calendar size={16} className="input-icon" />
                  <input 
                    type="date" 
                    className="styled-input"
                    value={f.date_op || ''} 
                    onChange={e => handleChange('date_op', e.target.value)} 
                  />
                </div>
              </div>
            </div>

            {/* SELECTION MODE DE PAIEMENT */}
            <div className="input-group-styled">
              <label className="input-label">Mode de règlement</label>
              <div className="payment-pills-grid">
                {PAYMENTS.map(p => {
                  const Icon = p.icon;
                  const isSelected = f.mode_paiement === p.value;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      className={`payment-pill-btn ${isSelected ? 'active' : ''}`}
                      onClick={(e) => { e.preventDefault(); handleChange('mode_paiement', p.value); }}
                    >
                      <Icon size={14} />
                      <span>{p.label}</span>
                      {isSelected && <CheckCircle2 size={13} className="check-mark" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          /* ================= MODE CRÉATION DE CRÉANCE ================= */
          <>
            <div className="input-group-styled">
              <label className="input-label">Nom du client</label>
              <div className="input-icon-wrapper">
                <User size={16} className="input-icon" />
                <input 
                  type="text" 
                  className="styled-input"
                  value={f.client || ''} 
                  onChange={e => handleChange('client', e.target.value)} 
                  placeholder="Ex: Ferme Oumar, Hôtel du Centre..."
                  autoFocus
                />
              </div>
            </div>

            <div className="form-row-2">
              <div className="input-group-styled highlight">
                <label className="input-label">Montant de la créance (FCFA)</label>
                <div className="input-icon-wrapper">
                  <Coins size={18} className="input-icon text-amber-500" />
                  <input 
                    type="number" 
                    className="styled-input font-mono font-bold"
                    value={f.montant || ''} 
                    onChange={e => handleChange('montant', e.target.value)} 
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="input-group-styled">
                <label className="input-label">Date d'échéance</label>
                <div className="input-icon-wrapper">
                  <Calendar size={16} className="input-icon" />
                  <input 
                    type="date" 
                    className="styled-input"
                    value={f.date_echeance || ''} 
                    onChange={e => handleChange('date_echeance', e.target.value)} 
                  />
                </div>
              </div>
            </div>

            <div className="input-group-styled">
              <label className="input-label">Observations / Détails</label>
              <div className="input-icon-wrapper">
                <FileText size={16} className="input-icon" style={{ top: '12px' }} />
                <textarea 
                  className="styled-input"
                  style={{ paddingLeft: '36px', minHeight: '80px', paddingTop: '8px',fontFamily:'Arial ',fontSize:'15px' }}
                  value={f.observations || ''} 
                  onChange={e => handleChange('observations', e.target.value)} 
                  placeholder="Factures concernées, accord verbal, conditions..."
                />
              </div>
            </div>
          </>
        )}

      </div>
    </Modal>
  );
}