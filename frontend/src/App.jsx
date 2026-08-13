import { useState, useEffect } from 'react';
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { api } from './api.js';
import Login from './pages/Login.jsx';
import SetPassword from './pages/SetPassword.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Buildings from './pages/Buildings.jsx';
import Bands from './pages/Bands.jsx';
import Production from './pages/Production.jsx';
import Stock from './pages/Stock.jsx';
import Purchases from './pages/Purchases.jsx';
import Sales from './pages/Sales.jsx';
import Transactions from './pages/Transactions.jsx';
import Accounting from './pages/Accounting.jsx';
import Receivables from './pages/Receivables.jsx';
import Salaries from './pages/Salaries.jsx';
import './tek.css';
import Corrections from './pages/Corrections.jsx';
import Audit from './pages/Audit.jsx';
import User from './pages/Users.jsx';
import Reports from './pages/Reports.jsx';
import Setting from './pages/Settings.jsx';
import logoNk from './pages/photo.png';
import { 
  LayoutDashboard, 
  Building2, 
  Bird, 
  Wheat, 
  Package, 
  ShoppingBag, 
  TrendingUp, 
  Receipt, 
  Calculator, 
  FileSpreadsheet, 
  Users, 
  FileText, 
  Wrench, 
  ShieldCheck, 
  UserCog, 
  Settings,
  Bell,
  Menu,
  LogOut
} from 'lucide-react';

const MENU = [
  { to: '/', label: 'Tableau de bord', icon: LayoutDashboard, module: null },
  { to: '/batiments', label: 'Bâtiments', icon: Building2, module: 'batiments' },
  { to: '/bandes', label: 'Bandes', icon: Bird, module: 'bandes' },
  { to: '/production', label: 'Production', icon: Wheat, module: 'alimentation' },
  { to: '/stocks', label: 'Stocks', icon: Package, module: 'stocks' },
  { to: '/achats', label: 'Achats', icon: ShoppingBag, module: 'achats' },
  { to: '/ventes', label: 'Ventes', icon: TrendingUp, module: 'ventes' },
  { to: '/depenses', label: 'Dépenses / Recettes', icon: Receipt, module: 'depenses' },
  { to: '/comptabilite', label: 'Comptabilité', icon: Calculator, module: 'comptabilite' },
  { to: '/creances', label: 'Créances', icon: FileSpreadsheet, module: 'creances' },
  { to: '/salaires', label: 'Salaires', icon: Users, module: 'salaires' },
  { to: '/rapports', label: 'Rapports', icon: FileText, module: 'rapports' },
  { to: '/audit', label: "Journal d'audit", icon: ShieldCheck, module: 'audit', adminOnly: true },
  { to: '/utilisateurs', label: 'Utilisateurs', icon: UserCog, module: 'utilisateurs', adminOnly: true },
  { to: '/parametres', label: 'Paramètres', icon: Settings, module: null, adminOnly: true },
];

function roleLabel(r) {
  return {
    admin: 'Administrateur',
    production: 'Employé de production',
    magasinier: 'Magasinier',
    comptable: 'Comptable',
    responsable: 'Responsable de ferme',
    veterinaire:'veterinaire'
  }[r] || r;
}

function Layout({ children }) {
  const { user, logout, can } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const loc = useLocation();

  useEffect(() => { setOpen(false); }, [loc]);
  useEffect(() => {
    const load = () => api.get('/notifications').then(setNotifs).catch(() => {});
    load(); 
    const id = setInterval(load, 60000); 
    return () => clearInterval(id);
  }, []);

  const visible = MENU.filter(m => {
    if (m.adminOnly && user?.role !== 'admin') return false;
    if (!m.module) return true;
    return can(m.module, 'view');
  });

  const unread = notifs.filter(n => !n.is_read).length;
  const title = visible.find(m => m.to === loc.pathname)?.label || 'NK_AVICOLE';

  return (
    <div className="layout">
      {/* 1. SIDEBAR */}
      <aside className={'sidebar' + (open ? ' open' : '')}>
        <div className="brand">
          <img src={logoNk} alt="N&K SARL" className="sidebar-logo-img" />
          <span className='login-header sub'>ComptaOne</span>
       </div>
        <nav>
          {visible.map(m => {
            const IconComponent = m.icon;
            return (
              <NavLink 
                key={m.to} 
                to={m.to} 
                end={m.to === '/'}
              >
                <IconComponent size={18} />
                <span>{m.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="role">
          <strong>{user?.full_name || 'Utilisateur'}</strong>
          <span>{roleLabel(user?.role)}</span>
        </div>
      </aside>

      {/* 2. ZONE PRINCIPALE (MAIN) */}
      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button className="hamburger" onClick={() => setOpen(!open)} aria-label="Menu">
              <Menu size={20} />
            </button>
            <h1>{title}</h1>
          </div>

          <div className="topbar-actions">
            <NavLink to="/" className="notif-btn" title="Alertes">
              <Bell size={18} />
              {unread > 0 && <span className="badge">{unread}</span>}
            </NavLink>
            
            <button className="btn-logout" onClick={logout} title="Se déconnecter">
              <LogOut size={16} />
              <span>Déconnexion</span>
            </button>
          </div>
        </header>
        
        <main className="content">
          {children}
        </main>
      </div>
    </div>
  );
}

function Guard({ module, action='view', children }) {
  const { can } = useAuth();
  if (module && !can(module, action)) return <div className="empty">Accès non autorisé à ce module.</div>;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();

  // Route d'activation de compte, accessible même sans connexion
  if (window.location.pathname === '/set-password') {
    return <SetPassword />;
  }

  if (loading) return <div className="login"><div className="login-box center">Chargement…</div></div>;
  if (!user) return <Login />;
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/batiments" element={<Guard module="batiments"><Buildings /></Guard>} />
        <Route path="/bandes" element={<Guard module="bandes"><Bands /></Guard>} />
        <Route path="/production" element={<Guard module="alimentation"><Production /></Guard>} />
        <Route path="/stocks" element={<Guard module="stocks"><Stock /></Guard>} />
        <Route path="/achats" element={<Guard module="achats"><Purchases /></Guard>} />
        <Route path="/ventes" element={<Guard module="ventes"><Sales /></Guard>} />
        <Route path="/depenses" element={<Guard module="depenses"><Transactions /></Guard>} />
        <Route path="/comptabilite" element={<Guard module="comptabilite"><Accounting /></Guard>} />
        <Route path="/creances" element={<Guard module="creances"><Receivables /></Guard>} />
        <Route path="/salaires" element={<Guard module="salaires"><Salaries /></Guard>} />
        <Route path="/rapports" element={<Guard module="rapports"><Reports /></Guard>} />
        <Route path="/audit" element={<Guard module="audit"><Audit /></Guard>} />
        <Route path="/utilisateurs" element={<Guard module="utilisateurs"><User /></Guard>} />
        <Route path="/parametres" element={<Setting />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  );
}