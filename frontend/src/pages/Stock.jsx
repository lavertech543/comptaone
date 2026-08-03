import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import ProductModal from './ProductModal';
import StockModal from './StockModal';
import styles from './Stock.module.css';

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

  // Modales
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [selectedProductToEdit, setSelectedProductToEdit] = useState(null);

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

  const checkHasHistory = (productId) => {
    return movements.some((m) => Number(m.product_id) === Number(productId));
  };

  const handleDeleteProduct = async (product) => {
    const hasHistory = checkHasHistory(product.id);

    if (hasHistory) {
      const confirmArchive = window.confirm(
        `⚠️ Impossible de supprimer définitivement "${product.nom}".\n\n` +
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

  const filteredProducts = products.filter((p) => {
    const productName = p.nom ? p.nom.toLowerCase() : '';
    const matchesSearch = productName.includes(search.toLowerCase());
    const productCategory = p.categorie || p.category || 'Général';
    const matchesCategory = selectedCategory === 'ALL' || productCategory === selectedCategory;
    const isArchived = !Boolean(p.is_active);
    const matchesArchiveState = showArchived ? isArchived : !isArchived;

    return matchesSearch && matchesCategory && matchesArchiveState;
  });

  const totalProducts = products.filter((p) => Boolean(p.is_active)).length;
  const alertProducts = products.filter((p) => Boolean(p.is_active) && Boolean(p.alerte)).length;

  return (
    <div className={styles.stockPage}>
      {/* En-tête */}
      <div className={styles.stockHeader}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', color: '#111827' }}>Stock & Inventaire</h1>
          <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
            Suivi en temps réel des aliments, produits de santé et équipements
          </p>
        </div>
        <div className={styles.stockHeaderActions}>
          <button className={styles.btnSecondary} onClick={() => setIsMovementModalOpen(true)}>
            ± Mouvement de stock
          </button>
          <button className={styles.btnPrimary} onClick={handleOpenCreateModal}>
            + Nouveau Produit
          </button>
        </div>
      </div>

      {/* Statistiques */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' }}>Total Références Actives</span>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', marginTop: '4px', color: '#111827' }}>{totalProducts}</div>
        </div>
        <div className={styles.statCard}>
          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#dc2626', textTransform: 'uppercase' }}>Alertes Stock Bas</span>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', marginTop: '4px', color: alertProducts > 0 ? '#dc2626' : '#16a34a' }}>
            {alertProducts}
          </div>
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
              Mouvements
            </button>
          </div>

          {activeTab === 'products' && (
            <div className={styles.controlsGroup}>
              <button
                onClick={() => setShowArchived(!showArchived)}
                className={styles.btnSecondary}
                style={{ fontSize: '0.8rem' }}
              >
                {showArchived ? '📂 Voir les actifs' : '📦 Voir les archivés'}
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
          )}
        </div>

        {/* Contenu */}
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Chargement des données...</div>
        ) : error ? (
          <div style={{ padding: '24px', color: '#dc2626', backgroundColor: '#fef2f2', margin: '16px', borderRadius: '8px' }}>⚠️ {error}</div>
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

                  return (
                    <div key={p.id} className={styles.mobileCard} style={{ opacity: isArchived ? 0.6 : 1 }}>
                      <div className={styles.mobileCardHeader}>
                        <div>
                          <div className={styles.mobileCardTitle}>{p.nom}</div>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{p.categorie || p.category}</span>
                        </div>
                        {isArchived ? (
                          <span style={{ padding: '2px 6px', borderRadius: '10px', fontSize: '11px', fontWeight: '600', backgroundColor: '#f3f4f6', color: '#4b5563' }}>📦 Archivé</span>
                        ) : p.alerte ? (
                          <span style={{ padding: '2px 6px', borderRadius: '10px', fontSize: '11px', fontWeight: '600', backgroundColor: '#fef2f2', color: '#dc2626' }}>⚠️ Stock bas</span>
                        ) : (
                          <span style={{ padding: '2px 6px', borderRadius: '10px', fontSize: '11px', fontWeight: '600', backgroundColor: '#f0fdf4', color: '#16a34a' }}>✓ En stock</span>
                        )}
                      </div>

                      <div className={styles.mobileCardBody}>
                        <div>Quantité: <strong>{p.quantite} {p.unite}</strong></div>
                        <div>Seuil: {p.seuil_min} {p.unite}</div>
                      </div>

                      <div className={styles.mobileCardActions}>
                        <button
                          onClick={() => handleOpenEditModal(p)}
                          style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #d1d5db', backgroundColor: '#fff', fontSize: '12px', fontWeight: '600' }}
                        >
                          ✏️ Modifier
                        </button>
                        {isArchived ? (
                          <button
                            onClick={() => handleRestoreProduct(p)}
                            style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #bbf7d0', backgroundColor: '#f0fdf4', color: '#16a34a', fontSize: '12px', fontWeight: '600' }}
                          >
                            🔄 Restaurer
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDeleteProduct(p)}
                            style={{ padding: '6px 10px', borderRadius: '4px', border: `1px solid ${hasHistory ? '#ffedd5' : '#fecaca'}`, backgroundColor: hasHistory ? '#fff7ed' : '#fef2f2', color: hasHistory ? '#c2410c' : '#dc2626', fontSize: '12px', fontWeight: '600' }}
                          >
                            {hasHistory ? '📦 Archiver' : '🗑️ Supprimer'}
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
                    <th>Seuil d'alerte</th>
                    <th>Statut</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: '#9ca3af' }}>
                        {showArchived ? 'Aucun produit archivé.' : 'Aucun produit actif trouvé.'}
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const hasHistory = checkHasHistory(p.id);
                      const isArchived = !Boolean(p.is_active);

                      return (
                        <tr key={p.id} style={{ opacity: isArchived ? 0.6 : 1 }}>
                          <td style={{ fontWeight: '600', color: '#111827' }}>{p.nom}</td>
                          <td style={{ color: '#4b5563' }}>{p.categorie || p.category}</td>
                          <td style={{ fontWeight: '700' }}>
                            {p.quantite} <span style={{ fontSize: '11px', fontWeight: 'normal', color: '#6b7280' }}>{p.unite}</span>
                          </td>
                          <td style={{ color: '#6b7280' }}>{p.seuil_min} {p.unite}</td>
                          <td>
                            {isArchived ? (
                              <span style={{ padding: '2px 6px', borderRadius: '10px', fontSize: '11px', fontWeight: '600', backgroundColor: '#f3f4f6', color: '#4b5563' }}>📦 Archivé</span>
                            ) : p.alerte ? (
                              <span style={{ padding: '2px 6px', borderRadius: '10px', fontSize: '11px', fontWeight: '600', backgroundColor: '#fef2f2', color: '#dc2626' }}>⚠️ Stock bas</span>
                            ) : (
                              <span style={{ padding: '2px 6px', borderRadius: '10px', fontSize: '11px', fontWeight: '600', backgroundColor: '#f0fdf4', color: '#16a34a' }}>✓ En stock</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              <button
                                onClick={() => handleOpenEditModal(p)}
                                style={{ padding: '4px 8px', backgroundColor: '#ffffff', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '12px', fontWeight: '600', color: '#374151', cursor: 'pointer' }}
                              >
                                ✏️ Modifier
                              </button>
                              {isArchived ? (
                                <button
                                  onClick={() => handleRestoreProduct(p)}
                                  style={{ padding: '4px 8px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '4px', fontSize: '12px', fontWeight: '600', color: '#16a34a', cursor: 'pointer' }}
                                >
                                  🔄 Restaurer
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleDeleteProduct(p)}
                                  style={{ padding: '4px 8px', backgroundColor: hasHistory ? '#fff7ed' : '#fef2f2', border: `1px solid ${hasHistory ? '#ffedd5' : '#fecaca'}`, borderRadius: '4px', fontSize: '12px', fontWeight: '600', color: hasHistory ? '#c2410c' : '#dc2626', cursor: 'pointer' }}
                                >
                                  {hasHistory ? '📦 Archiver' : '🗑️ Supprimer'}
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
                  <th>Date</th>
                  <th>Produit</th>
                  <th>Type</th>
                  <th>Quantité</th>
                  <th>Motif</th>
                </tr>
              </thead>
              <tbody>
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#9ca3af' }}>
                      Aucun mouvement enregistré.
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => (
                    <tr key={m.id}>
                      <td style={{ color: '#6b7280' }}>
                        {new Date(m.date_op).toLocaleDateString('fr-FR')}
                      </td>
                      <td style={{ fontWeight: '600', color: '#111827' }}>{m.produit}</td>
                      <td>
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: '10px',
                          fontSize: '11px',
                          fontWeight: '600',
                          backgroundColor: m.sens === 'entree' ? '#eff6ff' : '#fff7ed',
                          color: m.sens === 'entree' ? '#2563eb' : '#c2410c'
                        }}>
                          {m.sens === 'entree' ? '↓ Entrée' : '↑ Sortie'}
                        </span>
                      </td>
                      <td style={{ fontWeight: '700' }}>
                        {m.sens === 'entree' ? '+' : '-'}{m.quantite} {m.unite}
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
        onClose={() => setIsMovementModalOpen(false)}
        onSuccess={fetchData}
        products={products.filter((p) => Boolean(p.is_active))}
      />
    </div>
  );
}