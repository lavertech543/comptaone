import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { fmtFCFA, fmtNum, fmtDateTime } from '../util.js';
import './dashboard.css'
import {
  Building2,
  Bird,
  HeartPulse,
  TrendingUp,
  TrendingDown,
  Scale,
  Wallet,
  Landmark,
  Users,
  FileSpreadsheet,
  Bell,
  Check,
  AlertTriangle,
  AlertCircle,
  Info,
  Clock,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

export default function Dashboard() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = async () => {
    try {
      setRefreshing(true);
      await api.post('/notifications/refresh').catch(() => { });

      const data = await api.get('/dashboard');

      if (data && Array.isArray(data.alertes)) {
        data.alertes = data.alertes.filter(a => !a.is_read && !a.is_resolved);
      }

      setD(data);
      window.dispatchEvent(new Event('notifs:reload'));
    } catch (e) {
      setErr(e.message);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function markRead(id) {
    try {
      await api.post(`/notifications/${id}/read`);
      setD(prev => ({
        ...prev,
        alertes: prev.alertes ? prev.alertes.filter(a => a.id !== id) : []
      }));
      window.dispatchEvent(new Event('notifs:reload'));
    } catch (e) {
      console.error('Erreur lors du marquage comme vu :', e);
    }
  }

  if (err) {
    return (
      <div className="alert alert-error">
        <AlertCircle size={20} />
        <span>{err}</span>
      </div>
    );
  }

  if (!d) {
    return (
      <div className="dashboard-loading">
        <div className="skeleton-cards">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton-card" />
          ))}
        </div>
      </div>
    );
  }

  const getSeveriteBadge = (sev, type) => {
    switch (sev) {
      case 'danger':
        return (
          <span className="badge-sev badge-danger">
            <AlertCircle size={13} />
            {type}
          </span>
        );
      case 'warning':
        return (
          <span className="badge-sev badge-warning">
            <AlertTriangle size={13} />
            {type}
          </span>
        );
      default:
        return (
          <span className="badge-sev badge-info">
            <Info size={13} />
            {type}
          </span>
        );
    }
  };

  return (
    <div className="dashboard-container">
      {/* HEADER DE PAGE */}
      <div className="page-header">
        <div>
          <h2>Aperçu général</h2>
          <p className="sub-text">Performances opérationnelles et financières en temps réel.</p>
        </div>
        <button
          className="btn-secondary"
          onClick={loadDashboardData}
          disabled={refreshing}
          title="Actualiser les alertes et données"
        >
          <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
          <span>{refreshing ? 'Actualisation...' : 'Actualiser'}</span>
        </button>
      </div>

      {/* 1. GRILLE DE CARTES KPI */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-head">
            <span className="kpi-title">Bâtiments</span>
            <div className="kpi-icon icon-slate"><Building2 size={20} /></div>
          </div>
          <div className="kpi-value">{fmtNum(d.nb_batiments)}</div>
          <span className="kpi-sub">Infrastructures actives</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-head">
            <span className="kpi-title">Bandes ouvertes</span>
            <div className="kpi-icon icon-emerald"><Bird size={20} /></div>
          </div>
          <div className="kpi-value">{fmtNum(d.bandes_ouvertes)}</div>
          <span className="kpi-sub">Lots en cours d'élevage</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-head">
            <span className="kpi-title">Sujets vivants</span>
            <div className="kpi-icon icon-blue"><HeartPulse size={20} /></div>
          </div>
          <div className="kpi-value">{fmtNum(d.total_sujets)}</div>
          <span className="kpi-sub">Effectif global estimé</span>
        </div>

        {d.financier && (
          <>
            <div className="kpi-card">
              <div className="kpi-head">
                <span className="kpi-title">Recettes</span>
                <div className="kpi-icon icon-emerald"><TrendingUp size={20} /></div>
              </div>
              <div className="kpi-value text-emerald">{fmtFCFA(d.recettes)}</div>
              <span className="kpi-sub">Total encaissé / ventes</span>
            </div>

            <div className="kpi-card">
              <div className="kpi-head">
                <span className="kpi-title">Dépenses</span>
                <div className="kpi-icon icon-amber"><TrendingDown size={20} /></div>
              </div>
              <div className="kpi-value text-amber">{fmtFCFA(d.depenses)}</div>
              <span className="kpi-sub">Achats & charges d'exploitation</span>
            </div>

            <div className="kpi-card">
              <div className="kpi-head">
                <span className="kpi-title">Résultat (Bénéfice)</span>
                <div className={`kpi-icon ${d.benefice >= 0 ? 'icon-emerald' : 'icon-rose'}`}>
                  <Scale size={20} />
                </div>
              </div>
              <div className={`kpi-value ${d.benefice >= 0 ? 'text-emerald' : 'text-rose'}`}>
                {fmtFCFA(d.benefice)}
              </div>
              <span className="kpi-sub">Solde net d'activité</span>
            </div>

            <div className="kpi-card">
              <div className="kpi-head">
                <span className="kpi-title">Trésorerie</span>
                <div className="kpi-icon icon-blue"><Wallet size={20} /></div>
              </div>
              <div className="kpi-value">{fmtFCFA(d.tresorerie)}</div>
              <span className="kpi-sub">Disponibilité immédiate</span>
            </div>

            <div className="kpi-card">
              <div className="kpi-head">
                <span className="kpi-title">Capital investi</span>
                <div className="kpi-icon icon-indigo"><Landmark size={20} /></div>
              </div>
              <div className="kpi-value">{fmtFCFA(d.capital_investi)}</div>
              <span className="kpi-sub">Investissement global</span>
            </div>

            <div className="kpi-card">
              <div className="kpi-head">
                <span className="kpi-title">Masse salariale</span>
                <div className="kpi-icon icon-purple"><Users size={20} /></div>
              </div>
              <div className="kpi-value">{fmtFCFA(d.masse_salariale)}</div>
              <span className="kpi-sub">Rémunérations globales</span>
            </div>

            <div className="kpi-card">
              <div className="kpi-head">
                <span className="kpi-title">Créances en cours</span>
                <div className="kpi-icon icon-rose"><FileSpreadsheet size={20} /></div>
              </div>
              <div className="kpi-value text-rose">{fmtFCFA(d.creances)}</div>
              <span className="kpi-sub">Règlements clients en attente</span>
            </div>
          </>
        )}
      </div>

      {/* 2. SECTION ALERTES */}
      <div id="alertes-systeme" className="card-panel">
        <div className="card-panel-header">
          <div className="panel-title-group">
            <Bell size={20} className="panel-icon text-amber" />
            <h3>Alertes système</h3>
            <span className="count-pill">{d.alertes ? d.alertes.length : 0}</span>
          </div>
        </div>

        {!d.alertes || d.alertes.length === 0 ? (
          <div className="empty-state">
            <ShieldCheck size={32} className="text-emerald" />
            <p>Aucune alerte active pour le moment. Tout est sous contrôle !</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ minWidth: '110px' }}>Type</th>
                  <th style={{ minWidth: '200px' }}>Message</th>
                  <th style={{ minWidth: '90px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {d.alertes.map(a => (
                  <tr key={a.id}>
                    <td>{getSeveriteBadge(a.severite, a.type)}</td>
                    <td className="font-medium text-slate-800">{a.message}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn-action-check"
                        onClick={() => markRead(a.id)}
                        title="Marquer comme vu"
                      >
                        <Check size={15} />
                        <span>Vu</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. UTILISATEURS RÉCEMMENT CONNECTÉS */}
      {d.users_actifs?.length > 0 && (
        <div className="card-panel">
          <div className="card-panel-header">
            <div className="panel-title-group">
              <Clock size={20} className="panel-icon text-indigo" />
              <h3>Utilisateurs récents</h3>
            </div>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>Rôle</th>
                  <th>Dernière connexion</th>
                </tr>
              </thead>
              <tbody>
                {d.users_actifs.map((u, i) => (
                  <tr key={i}>
                    <td>
                      <div className="user-avatar-cell">
                        <div className="avatar-small">
                          {u.full_name ? u.full_name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <span className="font-semibold text-slate-800">{u.full_name}</span>
                      </div>
                    </td>
                    <td>
                      <span className="role-badge">{u.role}</span>
                    </td>
                    <td className="text-slate-500 font-mono text-xs">
                      {fmtDateTime(u.last_login)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}