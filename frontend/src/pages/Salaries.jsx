import { useEffect, useState, useMemo } from 'react';
import { api } from '../api.js';
import './fintech.css';
import { useAuth } from '../context/AuthContext.jsx';
import { Modal, Table, StatusTag } from '../components/ui.jsx';
import { fmtFCFA, fmtDate, today } from '../util.js';
import { 
  Users, 
  Banknote, 
  TrendingUp, 
  Plus, 
  AlertCircle, 
  Calendar, 
  Check, 
  X, 
  CreditCard, 
  UserCheck, 
  Search, 
  Wallet, 
  Smartphone, 
  Building, 
  CheckCircle2, 
  Coins, 
  Briefcase, 
  Clock, 
  Lock,
  Receipt,
  UserPlus,
  ArrowUpRight
} from 'lucide-react';

const PAYMENTS = [
  { value: 'Espèces', label: 'Espèces', icon: Wallet },
  { value: 'Mobile Money', label: 'Mobile Money', icon: Smartphone },
  { value: 'Virement', label: 'Virement', icon: Building },
  { value: 'Chèque', label: 'Chèque', icon: CreditCard },
];

export default function Salaries() {
  const { can } = useAuth();
  const [tab, setTab] = useState('payments');
  const [emps, setEmps] = useState([]);
  const [pays, setPays] = useState([]);
  const [masse, setMasse] = useState([]);
  const [modal, setModal] = useState(null);
  const [err, setErr] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const load = () => {
    api.get('/salaries/employees').then(setEmps).catch(e => setErr(e.message));
    api.get('/salaries/payments').then(setPays).catch(() => {});
    api.get('/salaries/masse').then(setMasse).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  async function pay(r) {
    try {
      await api.post(`/salaries/payments/${r.id}/pay`, { date_paiement: today() });
      load();
    } catch (e) {
      setErr(e.message);
    }
  }

  // Calculs KPI RH & Paie
  const stats = useMemo(() => {
    const activeEmps = emps.filter(e => e.statut === 'actif').length;
    const pendingPays = pays.filter(p => p.statut === 'en_attente');
    const totalPendingAmount = pendingPays.reduce((sum, p) => sum + Number(p.montant || 0), 0);
    const totalPaidAmount = pays.filter(p => p.statut === 'paye').reduce((sum, p) => sum + Number(p.montant || 0), 0);

    return {
      activeEmps,
      pendingCount: pendingPays.length,
      totalPendingAmount,
      totalPaidAmount
    };
  }, [emps, pays]);

  // Filtrage dynamique
  const filteredPays = useMemo(() => {
    if (!searchQuery) return pays;
    const q = searchQuery.toLowerCase();
    return pays.filter(p => 
      (p.employe && p.employe.toLowerCase().includes(q)) ||
      (p.periode && p.periode.toLowerCase().includes(q))
    );
  }, [pays, searchQuery]);

  const filteredEmps = useMemo(() => {
    if (!searchQuery) return emps;
    const q = searchQuery.toLowerCase();
    return emps.filter(e => 
      (e.nom && e.nom.toLowerCase().includes(q)) ||
      (e.poste && e.poste.toLowerCase().includes(q))
    );
  }, [emps, searchQuery]);

  return (
    <div className="page-container">
      {/* HEADER DE LA PAGE */}
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-icon icon-blue">
            <Banknote size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2>Gestion des Salaires & RH</h2>
              <span className="pro-pill-blue">Ressources Humaines</span>
            </div>
            <p className="sub-text">Suivi du personnel, gestion des bulletins et masse salariale.</p>
          </div>
        </div>

        {can('salaires', 'create') && (
          <div className="flex items-center gap-2">
            {tab === 'payments' && (
              <button type="button" className="btn-primary-fintech" onClick={() => setModal({ type: 'pay' })}>
                <Plus size={16} />
                <span>Nouveau paiement</span>
              </button>
            )}
            {tab === 'emps' && (
              <button type="button" className="btn-primary-fintech" onClick={() => setModal({ type: 'emp' })}>
                <UserPlus size={16} />
                <span>Nouvel employé</span>
              </button>
            )}
          </div>
        )}
      </div>

      {err && (
        <div className="alert alert-error">
          <AlertCircle size={18} />
          <span>{err}</span>
        </div>
      )}

      {/* KPI STRIP RH */}
      <div className="kpi-grid-4">
        <div className="quick-kpi-card">
          <div className="kpi-icon-wrapper indigo">
            <Users size={20} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Effectif Actif</span>
            <span className="kpi-value text-indigo font-mono">{stats.activeEmps} employés</span>
          </div>
        </div>

        <div className="quick-kpi-card">
          <div className="kpi-icon-wrapper amber">
            <Clock size={20} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">À payer ({stats.pendingCount})</span>
            <span className="kpi-value text-amber font-mono">{fmtFCFA(stats.totalPendingAmount)}</span>
          </div>
        </div>

        <div className="quick-kpi-card">
          <div className="kpi-icon-wrapper emerald">
            <ArrowUpRight size={20} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Total Salaires Payés</span>
            <span className="kpi-value text-emerald font-mono">{fmtFCFA(stats.totalPaidAmount)}</span>
          </div>
        </div>

        <div className="quick-kpi-card">
          <div className="kpi-icon-wrapper rose">
            <TrendingUp size={20} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Périodes enregistrées</span>
            <span className="kpi-value text-rose font-mono">{masse.length} mois</span>
          </div>
        </div>
      </div>

      {/* NAVIGATION ONGLETS + RECHERCHE */}
      <div className="card-panel-fintech">
        <div className="panel-top-bar flex-wrap gap-3">
          {/* BARRE D'ONGLETS STYLISÉE */}
          <div className="fintech-tabs-group">
            <button
              type="button"
              className={`fintech-tab-btn ${tab === 'payments' ? 'active' : ''}`}
              onClick={() => { setTab('payments'); setSearchQuery(''); }}
            >
              <Banknote size={15} />
              <span>Paiements</span>
              <span className="tab-badge">{pays.length}</span>
            </button>

            <button
              type="button"
              className={`fintech-tab-btn ${tab === 'emps' ? 'active' : ''}`}
              onClick={() => { setTab('emps'); setSearchQuery(''); }}
            >
              <Users size={15} />
              <span>Employés</span>
              <span className="tab-badge">{emps.length}</span>
            </button>

            <button
              type="button"
              className={`fintech-tab-btn ${tab === 'masse' ? 'active' : ''}`}
              onClick={() => { setTab('masse'); setSearchQuery(''); }}
            >
              <TrendingUp size={15} />
              <span>Masse salariale</span>
            </button>
          </div>

          {tab !== 'masse' && (
            <div className="table-search-box">
              <Search size={15} className="search-icon" />
              <input 
                type="text" 
                placeholder={tab === 'payments' ? "Rechercher par employé, période..." : "Rechercher par nom, poste..."}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button type="button" className="clear-search" onClick={() => setSearchQuery('')}>
                  <X size={13} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* ONGLET 1 : PAIEMENTS DE SALAIRES */}
        {tab === 'payments' && (
          <Table 
            rows={filteredPays} 
            columns={[
              {
                key: 'employe',
                label: 'Employé',
                render: r => (
                  <div className="flex items-center gap-2">
                    <UserCheck size={14} className="text-slate-400" />
                    <span className="font-semibold text-slate-800">{r.employe}</span>
                  </div>
                )
              },
              {
                key: 'periode',
                label: 'Période',
                render: r => (
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {r.periode}
                  </span>
                )
              },
              {
                key: 'montant',
                label: 'Montant',
                render: r => (
                  <span className="font-mono font-bold text-slate-800">
                    {fmtFCFA(r.montant)}
                  </span>
                )
              },
              {
                key: 'date_paiement',
                label: 'Date règlement',
                render: r => (
                  <div className="table-date-cell">
                    <Calendar size={13} className="text-slate-400" />
                    <span>{r.date_paiement ? fmtDate(r.date_paiement) : '—'}</span>
                  </div>
                )
              },
              {
                key: 'statut',
                label: 'Statut',
                render: r => <StatusTag value={r.statut} />
              }
            ]}
            actions={can('salaires', 'edit') ? (r) => r.statut === 'en_attente' ? (
              <button 
                type="button" 
                className="btn-primary-fintech btn-sm" 
                onClick={() => pay(r)}
              >
                <Check size={13} />
                <span>Marquer payé</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-slate-400 font-medium px-2 py-1 bg-slate-50 rounded">
                <Lock size={12} /> Traité
              </span>
            ) : null}
            empty="Aucun paiement de salaire enregistré."
          />
        )}

        {/* ONGLET 2 : LISTE DES EMPLOYÉS */}
        {tab === 'emps' && (
          <Table 
            rows={filteredEmps} 
            columns={[
              {
                key: 'nom',
                label: 'Nom & Prénom',
                render: r => (
                  <div className="flex items-center gap-2">
                    <UserCheck size={14} className="text-slate-400" />
                    <span className="font-semibold text-slate-800">{r.nom}</span>
                  </div>
                )
              },
              {
                key: 'poste',
                label: 'Poste / Fonction',
                render: r => (
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Briefcase size={13} className="text-slate-400" />
                    <span>{r.poste || '—'}</span>
                  </div>
                )
              },
              {
                key: 'salaire_ref',
                label: 'Salaire de référence',
                render: r => (
                  <span className="font-mono font-semibold text-emerald-600">
                    {fmtFCFA(r.salaire_ref)}
                  </span>
                )
              },
              {
                key: 'date_entree',
                label: 'Date d\'embauche',
                render: r => (
                  <div className="table-date-cell">
                    <Calendar size={13} className="text-slate-400" />
                    <span>{fmtDate(r.date_entree)}</span>
                  </div>
                )
              },
              {
                key: 'statut',
                label: 'Statut',
                render: r => <StatusTag value={r.statut} />
              }
            ]}
            empty="Aucun employé répertorié."
          />
        )}

        {/* ONGLET 3 : MASSE SALARIALE */}
        {tab === 'masse' && (
          <Table 
            rows={masse} 
            columns={[
              {
                key: 'periode',
                label: 'Période (Mois)',
                render: r => (
                  <span className="font-mono font-bold text-slate-800">
                    {r.periode}
                  </span>
                )
              },
              {
                key: 'nb',
                label: 'Nombre de paiements',
                render: r => (
                  <span className="font-mono text-slate-600">
                    {r.nb} fiche(s)
                  </span>
                )
              },
              {
                key: 'en_attente',
                label: 'En attente',
                render: r => (
                  <span className={`font-mono font-semibold ${r.en_attente > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                    {r.en_attente}
                  </span>
                )
              },
              {
                key: 'masse',
                label: 'Masse Salariale Totale',
                render: r => (
                  <span className="font-mono font-bold text-emerald-600 text-sm">
                    {fmtFCFA(r.masse)}
                  </span>
                )
              }
            ]}
            empty="Aucune donnée de masse salariale disponible."
          />
        )}
      </div>

      {modal && (
        <SalModal 
          modal={modal} 
          emps={emps} 
          onClose={() => setModal(null)} 
          onSaved={() => { setModal(null); load(); }} 
          setErr={setErr} 
        />
      )}
    </div>
  );
}

// MODAL CRÉATION EMPLOYÉ / FICHES DE PAIEMENT
function SalModal({ modal, emps, onClose, onSaved, setErr }) {
  const isEmp = modal.type === 'emp';

  const [f, setF] = useState(
    isEmp ? {
      nom: '',
      poste: '',
      salaire_ref: '',
      date_entree: today(),
      statut: 'actif'
    } : {
      employee_id: '',
      periode: new Date().toISOString().slice(0, 7),
      montant: '',
      date_paiement: today(),
      mode_paiement: 'Espèces',
      statut: 'en_attente'
    }
  );

  const [busy, setBusy] = useState(false);

  const handleChange = (field, value) => {
    setF(prev => {
      const updated = { ...prev, [field]: value };
      
      if (field === 'employee_id' && value) {
        const selectedEmp = emps.find(e => String(e.id) === String(value));
        if (selectedEmp && selectedEmp.salaire_ref) {
          updated.montant = selectedEmp.salaire_ref;
        }
      }
      return updated;
    });
  };

  async function save(e) {
    if (e) e.preventDefault();

    if (isEmp && !f.nom) {
      if (setErr) setErr("Veuillez renseigner le nom de l'employé.");
      return;
    }

    if (!isEmp && (!f.employee_id || !f.montant)) {
      if (setErr) setErr("Veuillez sélectionner un employé et saisir un montant.");
      return;
    }

    setBusy(true);
    try {
      if (isEmp) {
        await api.post('/salaries/employees', f);
      } else {
        await api.post('/salaries/payments', f);
      }
      onSaved();
    } catch (e) {
      if (setErr) setErr(e.message);
      setBusy(false);
    }
  }

  // Header stylisé du Modal
  const modalHeaderTitle = isEmp ? (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
        <UserPlus size={20} />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-slate-900 leading-tight">
            Nouvel Employé
          </h3>
          <span className="text-[11px] font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
            Fiche RH
          </span>
        </div>
        <p className="text-xs text-slate-500 font-normal mt-0.5">
          Ajout d'un membre du personnel dans le registre.
        </p>
      </div>
    </div>
  ) : (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
        <Banknote size={20} />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-slate-900 leading-tight" style={{color:'#10b981'}}>
            Nouveau paiement de salaire
          </h2>
         
        </div>
        
      </div>
    </div>
  );

  return (
    <Modal 
      title={modalHeaderTitle} 
      onClose={onClose}
      footer={
        <div className="modal-actions-right">
          <button type="button" className="btn-secondary" onClick={onClose}>
            <X size={16} />
            <span>Annuler</span>
          </button>
          <button type="button" className="btn-primary-fintech" onClick={save} disabled={busy}>
            <Check size={16} />
            <span>{busy ? 'Enregistrement…' : isEmp ? 'Enregistrer l\'employé' : 'Valider le paiement'}</span>
          </button>
        </div>
      }
    >
      <div className="fintech-form-container">
        {isEmp ? (
          /* ================= FORMULAIRE EMPLOYÉ ================= */
          <>
            <div className="input-group-styled">
              <label className="input-label">Nom & Prénom de l'employé</label>
              <div className="input-icon-wrapper">
                <UserCheck size={16} className="input-icon" />
                <input 
                  type="text" 
                  className="styled-input"
                  value={f.nom || ''} 
                  onChange={e => handleChange('nom', e.target.value)} 
                  placeholder="Ex: Jean Kouassi"
                  autoFocus
                />
              </div>
            </div>

            <div className="form-row-2">
              <div className="input-group-styled">
                <label className="input-label">Poste / Intitulé de fonction</label>
                <div className="input-icon-wrapper">
                  <Briefcase size={16} className="input-icon" />
                  <input 
                    type="text" 
                    className="styled-input"
                    value={f.poste || ''} 
                    onChange={e => handleChange('poste', e.target.value)} 
                    placeholder="Ex: Technicien Avicole, Chauffeur..."
                  />
                </div>
              </div>

              <div className="input-group-styled highlight">
                <label className="input-label">Salaire mensuel de référence (FCFA)</label>
                <div className="input-icon-wrapper">
                  <Coins size={18} className="input-icon text-amber-500" />
                  <input 
                    type="number" 
                    className="styled-input font-mono font-bold"
                    value={f.salaire_ref || ''} 
                    onChange={e => handleChange('salaire_ref', e.target.value)} 
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div className="input-group-styled">
              <label className="input-label">Date d'embauche / Entrée</label>
              <div className="input-icon-wrapper">
                <Calendar size={16} className="input-icon" />
                <input 
                  type="date" 
                  className="styled-input"
                  value={f.date_entree || ''} 
                  onChange={e => handleChange('date_entree', e.target.value)} 
                />
              </div>
            </div>
          </>
        ) : (
          /* ================= FORMULAIRE PAIEMENT DE SALAIRE ================= */
          <>
            <div className="input-group-styled">
              <label className="input-label">Sélectionner l'employé</label>
              <div className="input-icon-wrapper">
                <UserCheck size={16} className="input-icon" />
                <select 
                  className="styled-input"
                  value={f.employee_id || ''} 
                  onChange={e => handleChange('employee_id', e.target.value)}
                >
                  <option value="">— Choisir un employé actif —</option>
                  {emps.filter(e => e.statut === 'actif').map(e => (
                    <option key={e.id} value={e.id}>
                      {e.nom} — {e.poste} ({fmtFCFA(e.salaire_ref)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row-2">
              <div className="input-group-styled">
                <label className="input-label">Période concernée (AAAA-MM)</label>
                <div className="input-icon-wrapper">
                  <Calendar size={16} className="input-icon" />
                  <input 
                    type="month" 
                    className="styled-input font-mono"
                    value={f.periode || ''} 
                    onChange={e => handleChange('periode', e.target.value)} 
                  />
                </div>
              </div>

              <div className="input-group-styled highlight">
                <label className="input-label">Montant du salaire (FCFA)</label>
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
            </div>

            <div className="form-row-2">
              <div className="input-group-styled">
                <label className="input-label">Statut du paiement</label>
                <div className="input-icon-wrapper">
                  <Receipt size={16} className="input-icon" />
                  <select 
                    className="styled-input"
                    value={f.statut || 'en_attente'} 
                    onChange={e => handleChange('statut', e.target.value)}
                  >
                    <option value="en_attente">⏳ En attente</option>
                    <option value="paye">✅ Payé immédiatement</option>
                  </select>
                </div>
              </div>

              <div className="input-group-styled">
                <label className="input-label">Date d'effet / Règlement</label>
                <div className="input-icon-wrapper">
                  <Calendar size={16} className="input-icon" />
                  <input 
                    type="date" 
                    className="styled-input"
                    value={f.date_paiement || ''} 
                    onChange={e => handleChange('date_paiement', e.target.value)} 
                  />
                </div>
              </div>
            </div>

            {/* SÉLECTION DU MODE DE PAIEMENT AVEC ATTRIBUT DATA-MODE POUR LES COULEURS */}
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
                      data-mode={p.value}
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
        )}
      </div>
    </Modal>
  );
}