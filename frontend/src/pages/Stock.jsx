import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import ProductModal from './ProductModal';
import StockModal from './StockModal';
import styles from './Stock.module.css';

// --- Composants d'icônes SVG pour un rendu pro ---

// Icône principale pour le titre "Stock & Inventaire" (Box/Package)
const IconStockTitle = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);

const IconDownload = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
);

const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
);

const IconArrowsExchange = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10l5-5 5 5"/><path d="M12 5v14"/><path d="M17 14l-5 5-5-5"/></svg>
);

const IconArchive = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
);

const IconEdit = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
);

const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
);

const IconRefresh = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
);

const IconAlertTriangle = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
);

const IconArrowDown = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
);

const IconArrowUp = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
);

export default function Stock() {
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtres et onglets
  const [activeTab, setActiveTab] = useState('products');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [showArchived, setShowArchived] = useState(false);

  // Filtres spécifiques aux mouvements
  const [movementSearch, setMovementSearch] = useState('');
  const [movementSensFilter, setMovementSensFilter] = useState('ALL');

  // Modales & Mouvement Rapide
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [selectedProductToEdit, setSelectedProductToEdit] = useState(null);
  const [quickProductId, setQuickProductId] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [resProducts, resMovements] = await Promise.all([
        api.get('/stock/products'),
        api.get('/stock/movements')
      ]);
      
      const prodData = resProducts.data ?? resProducts;
      const movData = resMovements.data ?? resMovements;

      setProducts(Array.isArray(prodData) ? prodData : []);
      setMovements(Array.isArray(movData) ? movData : []);
    } catch (err) {
      console.error('Erreur de chargement des stocks :', err);
      setError('Impossible de charger les données de stock.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenCreateModal = () => {
    setSelectedProductToEdit(null);
    setIsProductModalOpen(true);
  };

  const handleOpenEditModal = (product) => {
    setSelectedProductToEdit(product);
    setIsProductModalOpen(true);
  };

  const handleOpenQuickMovement = (product) => {
    setQuickProductId(product.id);
    setIsMovementModalOpen(true);
  };

  const checkHasHistory = (productId) => {
    return movements.some((m) => Number(m.product_id) === Number(productId));
  };

  const handleDeleteProduct = async (product) => {
    const hasHistory = checkHasHistory(product.id);

    if (hasHistory) {
      const confirmArchive = window.confirm(
        `Impossible de supprimer définitivement "${product.nom}".\n\n` +
        `Ce produit est lié à un historique de mouvements. Souhaitez-vous l'ARCHIVER ?`
      );

      if (confirmArchive) {
        try {
          await api.put(`/stock/products/${product.id}`, { ...product, archive: true });
          await fetchData();
        } catch (err) {
          console.error("Erreur d'archivage :", err);
          alert(err.response?.data?.error || "Erreur lors de l'archivage.");
        }
      }
      return;
    }

    const confirmDelete = window.confirm(`Supprimer définitivement "${product.nom}" ?`);
    if (confirmDelete) {
      try {
        await api.del(`/stock/products/${product.id}`);
        await fetchData();
      } catch (err) {
        console.error("Erreur de suppression :", err);
        alert(err.response?.data?.error || "Impossible de supprimer ce produit.");
      }
    }
  };

  const handleRestoreProduct = async (product) => {
    if (window.confirm(`Restaurer "${product.nom}" dans l'inventaire actif ?`)) {
      try {
        await api.put(`/stock/products/${product.id}`, { ...product, archive: false });
        await fetchData();
      } catch (err) {
        console.error("Erreur de restauration :", err);
        alert("Impossible de restaurer ce produit.");
      }
    }
  };

  // Exportation de l'inventaire en CSV
  const exportCSV = () => {
    if (filteredProducts.length === 0) {
      alert("Aucun produit à exporter.");
      return;
    }
    const headers = ["ID", "Nom", "Catégorie", "Quantité", "Unité", "Seuil Minimal", "Statut"];
    const rowsData = filteredProducts.map(p => [
      p.id,
      `"${(p.nom || '').replace(/"/g, '""')}"`,
      `"${(p.categorie || p.category || 'Général').replace(/"/g, '""')}"`,
      p.quantite,
      `"${p.unite || ''}"`,
      p.seuil_min,
      !p.is_active ? "Archivé" : (p.alerte ? "Stock Bas" : "En Stock")
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(";"), ...rowsData.map(e => e.join(";"))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `inventaire_stock_NK_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtrage des Produits
  const filteredProducts = products.filter((p) => {
    const productName = p.nom ? p.nom.toLowerCase() : '';
    const matchesSearch = productName.includes(search.toLowerCase());
    const productCategory = p.categorie || p.category || 'Général';
    const matchesCategory = selectedCategory === 'ALL' || productCategory === selectedCategory;
    const isArchived = !Boolean(p.is_active);
    const matchesArchiveState = showArchived ? isArchived : !isArchived;

    return matchesSearch && matchesCategory && matchesArchiveState;
  });

  // Filtrage des Mouvements
  const filteredMovements = movements.filter((m) => {
    const productName = m.produit ? m.produit.toLowerCase() : '';
    const motif = m.motif ? m.motif.toLowerCase() : '';
    const term = movementSearch.toLowerCase();
    const matchesSearch = productName.includes(term) || motif.includes(term);
    const matchesSens = movementSensFilter === 'ALL' || m.sens === movementSensFilter;
    return matchesSearch && matchesSens;
  });

  const totalProducts = products.filter((p) => Boolean(p.is_active)).length;
  const alertProducts = products.filter((p) => Boolean(p.is_active) && Boolean(p.alerte)).length;
  const totalEntreesCount = movements.filter(m => m.sens === 'entree').length;
  const totalSortiesCount = movements.filter(m => m.sens === 'sortie').length;

  const getStockHealthPercent = (qty, min) => {
    if (!min || min <= 0) return Math.min(100, Math.max(10, qty * 10));
    const ratio = (qty / (min * 2)) * 100;
    return Math.min(100, Math.max(5, Math.round(ratio)));
  };

  return (
    <div className={styles.stockPage}>
      {/* En-tête avec SVG du titre */}
      <div className={styles.stockHeader}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '42px',
              height: '42px',
              backgroundColor: '#eff6ff',
              borderRadius: '10px',
              border: '1px solid #bfdbfe'
            }}>
              <IconStockTitle />
            </div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', color: '#111827' }}>
              Stock & Inventaire
            </h1>
          </div>
          <p style={{ margin: '6px 0 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
            Suivi automatisé en temps réel des intrants, alimentation et produits vétérinaires N&K SARL
          </p>
        </div>
        <div className={styles.stockHeaderActions}>
          <button className={styles.btnSecondary} onClick={exportCSV} title="Exporter l'inventaire en CSV" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <IconDownload /> Exporter CSV
          </button>
          <button className={styles.btnSecondary} onClick={() => { setQuickProductId(null); setIsMovementModalOpen(true); }} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <IconArrowsExchange /> Mouvement global
          </button>
          <button className={styles.btnPrimary} onClick={handleOpenCreateModal} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <IconPlus /> Nouveau Produit
          </button>
        </div>
      </div>

      {/* Statistiques enrichies */}
      <div className={styles.statsGrid} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className={styles.statCard}>
          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' }}>Références Actives</span>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', marginTop: '4px', color: '#111827' }}>{totalProducts}</div>
        </div>
        <div className={styles.statCard}>
          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#dc2626', textTransform: 'uppercase' }}>Alertes Stock Bas</span>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', marginTop: '4px', color: alertProducts > 0 ? '#dc2626' : '#16a34a' }}>
            {alertProducts}
          </div>
        </div>
        <div className={styles.statCard}>
          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#2563eb', textTransform: 'uppercase' }}>Entrées (Mouvements)</span>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', marginTop: '4px', color: '#2563eb' }}>{totalEntreesCount}</div>
        </div>
        <div className={styles.statCard}>
          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#ea580c', textTransform: 'uppercase' }}>Sorties (Consommation)</span>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', marginTop: '4px', color: '#ea580c' }}>{totalSortiesCount}</div>
        </div>
      </div>

      {/* Onglets et Filtres */}
      <div className={styles.filtersContainer}>
        <div className={styles.filtersRow}>
          <div className={styles.tabsGroup}>
            <button
              onClick={() => setActiveTab('products')}
              className={styles.tabBtn}
              style={{
                backgroundColor: activeTab === 'products' ? '#ffffff' : 'transparent',
                color: activeTab === 'products' ? '#111827' : '#6b7280',
                boxShadow: activeTab === 'products' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              Produits ({products.length})
            </button>
            <button
              onClick={() => setActiveTab('movements')}
              className={styles.tabBtn}
              style={{
                backgroundColor: activeTab === 'movements' ? '#ffffff' : 'transparent',
                color: activeTab === 'movements' ? '#111827' : '#6b7280',
                boxShadow: activeTab === 'movements' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              Historique Mouvements ({filteredMovements.length})
            </button>
          </div>

          {activeTab === 'products' ? (
            <div className={styles.controlsGroup}>
              <button
                onClick={() => setShowArchived(!showArchived)}
                className={styles.btnSecondary}
                style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <IconArchive /> {showArchived ? 'Voir les actifs' : 'Voir les archivés'}
              </button>

              <input
                type="text"
                className={styles.searchInput}
                placeholder="Rechercher un produit..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className={styles.categorySelect}
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="ALL">Toutes les catégories</option>
                <option value="Alimentation">Alimentation</option>
                <option value="Santé / Soins">Santé / Soins</option>
                <option value="Équipement">Équipement</option>
                <option value="Général">Général</option>
              </select>
            </div>
          ) : (
            <div className={styles.controlsGroup}>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Rechercher produit ou motif..."
                value={movementSearch}
                onChange={(e) => setMovementSearch(e.target.value)}
              />
              <select
                className={styles.categorySelect}
                value={movementSensFilter}
                onChange={(e) => setMovementSensFilter(e.target.value)}
              >
                <option value="ALL">Tous les sens</option>
                <option value="entree">Entrées uniquement</option>
                <option value="sortie">Sorties uniquement</option>
              </select>
            </div>
          )}
        </div>

        {/* Contenu */}
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Chargement des données...</div>
        ) : error ? (
          <div style={{ padding: '24px', color: '#dc2626', backgroundColor: '#fef2f2', margin: '16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconAlertTriangle /> {error}
          </div>
        ) : activeTab === 'products' ? (
          <>
            {/* VUE CARTES MOBILE */}
            <div className={styles.mobileCardsWrap}>
              {filteredProducts.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#9ca3af', padding: '20px' }}>
                  {showArchived ? 'Aucun produit archivé.' : 'Aucun produit actif trouvé.'}
                </div>
              ) : (
                filteredProducts.map((p) => {
                  const hasHistory = checkHasHistory(p.id);
                  const isArchived = !Boolean(p.is_active);
                  const healthPercent = getStockHealthPercent(Number(p.quantite), Number(p.seuil_min));

                  return (
                    <div key={p.id} className={styles.mobileCard} style={{ opacity: isArchived ? 0.6 : 1 }}>
                      <div className={styles.mobileCardHeader}>
                        <div>
                          <div className={styles.mobileCardTitle}>{p.nom}</div>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{p.categorie || p.category}</span>
                        </div>
                        {isArchived ? (
                          <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '600', backgroundColor: '#f3f4f6', color: '#4b5563', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <IconArchive /> Archivé
                          </span>
                        ) : p.alerte ? (
                          <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '600', backgroundColor: '#fef2f2', color: '#dc2626', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <IconAlertTriangle /> Stock bas
                          </span>
                        ) : (
                          <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '600', backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                            En stock
                          </span>
                        )}
                      </div>

                      <div className={styles.mobileCardBody}>
                        <div>Quantité: <strong>{p.quantite} {p.unite}</strong></div>
                        <div>Seuil d'alerte: {p.seuil_min} {p.unite}</div>

                        <div style={{ marginTop: '0.5rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>
                            <span>Niveau de stock</span>
                            <span>{healthPercent}%</span>
                          </div>
                          <div style={{ height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                            <div
                              style={{
                                height: '100%',
                                width: `${healthPercent}%`,
                                backgroundColor: p.alerte ? '#ef4444' : (healthPercent < 50 ? '#f59e0b' : '#10b981'),
                                transition: 'width 0.3s ease'
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className={styles.mobileCardActions}>
                        {!isArchived && (
                          <button
                            onClick={() => handleOpenQuickMovement(p)}
                            style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #bfdbfe', backgroundColor: '#eff6ff', color: '#2563eb', fontSize: '12px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <IconArrowsExchange /> Mouvement
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEditModal(p)}
                          style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #d1d5db', backgroundColor: '#fff', fontSize: '12px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <IconEdit /> Modifier
                        </button>
                        {isArchived ? (
                          <button
                            onClick={() => handleRestoreProduct(p)}
                            style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #bbf7d0', backgroundColor: '#f0fdf4', color: '#16a34a', fontSize: '12px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <IconRefresh /> Restaurer
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDeleteProduct(p)}
                            style={{ padding: '6px 10px', borderRadius: '4px', border: `1px solid ${hasHistory ? '#ffedd5' : '#fecaca'}`, backgroundColor: hasHistory ? '#fff7ed' : '#fef2f2', color: hasHistory ? '#c2410c' : '#dc2626', fontSize: '12px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            {hasHistory ? <><IconArchive /> Archiver</> : <><IconTrash /> Supprimer</>}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* VUE TABLEAU TABLETTE/PC */}
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Nom du produit</th>
                    <th>Catégorie</th>
                    <th>Quantité en stock</th>
                    <th>Niveau visuel</th>
                    <th>Seuil d'alerte</th>
                    <th>Statut</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ padding: '20px', textAlign: 'center', color: '#9ca3af' }}>
                        {showArchived ? 'Aucun produit archivé.' : 'Aucun produit actif trouvé.'}
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const hasHistory = checkHasHistory(p.id);
                      const isArchived = !Boolean(p.is_active);
                      const healthPercent = getStockHealthPercent(Number(p.quantite), Number(p.seuil_min));

                      return (
                        <tr key={p.id} style={{ opacity: isArchived ? 0.6 : 1 }}>
                          <td style={{ fontWeight: '600', color: '#111827' }}>{p.nom}</td>
                          <td style={{ color: '#4b5563' }}>{p.categorie || p.category}</td>
                          <td style={{ fontWeight: '700' }}>
                            {p.quantite} <span style={{ fontSize: '11px', fontWeight: 'normal', color: '#6b7280' }}>{p.unite}</span>
                          </td>
                          <td style={{ width: '120px' }}>
                            <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  height: '100%',
                                  width: `${healthPercent}%`,
                                  backgroundColor: p.alerte ? '#ef4444' : (healthPercent < 50 ? '#f59e0b' : '#10b981'),
                                  transition: 'width 0.3s ease'
                                }}
                              />
                            </div>
                          </td>
                          <td style={{ color: '#6b7280' }}>{p.seuil_min} {p.unite}</td>
                          <td>
                            {isArchived ? (
                              <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', backgroundColor: '#f3f4f6', color: '#4b5563', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <IconArchive /> Archivé
                              </span>
                            ) : p.alerte ? (
                              <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', backgroundColor: '#fef2f2', color: '#dc2626', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <IconAlertTriangle /> Stock bas
                              </span>
                            ) : (
                              <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                                En stock
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              {!isArchived && (
                                <button
                                  onClick={() => handleOpenQuickMovement(p)}
                                  style={{ padding: '4px 8px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '4px', fontSize: '12px', fontWeight: '600', color: '#2563eb', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                  title="Enregistrer une entrée ou sortie pour ce produit"
                                >
                                  <IconArrowsExchange /> Mouvement
                                </button>
                              )}
                              <button
                                onClick={() => handleOpenEditModal(p)}
                                style={{ padding: '4px 8px', backgroundColor: '#ffffff', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '12px', fontWeight: '600', color: '#374151', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <IconEdit /> Modifier
                              </button>
                              {isArchived ? (
                                <button
                                  onClick={() => handleRestoreProduct(p)}
                                  style={{ padding: '4px 8px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '4px', fontSize: '12px', fontWeight: '600', color: '#16a34a', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <IconRefresh /> Restaurer
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleDeleteProduct(p)}
                                  style={{ padding: '4px 8px', backgroundColor: hasHistory ? '#fff7ed' : '#fef2f2', border: `1px solid ${hasHistory ? '#ffedd5' : '#fecaca'}`, borderRadius: '4px', fontSize: '12px', fontWeight: '600', color: hasHistory ? '#c2410c' : '#dc2626', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                  {hasHistory ? <><IconArchive /> Archiver</> : <><IconTrash /> Supprimer</>}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          /* HISTORIQUE MOVEMENTS */
          <div className={styles.tableWrap} style={{ display: 'block' }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date & Heure</th>
                  <th>Produit</th>
                  <th>Type / Sens</th>
                  <th>Quantité</th>
                  <th>Motif / Destination</th>
                </tr>
              </thead>
              <tbody>
                {filteredMovements.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#9ca3af' }}>
                      Aucun mouvement ne correspond aux filtres.
                    </td>
                  </tr>
                ) : (
                  filteredMovements.map((m) => (
                    <tr key={m.id}>
                      <td style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                        {new Date(m.date_op).toLocaleDateString('fr-FR')} {m.created_at ? new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </td>
                      <td style={{ fontWeight: '600', color: '#111827' }}>{m.produit}</td>
                      <td>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '700',
                          backgroundColor: m.sens === 'entree' ? '#eff6ff' : '#fff7ed',
                          color: m.sens === 'entree' ? '#2563eb' : '#c2410c',
                          border: `1px solid ${m.sens === 'entree' ? '#bfdbfe' : '#ffedd5'}`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {m.sens === 'entree' ? <><IconArrowDown /> Entrée stock</> : <><IconArrowUp /> Sortie stock</>}
                        </span>
                      </td>
                      <td style={{ fontWeight: '700', color: m.sens === 'entree' ? '#16a34a' : '#dc2626' }}>
                        {m.sens === 'entree' ? '+' : '-'}{m.quantite} <span style={{ fontSize: '11px', fontWeight: 'normal', color: '#6b7280' }}>{m.unite}</span>
                      </td>
                      <td style={{ color: '#4b5563' }}>{m.motif || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modales */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onSuccess={fetchData}
        productToEdit={selectedProductToEdit}
      />

      <StockModal
        isOpen={isMovementModalOpen}
        onClose={() => { setIsMovementModalOpen(false); setQuickProductId(null); }}
        onSuccess={fetchData}
        products={products.filter((p) => Boolean(p.is_active))}
        initialProductId={quickProductId}
      />
    </div>
  );
}