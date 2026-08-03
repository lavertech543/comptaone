import { useEffect, useState, useMemo } from 'react';
import { api } from '../api.js';
import './responsive.css';
import { useAuth } from '../context/AuthContext.jsx';
import { Modal, Table, useForm } from '../components/ui.jsx';
import { fmtFCFA, fmtNum, fmtDate, today } from '../util.js';
import { 
  TrendingUp, 
  Plus, 
  AlertCircle, 
  Calendar, 
  Layers, 
  Check, 
  X, 
  CreditCard, 
  User, 
  Search, 
  Wallet, 
  Smartphone, 
  Building, 
  CheckCircle2, 
  Weight, 
  Hash, 
  Coins, 
  Clock, 
  AlertTriangle,
  Receipt,
  PiggyBank
} from 'lucide-react';


const PAYMENTS = [
  { value: 'Espèces', label: 'Espèces', icon: Wallet },
  { value: 'Mobile Money', label: 'Mobile Money', icon: Smartphone },
  { value: 'Virement', label: 'Virement', icon: Building },
  { value: 'Chèque', label: 'Chèque', icon: CreditCard },
];

export default function Sales() {
  const { can } = useAuth();
  const [rows, setRows] = useState([]);
  const [bands, setBands] = useState([]);
  const [modal, setModal] = useState(false);
  const [err, setErr] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const load = () => api.get('/finance/sales').then(setRows).catch(e => setErr(e.message));

  useEffect(() => { 
    load(); 
    api.get('/bands')
      .then(setBands)
      .catch(() => {}); 
  }, []);

  // Calculs statistiques KPI
  const stats = useMemo(() => {
    const total = rows.reduce((sum, r) => sum + Number(r.montant_total || 0), 0);
    const credit = rows.filter(r => r.a_credit).reduce((sum, r) => sum + Number(r.montant_total || 0), 0);
    const cashed = total - credit;
    return { total, credit, cashed };
  }, [rows]);

  // Filtrage dynamique des ventes
  const filteredRows = useMemo(() => {
    if (!searchQuery) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter(r => 
      (r.client && r.client.toLowerCase().includes(q)) ||
      (r.bande && r.bande.toLowerCase().includes(q)) ||
      (r.mode_paiement && r.mode_paiement.toLowerCase().includes(q))
    );
  }, [rows, searchQuery]);

  return (
    <div className="page-container">
      {/* HEADER DE LA PAGE */}
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-icon icon-emerald">
            <TrendingUp size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2>Ventes & Recettes</h2>
              <span className="pro-pill-emerald">Finance</span>
            </div>
            <p className="sub-text">Journal des encaissements, facturation et créances clients.</p>
          </div>
        </div>

        {can('ventes', 'create') && (
          <button className="btn-primary-fintech" onClick={() => setModal(true)}>
            <Plus size={16} />
            <span>Nouvelle vente</span>
          </button>
        )}
      </div>

      {err && (
        <div className="alert alert-error">
          <AlertCircle size={18} />
          <span>{err}</span>
        </div>
      )}

      {/* KPI STRIP FINTECH */}
      <div className="kpi-grid-3">
        <div className="quick-kpi-card">
          <div className="kpi-icon-wrapper emerald">
            <TrendingUp size={20} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Chiffre d'Affaires Total</span>
            <span className="kpi-value text-emerald font-mono">{fmtFCFA(stats.total)}</span>
          </div>
        </div>

        <div className="quick-kpi-card">
          <div className="kpi-icon-wrapper indigo">
            <PiggyBank size={20} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Total Encaissé</span>
            <span className="kpi-value text-indigo font-mono">{fmtFCFA(stats.cashed)}</span>
          </div>
        </div>

        <div className="quick-kpi-card">
          <div className="kpi-icon-wrapper amber">
            <AlertTriangle size={20} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Créances (À crédit)</span>
            <span className="kpi-value text-amber font-mono">{fmtFCFA(stats.credit)}</span>
          </div>
        </div>
      </div>

      {/* TABLEAU DES VENTES */}
      <div className="card-panel-fintech">
        <div className="panel-top-bar">
          <div className="panel-title-sm">
            <Receipt size={16} className="text-slate-400" />
            <span>Historique des opérations</span>
          </div>

          <div className="table-search-box">
            <Search size={15} className="search-icon" />
            <input 
              type="text" 
              placeholder="Rechercher par client, bande..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-search" onClick={() => setSearchQuery('')}>
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        <Table 
          rows={filteredRows} 
          columns={[
            {
              key: 'date_op',
              label: 'Date',
              render: r => (
                <div className="table-date-cell">
                  <Calendar size={13} className="text-slate-400" />
                  <span>{fmtDate(r.date_op)}</span>
                </div>
              )
            },
            {
              key: 'client',
              label: 'Client',
              render: r => (
                <div className="flex items-center gap-1.5 font-medium text-slate-800">
                  <User size={14} className="text-slate-400" />
                  <span>{r.client || 'Client passage'}</span>
                </div>
              )
            },
            {
              key: 'bande',
              label: 'Bande',
              render: r => r.bande ? (
                <span className="badge-band">
                  <Layers size={11} />
                  {r.bande}
                </span>
              ) : <span className="text-slate-400 text-xs italic">—</span>
            },
            {
              key: 'quantite',
              label: 'Quantité',
              render: r => (
                <span className="font-mono text-slate-700">
                  {fmtNum(r.quantite)} suj.
                </span>
              )
            },
            {
              key: 'poids_kg',
              label: 'Poids Total',
              render: r => r.poids_kg ? (
                <span className="font-mono text-slate-600">{fmtNum(r.poids_kg)} kg</span>
              ) : <span className="text-slate-400">—</span>
            },
            {
              key: 'montant_total',
              label: 'Montant Total',
              render: r => (
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {fmtFCFA(r.montant_total)}
                </span>
              )
            },
            {
              key: 'a_credit',
              label: 'Règlement',
              render: r => r.a_credit ? (
                <span className="cat-pill amber">
                  <Clock size={11} />
                  Crédit
                </span>
              ) : (
                <span className="cat-pill emerald">
                  <CheckCircle2 size={11} />
                  Payé ({r.mode_paiement || 'Espèces'})
                </span>
              )
            }
          ]}
          empty="Aucune vente enregistrée."
        />
      </div>

      {modal && (
        <SaleModal 
          bands={bands} 
          onClose={() => setModal(false)} 
          onSaved={() => { setModal(false); load(); }} 
          setErr={setErr} 
        />
      )}
    </div>
  );
}

// MODAL DE SAISIE MODERNE
function SaleModal({ bands, onClose, onSaved, setErr }) {
  const [f, set] = useForm({ 
    date_op: today(), 
    client: '', 
    band_id: '', 
    quantite: 1, 
    poids_kg: '', 
    prix_unitaire: '', 
    mode_paiement: 'Espèces', 
    a_credit: false, 
    date_echeance: '', 
    observations: '' 
  });
  const [busy, setBusy] = useState(false);

  const total = Number(f.quantite || 0) * Number(f.prix_unitaire || 0);

  const updateField = (field, value) => {
    set(field)({ target: { value } });
  };

  async function save() { 
    setBusy(true); 
    try { 
      await api.post('/finance/sales', { ...f, montant_total: total }); 
      onSaved(); 
    } catch (e) { 
      if (setErr) setErr(e.message); 
      setBusy(false); 
    } 
  }

  return (
    <Modal 
      title="Saisie d'une nouvelle vente" 
      onClose={onClose}
      footer={
        <div className="modal-actions-right">
          <button className="btn-secondary" onClick={onClose}>
            <X size={16} />
            <span>Annuler</span>
          </button>
          <button className="btn-primary-fintech" onClick={save} disabled={busy}>
            <Check size={16} />
            <span>{busy ? 'Enregistrement…' : 'Valider la vente'}</span>
          </button>
        </div>
      }
    >
      <div className="fintech-form-container">
        
        {/* CLIENT */}
        <div className="input-group-styled highlight">
          <label className="input-label">Nom du Client / Acheteur</label>
          <div className="input-icon-wrapper">
            <User size={18} className="input-icon" />
            <input 
              type="text" 
              className="styled-input text-lg font-medium"
              value={f.client || ''} 
              onChange={set('client')} 
              placeholder="Ex: Grossiste Yaoundé, Client passage..."
              autoFocus 
            />
          </div>
        </div>

        {/* DATE & BANDE */}
        <div className="form-row-2">
          <div className="input-group-styled">
            <label className="input-label">Date de vente</label>
            <div className="input-icon-wrapper">
              <Calendar size={16} className="input-icon" />
              <input 
                type="date" 
                className="styled-input"
                value={f.date_op || ''} 
                onChange={set('date_op')} 
              />
            </div>
          </div>

          <div className="input-group-styled">
            <label className="input-label">Bande d'origine</label>
            <div className="input-icon-wrapper">
              <Layers size={16} className="input-icon" />
              <select className="styled-select" value={f.band_id || ''} onChange={set('band_id')}>
                <option value="">— Sélectionner la bande —</option>
                {bands.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.numero} ({b.batiment}) {b.statut ? `— [${b.statut}]` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* QUANTITÉ, POIDS & PRIX UNITAIRE (ALIGNÉS SUR MÊME LIGNE) */}
        <div className="form-row-3">
          <div className="input-group-styled">
            <label className="input-label">Quantité (Sujets)</label>
            <div className="input-icon-wrapper">
              <Hash size={16} className="input-icon" />
              <input 
                type="number" 
                min="1"
                className="styled-input font-mono"
                value={f.quantite || 1} 
                onChange={set('quantite')} 
              />
            </div>
          </div>

          <div className="input-group-styled">
            <label className="input-label">Poids total (kg)</label>
            <div className="input-icon-wrapper">
              <Weight size={16} className="input-icon" />
              <input 
                type="number" 
                step="0.1"
                className="styled-input font-mono"
                value={f.poids_kg || ''} 
                onChange={set('poids_kg')} 
                placeholder="0.0"
              />
            </div>
          </div>

          <div className="input-group-styled">
            <label className="input-label">Prix unitaire (FCFA)</label>
            <div className="input-icon-wrapper">
              <Coins size={16} className="input-icon" />
              <input 
                type="number" 
                className="styled-input font-mono font-semibold"
                value={f.prix_unitaire || ''} 
                onChange={set('prix_unitaire')} 
                placeholder="0" 
              />
            </div>
          </div>
        </div>

        {/* MODE DE PAIEMENT */}
        {!f.a_credit && (
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
                    onClick={() => updateField('mode_paiement', p.value)}
                  >
                    <Icon size={14} />
                    <span>{p.label}</span>
                    {isSelected && <CheckCircle2 size={13} className="check-mark" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* VENTE À CRÉDIT - DESIGN FINTECH */}
        <div className={`fintech-credit-card ${f.a_credit ? 'active' : ''}`}>
          <label className="credit-toggle-wrapper">
            <div className="credit-info-group">
              <div className="credit-icon-badge">
                <AlertTriangle size={18} />
              </div>
              <div>
                <span className="credit-title">Vente à crédit</span>
                <p className="credit-sub">Génère une créance client et affecte la trésorerie</p>
              </div>
            </div>
            
            {/* TOGGLE SWITCH CUSTOM FINTECH */}
            <div className="switch-container">
              <input 
                type="checkbox" 
                checked={f.a_credit || false} 
                onChange={e => updateField('a_credit', e.target.checked)} 
              />
              <span className="switch-slider"></span>
            </div>
          </label>

          {f.a_credit && (
            <div className="credit-due-date-container">
              <div className="input-group-styled">
                <label className="input-label text-amber-900">Date d'échéance du paiement</label>
                <div className="input-icon-wrapper">
                  <Clock size={16} className="input-icon text-amber-600" />
                  <input 
                    type="date" 
                    className="styled-input border-amber-300 focus:border-amber-500"
                    value={f.date_echeance || ''} 
                    onChange={set('date_echeance')} 
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CARTOUCHE FINANCIER DYNAMIQUE */}
        <div className="fintech-summary-card">
          <div className="summary-info">
            <span className="summary-title">Montant total de la vente</span>
            <span className="summary-calc">
              {Number(f.quantite || 0).toLocaleString('fr-FR')} sujets × {Number(f.prix_unitaire || 0).toLocaleString('fr-FR')} FCFA
            </span>
          </div>
          <div className="summary-total-display text-emerald">
            {fmtFCFA(total)}
          </div>
        </div>

      </div>
    </Modal>
  );
}