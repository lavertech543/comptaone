import { useEffect, useState, useMemo } from 'react';
import { api } from '../api.js';
import './responsive.css';
import { useAuth } from '../context/AuthContext.jsx';
import { Modal, Table, useForm } from '../components/ui.jsx';
import { fmtFCFA, fmtDate, today } from '../util.js';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
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
  Receipt,
  Scale,
  Tag,
  ArrowRightLeft
} from 'lucide-react';

const PAYMENTS = [
  { value: 'Espèces', label: 'Espèces', icon: Wallet },
  { value: 'Mobile Money', label: 'Mobile Money', icon: Smartphone },
  { value: 'Virement', label: 'Virement', icon: Building },
  { value: 'Chèque', label: 'Chèque', icon: CreditCard },
];

const CAT_DEPENSES = ['Alimentation', 'Sanitaire', 'Énergie / Eau', 'Suel / Transport', 'Matériel', 'Autre charge'];
const CAT_RECETTES = ['Vente directe', 'Subvention', 'Prestation', 'Autre produit'];

// Dictionnaire des couleurs par catégorie
const CATEGORY_COLORS = {
  // Dépenses
  'Alimentation': 'cat-emerald',
  'Sanitaire': 'cat-indigo',
  'Énergie / Eau': 'cat-amber',
  'Suel / Transport': 'cat-rose',
  'Matériel': 'cat-cyan',
  'Autre charge': 'cat-gray',

  // Recettes
  'Vente directe': 'cat-emerald',
  'Subvention': 'cat-blue',
  'Prestation': 'cat-violet',
  'Autre produit': 'cat-gray'
};

export default function Transactions() {
  const { can } = useAuth();
  const [rows, setRows] = useState([]);
  const [modal, setModal] = useState(false);
  const [err, setErr] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const load = () => api.get('/finance/transactions').then(setRows).catch(e => setErr(e.message));

  useEffect(() => { load(); }, []);

  // Calculs statistiques KPI
  const stats = useMemo(() => {
    const recettes = rows.filter(r => r.type === 'recette').reduce((sum, r) => sum + Number(r.montant || 0), 0);
    const depenses = rows.filter(r => r.type === 'depense').reduce((sum, r) => sum + Number(r.montant || 0), 0);
    return { recettes, depenses, solde: recettes - depenses };
  }, [rows]);

  // Filtrage dynamique
  const filteredRows = useMemo(() => {
    if (!searchQuery) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter(r => 
      (r.motif && r.motif.toLowerCase().includes(q)) ||
      (r.tiers && r.tiers.toLowerCase().includes(q)) ||
      (r.categorie && r.categorie.toLowerCase().includes(q))
    );
  }, [rows, searchQuery]);

  return (
    <div className="page-container">
      {/* HEADER DE LA PAGE */}
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-icon icon-blue">
            <ArrowRightLeft size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2>Transactions financières</h2>
              <span className="pro-pill-blue">Trésorerie</span>
            </div>
            <p className="sub-text">Journal centralisé des entrées et sorties de caisse.</p>
          </div>
        </div>

        {can('depenses', 'create') && (
          <button type="button" className="btn-primary-fintech" onClick={() => setModal(true)}>
            <Plus size={16} />
            <span>Saisir une opération</span>
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
            <ArrowUpRight size={20} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Total Recettes</span>
            <span className="kpi-value text-emerald font-mono">{fmtFCFA(stats.recettes)}</span>
          </div>
        </div>

        <div className="quick-kpi-card">
          <div className="kpi-icon-wrapper rose">
            <ArrowDownLeft size={20} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Total Dépenses</span>
            <span className="kpi-value text-rose font-mono">{fmtFCFA(stats.depenses)}</span>
          </div>
        </div>

        <div className="quick-kpi-card">
          <div className="kpi-icon-wrapper indigo">
            <Scale size={20} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Flux Net (Solde)</span>
            <span className={`kpi-value font-mono ${stats.solde >= 0 ? 'text-emerald' : 'text-rose'}`}>
              {fmtFCFA(stats.solde)}
            </span>
          </div>
        </div>
      </div>

      {/* TABLEAU DES TRANSACTIONS */}
      <div className="card-panel-fintech">
        <div className="panel-top-bar">
          <div className="panel-title-sm">
            <Receipt size={16} className="text-slate-400" />
            <span>Journal de caisse</span>
          </div>

          <div className="table-search-box">
            <Search size={15} className="search-icon" />
            <input 
              type="text" 
              placeholder="Rechercher par motif, tiers, catégorie..."
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
              key: 'type',
              label: 'Type',
              render: r => {
                const isRecette = r.type === 'recette';
                return (
                  <span className={`type-badge ${isRecette ? 'recette' : 'depense'}`}>
                    {isRecette ? <ArrowUpRight size={13} /> : <ArrowDownLeft size={13} />}
                    {isRecette ? 'Recette' : 'Dépense'}
                  </span>
                );
              }
            },
            {
              key: 'categorie',
              label: 'Catégorie',
              render: r => {
                if (!r.categorie) return <span className="text-slate-400 text-xs">—</span>;
                const colorClass = CATEGORY_COLORS[r.categorie] || 'cat-gray';

                return (
                  <span className={`cat-badge ${colorClass}`}>
                    <Tag size={11} />
                    <span>{r.categorie}</span>
                  </span>
                );
              }
            },
            {
              key: 'motif',
              label: 'Motif / Description',
              render: r => (
                <span className="font-medium text-slate-800">
                  {r.motif || '—'}
                </span>
              )
            },
            {
              key: 'tiers',
              label: 'Tiers / Bénéficiaire',
              render: r => r.tiers ? (
                <div className="flex items-center gap-1.5 text-slate-600">
                  <User size={13} className="text-slate-400" />
                  <span>{r.tiers}</span>
                </div>
              ) : <span className="text-slate-400 text-xs">—</span>
            },
            {
              key: 'montant',
              label: 'Montant',
              render: r => {
                const isRecette = r.type === 'recette';
                return (
                  <span className={`font-mono font-bold text-sm ${isRecette ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {isRecette ? '+' : '-'}{fmtFCFA(r.montant)}
                  </span>
                );
              }
            }
          ]}
          empty="Aucune transaction trouvée."
        />
      </div>

      {modal && (
        <TxModal 
          onClose={() => setModal(false)} 
          onSaved={() => { setModal(false); load(); }} 
          setErr={setErr} 
        />
      )}
    </div>
  );
}

// MODAL DE SAISIE CORRIGÉ
function TxModal({ onClose, onSaved, setErr }) {
  const [f, set] = useForm({ 
    type: 'depense', 
    date_op: today(), 
    montant: '', 
    categorie: 'Alimentation', 
    motif: '', 
    tiers: '', 
    mode_paiement: 'Espèces' 
  });
  const [busy, setBusy] = useState(false);

  const updateField = (field, value) => {
    set(field)({ target: { value } });
  };

  // Bascule explicite sans déclencher le submit du formulaire
  const handleTypeChange = (e, newType) => {
    e.preventDefault();
    e.stopPropagation();
    updateField('type', newType);
    updateField('categorie', newType === 'recette' ? CAT_RECETTES[0] : CAT_DEPENSES[0]);
  };

  const isRecette = f.type === 'recette';
  const categoriesList = isRecette ? CAT_RECETTES : CAT_DEPENSES;

  async function save(e) { 
    if (e) e.preventDefault();
    
    if (!f.montant || Number(f.montant) <= 0) {
      if (setErr) setErr("Veuillez saisir un montant valide.");
      return;
    }
    setBusy(true); 
    try { 
      await api.post('/finance/transactions', f); 
      onSaved(); 
    } catch (e) { 
      if (setErr) setErr(e.message); 
      setBusy(false); 
    } 
  }

  return (
    <Modal 
      title="Saisie d'une transaction" 
      onClose={onClose}
      footer={
        <div className="modal-actions-right">
          <button type="button" className="btn-secondary" onClick={onClose}>
            <X size={16} />
            <span>Annuler</span>
          </button>
          <button type="button" className="btn-primary-fintech" onClick={save} disabled={busy}>
            <Check size={16} />
            <span>{busy ? 'Enregistrement…' : 'Valider l\'opération'}</span>
          </button>
        </div>
      }
    >
      <div className="fintech-form-container">
        
        {/* SELECTEUR DYNAMIQUE TYPE (RECETTE / DÉPENSE) */}
        <div className="type-toggle-grid">
          <button
            type="button"
            className={`type-toggle-btn btn-depense ${!isRecette ? 'active' : ''}`}
            onClick={(e) => handleTypeChange(e, 'depense')}
          >
            <ArrowDownLeft size={16} />
            <span>Dépense / Sortie</span>
          </button>

          <button
            type="button"
            className={`type-toggle-btn btn-recette ${isRecette ? 'active' : ''}`}
            onClick={(e) => handleTypeChange(e, 'recette')}
          >
            <ArrowUpRight size={16} />
            <span>Recette / Entrée</span>
          </button>
        </div>

        {/* MONTANT (HIGHLIGHT) */}
        <div className="input-group-styled highlight">
          <label className="input-label">Montant de la transaction (FCFA)</label>
          <div className="input-icon-wrapper">
            <Coins size={18} className="input-icon text-amber-500" />
            <input 
              type="number" 
              className="styled-input text-xl font-bold font-mono"
              value={f.montant || ''} 
              onChange={set('montant')} 
              placeholder="0"
              autoFocus 
            />
          </div>
        </div>

        {/* DATE & TIERS */}
        <div className="form-row-2">
          <div className="input-group-styled">
            <label className="input-label">Date d'opération</label>
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
            <label className="input-label">{isRecette ? 'Source / Payeur' : 'Bénéficiaire / Tiers'}</label>
            <div className="input-icon-wrapper">
              <User size={16} className="input-icon" />
              <input 
                type="text" 
                className="styled-input"
                value={f.tiers || ''} 
                onChange={set('tiers')} 
                placeholder={isRecette ? "Ex: Nom du client" : "Ex: Nom du fournisseur"} 
              />
            </div>
          </div>
        </div>

        {/* CATÉGORIES (PUCES) */}
        <div className="input-group-styled">
          <label className="input-label">Catégorie ({isRecette ? 'Recette' : 'Dépense'})</label>
          <div className="category-pills-grid">
            {categoriesList.map(cat => (
              <button
                key={cat}
                type="button"
                className={`cat-pill-btn ${f.categorie === cat ? (isRecette ? 'pill-emerald active' : 'pill-rose active') : ''}`}
                onClick={(e) => { e.preventDefault(); updateField('categorie', cat); }}
              >
                <Tag size={12} />
                <span>{cat}</span>
                {f.categorie === cat && <CheckCircle2 size={13} className="check-mark" />}
              </button>
            ))}
          </div>
        </div>

        {/* MOTIF / LIBELLÉ */}
        <div className="input-group-styled">
          <label className="input-label">Motif / Libellé explicatif</label>
          <div className="input-icon-wrapper">
            <FileText size={16} className="input-icon" />
            <input 
              type="text" 
              className="styled-input"
              value={f.motif || ''} 
              onChange={set('motif')} 
              placeholder="Ex: Règlement facture électricité, Vente poussins..." 
            />
          </div>
        </div>

        {/* MODE DE PAIEMENT */}
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
                  onClick={(e) => { e.preventDefault(); updateField('mode_paiement', p.value); }}
                >
                  <Icon size={14} />
                  <span>{p.label}</span>
                  {isSelected && <CheckCircle2 size={13} className="check-mark" />}
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </Modal>
  );
}