import { useEffect, useState, useMemo } from 'react';
import { api } from '../api.js';
import './type.css'
import { Table } from '../components/ui.jsx';
import { fmtFCFA } from '../util.js';
import { 
  Calculator, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Scale, 
  Wallet, 
  AlertCircle, 
  Layers, 
  PieChart,
  Home,
  TrendingUp,
  Activity,
  FileSpreadsheet
} from 'lucide-react';

export default function Accounting() {
  const [s, setS] = useState(null);
  const [bands, setBands] = useState([]);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/accounting/summary'),
      api.get('/accounting/bands')
    ])
      .then(([summaryRes, bandsRes]) => {
        setS(summaryRes);
        setBands(bandsRes || []);
      })
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (err) {
    return (
      <div className="page-container">
        <div className="alert alert-error">
          <AlertCircle size={18} />
          <span>{err}</span>
        </div>
      </div>
    );
  }

  if (loading || !s) {
    return (
      <div className="page-container flex items-center justify-center min-h-[300px]">
        <div className="text-center text-slate-500">
          <div className="animate-spin mb-3 inline-block">
            <Calculator size={28} className="text-blue-500" />
          </div>
          <p className="text-sm font-medium">Chargement des données comptables…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* HEADER DE LA PAGE */}
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-icon icon-blue">
            <Calculator size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2>Comptabilité & Analyse</h2>
              <span className="pro-pill-blue">Synthèse globale</span>
            </div>
            <p className="sub-text">Suivi financier de l'exploitation et rentabilité par bande avicole.</p>
          </div>
        </div>
      </div>

      {/* KPI STRIP GLOBAL */}
      <div className="kpi-grid-5">
        {/* Recettes */}
        <div className="quick-kpi-card">
          <div className="kpi-icon-wrapper emerald">
            <ArrowUpRight size={20} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Recettes totales</span>
            <span className="kpi-value text-emerald font-mono">{fmtFCFA(s.recettes_totales)}</span>
          </div>
        </div>

        {/* Charges */}
        <div className="quick-kpi-card">
          <div className="kpi-icon-wrapper amber">
            <ArrowDownLeft size={20} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Charges totales</span>
            <span className="kpi-value text-amber font-mono">{fmtFCFA(s.charges_totales)}</span>
          </div>
        </div>

        {/* Résultat Net */}
        <div className="quick-kpi-card">
          <div className={`kpi-icon-wrapper ${s.resultat >= 0 ? 'emerald' : 'rose'}`}>
            <Scale size={20} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Résultat Net</span>
            <span className={`kpi-value font-mono ${s.resultat >= 0 ? 'text-emerald' : 'text-rose'}`}>
              {fmtFCFA(s.resultat)}
            </span>
          </div>
        </div>

        {/* Trésorerie */}
        <div className="quick-kpi-card">
          <div className="kpi-icon-wrapper indigo">
            <Wallet size={20} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Trésorerie</span>
            <span className="kpi-value text-indigo font-mono">{fmtFCFA(s.tresorerie)}</span>
          </div>
        </div>

        {/* Créances */}
        <div className="quick-kpi-card">
          <div className="kpi-icon-wrapper rose">
            <AlertCircle size={20} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Créances en cours</span>
            <span className="kpi-value text-rose font-mono">{fmtFCFA(s.creances_en_cours)}</span>
          </div>
        </div>
      </div>

      {/* SECTION TABLEAU PAR BANDE */}
      <div className="card-panel-fintech">
        <div className="panel-top-bar">
          <div className="panel-title-sm">
            <Layers size={16} className="text-slate-400" />
            <span>Situation & Indicateurs de performance par bande</span>
          </div>
        </div>

        <Table 
          rows={bands} 
          columns={[
            {
              key: 'numero',
              label: 'Bande',
              render: r => (
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Layers size={14} className="text-blue-500" />
                  <span>Bande n°{r.numero}</span>
                </div>
              )
            },
            {
              key: 'batiment',
              label: 'Bâtiment',
              render: r => r.batiment ? (
                <div className="flex items-center gap-1 text-slate-600">
                  <Home size={13} className="text-slate-400" />
                  <span>{r.batiment}</span>
                </div>
              ) : <span className="text-slate-400 text-xs">—</span>
            },
            {
              key: 'taux_mortalite',
              label: 'Mortalité',
              render: r => {
                const val = Number(r.taux_mortalite || 0);
                const isHigh = val > 5; // Seuil d'alerte à adapter
                return (
                  <span className={`font-mono text-xs font-semibold px-2 py-0.5 rounded-full ${isHigh ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-700'}`}>
                    {r.taux_mortalite}%
                  </span>
                );
              }
            },
            {
              key: 'taux_viabilite',
              label: 'Viabilité',
              render: r => (
                <span className="font-mono text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  {r.taux_viabilite}%
                </span>
              )
            },
            {
              key: 'indice_consommation',
              label: 'IC',
              render: r => (
                <span className="font-mono text-slate-700">
                  {r.indice_consommation ?? '—'}
                </span>
              )
            },
            {
              key: 'poids_moyen_vente',
              label: 'Poids moy.',
              render: r => r.poids_moyen_vente ? (
                <span className="font-mono text-slate-800 font-medium">
                  {r.poids_moyen_vente} kg
                </span>
              ) : <span className="text-slate-400 text-xs">—</span>
            },
            {
              key: 'cout_revient_sujet',
              label: 'Coût/sujet',
              render: r => r.cout_revient_sujet ? (
                <span className="font-mono text-slate-700">
                  {fmtFCFA(r.cout_revient_sujet)}
                </span>
              ) : <span className="text-slate-400 text-xs">—</span>
            },
            {
              key: 'ca',
              label: 'Chiffre d\'Affaires',
              render: r => (
                <span className="font-mono font-semibold text-slate-800">
                  {fmtFCFA(r.ca)}
                </span>
              )
            },
            {
              key: 'resultat',
              label: 'Résultat',
              render: r => {
                const isPos = r.resultat >= 0;
                return (
                  <span className={`font-mono font-bold ${isPos ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {isPos ? '+' : ''}{fmtFCFA(r.resultat)}
                  </span>
                );
              }
            }
          ]}
          empty="Aucune bande trouvée pour l'analyse comptable."
        />
      </div>
    </div>
  );
}