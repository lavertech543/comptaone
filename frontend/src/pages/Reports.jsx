import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Lock, 
  Loader2, 
  FileSpreadsheet, 
  TrendingUp, 
  Users, 
  Layers,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { getToken } from '../api.js';

const REPORTS = [
  { 
    id: 'financial',
    path: 'financial.pdf', 
    label: 'Rapport financier de synthèse', 
    desc: 'Recettes, charges et résultat global sur la période sélectionnée.',
    icon: TrendingUp,
    badgeText: 'Financier',
    badgeType: 'emerald'
  },
  { 
    id: 'bands',
    path: 'bands.pdf', 
    label: 'Rapport par bande', 
    desc: 'Indicateurs zootechniques, performances et chiffre d’affaires par bande.',
    icon: Layers,
    badgeText: 'Production',
    badgeType: 'blue'
  },
  { 
    id: 'salaries',
    path: 'salaries.pdf', 
    label: 'Rapport des salaires', 
    desc: 'Répartition de la masse salariale et détails par période.',
    icon: Users,
    badgeText: 'RH & Paie',
    badgeType: 'amber'
  },
];

// Composant Bouton interactif autonome avec gestion interne du hover & click
function ReportButton({ onClick, isLoading }) {
  const [hovered, setHovered] = useState(false);
  const [active, setActive] = useState(false);

  // Styles dynamiques selon l'état du bouton
  let backgroundColor = '#2563eb'; // Couleur par défaut
  let transform = 'none';
  let boxShadow = '0 1px 2px rgba(37, 99, 235, 0.2)';

  if (active) {
    backgroundColor = '#1e3a8a'; // Couleur au clic (Bleu foncé)
    transform = 'scale(0.98)';
  } else if (hovered) {
    backgroundColor = '#1d4ed8'; // Couleur au survol
    transform = 'translateY(-1px)';
    boxShadow = '0 4px 12px rgba(37, 99, 235, 0.35)';
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setActive(false); }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      style={{
        width: '100%',
        padding: '0.65rem 1rem',
        borderRadius: '0.6rem',
        border: 'none',
        backgroundColor: isLoading ? '#94a3b8' : backgroundColor,
        color: '#ffffff',
        fontSize: '0.825rem',
        fontWeight: '600',
        cursor: isLoading ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        transition: 'all 0.15s ease-in-out',
        transform: transform,
        boxShadow: boxShadow
      }}
    >
      {isLoading ? (
        <>
          <Loader2 size={16} className="animate-spin" />
          <span>Génération en cours…</span>
        </>
      ) : (
        <>
          <Download size={16} />
          <span>Générer le PDF</span>
        </>
      )}
    </button>
  );
}

export default function Reports() {
  const { can } = useAuth();
  const [loadingPath, setLoadingPath] = useState(null);

  async function handleOpenReport(path) {
    setLoadingPath(path);
    try {
      const res = await fetch(`/api/reports/${path}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      if (!res.ok) {
        alert('Erreur lors de la génération du rapport.');
        return;
      }

      const blob = await res.blob();
      const fileURL = URL.createObjectURL(blob);
      const newTab = window.open(fileURL, '_blank');
      if (newTab) {
        setTimeout(() => URL.revokeObjectURL(fileURL), 10000);
      }
    } catch (err) {
      console.error('Erreur rapport:', err);
      alert('Impossible de contacter le serveur.');
    } finally {
      setLoadingPath(null);
    }
  }

  const isAllowedToExport = can ? can('rapports', 'export') : true;

  return (
    <div style={{ padding: '1.5rem', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.6rem', backgroundColor: '#eff6ff', borderRadius: '0.75rem', color: '#2563eb' }}>
            <FileSpreadsheet size={22} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
              Rapports & Exports
            </h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
              Générez et téléchargez vos bilans d'activité au format PDF.
            </p>
          </div>
        </div>
      </div>

      {/* BANNIÈRE NOTE */}
      <div style={{ 
        padding: '0.85rem 1rem', 
        backgroundColor: '#f8fafc', 
        border: '1px solid #e2e8f0', 
        borderRadius: '0.75rem', 
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        fontSize: '0.825rem',
        color: '#475569'
      }}>
        <Sparkles size={16} style={{ color: '#2563eb', flexShrink: 0 }} />
        <span><strong>Note d'impression :</strong> Les rapports sont générés avec en-tête, logo et pied de page officiels.</span>
      </div>

      {/* GRILLE DES CARTES (Flexbox forcée sur toute la hauteur) */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '1.25rem',
        alignItems: 'stretch' // Force toutes les cartes de la ligne à avoir la même hauteur
      }}>
        {REPORTS.map((r) => {
          const IconComponent = r.icon;
          const isLoading = loadingPath === r.path;

          return (
            <div 
              key={r.path} 
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '0.85rem',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column', // Disposition verticale pour pousser le bouton vers le bas
                justify: 'space-between',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}
            >
              {/* Contenu haut de la carte */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ padding: '0.5rem', backgroundColor: '#f1f5f9', borderRadius: '0.5rem', color: '#334155' }}>
                    <IconComponent size={20} />
                  </div>
                  <span className={`status-tag ${r.badgeType === 'emerald' ? 'paye' : r.badgeType === 'amber' ? 'en_attente' : 'actif'}`}>
                    <span className={`status-dot ${r.badgeType === 'emerald' ? 'dot-emerald' : r.badgeType === 'amber' ? 'dot-amber' : 'dot-emerald'}`} />
                    {r.badgeText}
                  </span>
                </div>

                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                  {r.label}
                </h3>
                <p style={{ margin: 0, fontSize: '0.825rem', color: '#64748b', lineHeight: '1.4', marginBottom: '1.5rem' }}>
                  {r.desc}
                </p>
              </div>

              {/* Zone bouton ALIGNÉE EN BAS via margin-top: auto */}
              <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                {isAllowedToExport ? (
                  <ReportButton 
                    onClick={() => handleOpenReport(r.path)} 
                    isLoading={isLoading} 
                  />
                ) : (
                  <div className="status-tag inactif" style={{ width: '100%', justifyContent: 'center', padding: '0.5rem' }}>
                    <Lock size={13} />
                    <span>Export non autorisé</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}