import { useEffect, useState, useMemo } from 'react';
import { api } from '../api.js';
import './Purchases.css';
import { useAuth } from '../context/AuthContext.jsx';
import { Modal, Field, Table, useForm } from '../components/ui.jsx';
import { fmtFCFA, fmtDate, today } from '../util.js';
import { 
  ShoppingBag, 
  Plus, 
  AlertCircle, 
  Calendar, 
  Layers, 
  Check, 
  X, 
  CreditCard, 
  Tag, 
  User, 
  Receipt, 
  Calculator,
  Search,
  TrendingDown,
  Store,
  FileText,
  Hash,
  Coins
} from 'lucide-react';

const CATEGORIES = [
  { value: 'aliment', label: 'Alimentation', color: 'emerald' },
  { value: 'poussins', label: 'Poussins', color: 'amber' },
  { value: 'sanitaire', label: 'Sanitaire / Veto', color: 'indigo' },
  { value: 'litiere', label: 'Litière', color: 'amber' },
  { value: 'materiel', label: 'Matériel', color: 'slate' },
  { value: 'carburant', label: 'Carburant', color: 'rose' },
  { value: 'eau', label: 'Eau', color: 'blue' },
  { value: 'electricite', label: 'Électricité', color: 'amber' },
  { value: 'equipement', label: 'Équipement', color: 'slate' },
  { value: 'autre', label: 'Autres charges', color: 'gray' },
];

// ⚠️ BIEN VERIFIER QUE CET EXPORT DEFAULT EST PRESENT ⚠️
export default function Purchases() {
  const { can } = useAuth();
  const [rows, setRows] = useState([]);
  const [bands, setBands] = useState([]);
  const [modal, setModal] = useState(false);
  const [err, setErr] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const load = () => api.get('/finance/purchases').then(setRows).catch(e => setErr(e.message));

  useEffect(() => { 
    load(); 
    api.get('/bands').then(setBands).catch(() => {}); 
  }, []);

  // Calculs statistiques KPI
  const stats = useMemo(() => {
    const total = rows.reduce((sum, r) => sum + Number(r.montant_total || 0), 0);
    const count = rows.length;
    const avg = count > 0 ? total / count : 0;
    return { total, count, avg };
  }, [rows]);

  // Filtrage dynamique des données
  const filteredRows = useMemo(() => {
    if (!searchQuery) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter(r => 
      (r.fournisseur && r.fournisseur.toLowerCase().includes(q)) ||
      (r.description && r.description.toLowerCase().includes(q)) ||
      (r.categorie && r.categorie.toLowerCase().includes(q)) ||
      (r.bande && r.bande.toLowerCase().includes(q))
    );
  }, [rows, searchQuery]);

  return (
    <div className="page-container">
      {/* HEADER DE LA PAGE */}
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-icon icon-rose">
            <ShoppingBag size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2>Achats & Dépenses</h2>
              <span className="pro-pill-rose">Finance</span>
            </div>
            <p className="sub-text">Historique des approvisionnements, charges et factures.</p>
          </div>
        </div>

        {can('achats', 'create') && (
          <button className="btn-primary-fintech" onClick={() => setModal(true)}>
            <Plus size={16} />
            <span>Nouvel achat</span>
          </button>
        )}
      </div>

      {err && (
        <div className="alert alert-error">
          <AlertCircle size={18} />
          <span>{err}</span>
        </div>
      )}

      {/* CARTES DE RENDEMENT / STATS */}
      <div className="kpi-grid-3">
        <div className="quick-kpi-card">
          <div className="kpi-icon-wrapper rose">
            <TrendingDown size={20} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Total des Achats</span>
            <span className="kpi-value text-rose font-mono">{fmtFCFA(stats.total)}</span>
          </div>
        </div>

        <div className="quick-kpi-card">
          <div className="kpi-icon-wrapper indigo">
            <Receipt size={20} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Nombre de transactions</span>
            <span className="kpi-value font-mono">{stats.count} opérations</span>
          </div>
        </div>

        <div className="quick-kpi-card">
          <div className="kpi-icon-wrapper slate">
            <Calculator size={20} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Dépense moyenne</span>
            <span className="kpi-value font-mono">{fmtFCFA(stats.avg)}</span>
          </div>
        </div>
      </div>

      {/* TABLEAU DES DONNÉES */}
      <div className="card-panel-fintech">
        <div className="panel-top-bar">
          <div className="panel-title-sm">
            <Receipt size={16} className="text-slate-400" />
            <span>Journal des charges</span>
          </div>

          <div className="table-search-box">
            <Search size={15} className="search-icon" />
            <input 
              type="text" 
              placeholder="Rechercher par fournisseur, libellé..."
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
              key: 'fournisseur',
              label: 'Fournisseur',
              render: r => (
                <div className="flex items-center gap-1.5 font-medium text-slate-800">
                  <User size={14} className="text-slate-400" />
                  <span>{r.fournisseur || '—'}</span>
                </div>
              )
            },
            {
              key: 'description',
              label: 'Description / Libellé',
              render: r => <span className="text-slate-700">{r.description || '—'}</span>
            },
            {
              key: 'categorie',
              label: 'Catégorie',
              render: r => {
                const catObj = CATEGORIES.find(c => c.value === r.categorie) || { label: r.categorie, color: 'gray' };
                return (
                  <span className={`cat-pill ${catObj.color}`}>
                    <Tag size={11} />
                    {catObj.label}
                  </span>
                );
              }
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
              key: 'mode_paiement',
              label: 'Paiement',
              render: r => (
                <div className="payment-badge">
                  <CreditCard size={12} className="text-slate-400" />
                  <span>{r.mode_paiement || 'Espèces'}</span>
                </div>
              )
            },
            {
              key: 'bande',
              label: 'Bande liée',
              render: r => r.bande ? (
                <span className="badge-band">
                  <Layers size={11} />
                  {r.bande}
                </span>
              ) : <span className="text-slate-400 text-xs italic">—</span>
            },
          ]}
          empty="Aucun achat enregistré."
        />
      </div>

      {/* MODAL DE SAISIE */}
      {modal && (
        <PurchaseModal 
          bands={bands} 
          onClose={() => setModal(false)} 
          onSaved={() => { setModal(false); load(); }} 
          setErr={setErr} 
        />
      )}
    </div>
  );
}

// COMPOSANT MODAL DE SAISIE
function PurchaseModal({ bands, onClose, onSaved, setErr }) {
  const [f, set] = useForm({ 
    date_op: today(), 
    fournisseur: '', 
    description: '', 
    categorie: 'aliment', 
    quantite: 1, 
    prix_unitaire: '', 
    mode_paiement: 'Espèces', 
    band_id: '' 
  });
  const [busy, setBusy] = useState(false);

  const total = Number(f.quantite || 0) * Number(f.prix_unitaire || 0);

  async function save() { 
    if (!f.fournisseur) {
      setErr("Veuillez saisir un fournisseur.");
      return;
    }
    setBusy(true); 
    try { 
      await api.post('/finance/purchases', { ...f, montant_total: total }); 
      onSaved(); 
    } catch (e) { 
      setErr(e.message); 
      setBusy(false); 
    } 
  }

  return (
    <Modal 
       title={<h2 style={{fontSize:'1.25em',color:'#1a7f5a',marginTop:20}}>Saisie d'un achat / dépense</h2> }
      onClose={onClose}
      footer={
        <div className="modal-actions-right">
          <button className="btn-secondary" onClick={onClose}>
            <X size={16} />
            <span>Annuler</span>
          </button>
          <button className="btn-primary-fintech" onClick={save} disabled={busy}>
            <Check size={16} />
            <span>{busy ? 'Enregistrement…' : 'Valider l\'achat'}</span>
          </button>
        </div>
      }
    >
      <div className="fintech-form-container">
        
        {/* FOURNISSEUR */}
        <div className="input-group-styled highlight">
          <label className="input-label">Fournisseur / Prestataire</label>
          <div className="input-icon-wrapper">
            <Store size={18} className="input-icon" />
            <input 
              type="text" 
              className="styled-input text-lg font-medium"
              value={f.fournisseur} 
              onChange={set('fournisseur')} 
              placeholder="Ex: SPC, Total, Couvoir Central..."
              autoFocus 
            />
          </div>
        </div>

        {/* DATE & DESCRIPTION */}
        <div className="form-row-2">
          <div className="input-group-styled">
            <label className="input-label">Date d'opération</label>
            <div className="input-icon-wrapper">
              <Calendar size={16} className="input-icon" />
              <input 
                type="date" 
                className="styled-input"
                value={f.date_op} 
                onChange={set('date_op')} 
              />
            </div>
          </div>

          <div className="input-group-styled">
            <label className="input-label">Désignation / Libellé</label>
            <div className="input-icon-wrapper">
              <FileText size={16} className="input-icon" />
              <input 
                type="text" 
                className="styled-input"
                value={f.description} 
                onChange={set('description')} 
                placeholder="Ex: 10 sacs d'aliment démarrage" 
              />
            </div>
          </div>
        </div>

        {/* CATEGORIE & PAIEMENT */}
        <div className="form-row-2">
          <div className="input-group-styled">
            <label className="input-label">Catégorie de charge</label>
            <div className="input-icon-wrapper">
              <Tag size={16} className="input-icon" />
              <select className="styled-select" value={f.categorie} onChange={set('categorie')}>
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="input-group-styled">
            <label className="input-label">Mode de règlement</label>
            <div className="input-icon-wrapper">
              <CreditCard size={16} className="input-icon" />
              <select className="styled-select" value={f.mode_paiement} onChange={set('mode_paiement')}>
                <option value="Espèces">Espèces / Caisse</option>
                <option value="Mobile Money">Mobile Money (OM/MOMO)</option>
                <option value="Virement">Virement bancaire</option>
                <option value="Chèque">Chèque</option>
              </select>
            </div>
          </div>
        </div>

        {/* QUANTITÉ & PRIX UNITAIRE */}
        <div className="form-row-2">
          <div className="input-group-styled">
            <label className="input-label">Quantité</label>
            <div className="input-icon-wrapper">
              <Hash size={16} className="input-icon" />
              <input 
                type="number" 
                min="1"
                className="styled-input font-mono"
                value={f.quantite} 
                onChange={set('quantite')} 
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
                value={f.prix_unitaire} 
                onChange={set('prix_unitaire')} 
                placeholder="0" 
              />
            </div>
          </div>
        </div>

        {/* BANDE (OPTIONNEL) */}
        <div className="input-group-styled">
          <label className="input-label">Imputation Bande (Optionnel)</label>
          <div className="input-icon-wrapper">
            <Layers size={16} className="input-icon" />
            <select className="styled-select" value={f.band_id} onChange={set('band_id')}>
              <option value="">— Charge générale (Aucune) —</option>
              {bands.map(b => (
                <option key={b.id} value={b.id}>{b.numero} ({b.batiment})</option>
              ))}
            </select>
          </div>
        </div>

        {/* RÉCAPITULATIF FINANCIER DYNAMIQUE */}
        <div className="fintech-summary-card">
          <div className="summary-info">
            <span className="summary-title">Total calculé</span>
            <span className="summary-calc">
              {Number(f.quantite || 0).toLocaleString()} × {Number(f.prix_unitaire || 0).toLocaleString()} FCFA
            </span>
          </div>
          <div className="summary-total-display">
            {fmtFCFA(total)}
          </div>
        </div>

      </div>
    </Modal>
  );
}