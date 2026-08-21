import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function StockModal({ isOpen, onClose, products = [], onSuccess, initialProductId = null }) {
  const initialState = {
    product_id: '',
    type: 'Entrée',
    quantite: '',
    date_op: new Date().toISOString().split('T')[0],
    motif: ''
  };

  const [formData, setFormData] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      const defaultId = initialProductId ? String(initialProductId) : (products.length > 0 ? String(products[0].id) : '');
      setFormData({
        ...initialState,
        product_id: defaultId
      });
      setError(null);
    }
  }, [isOpen, initialProductId]);

  if (!isOpen) return null;

  const safeProductsList = Array.isArray(products) ? products : [];

  // Récupérer le produit actuellement sélectionné dans le formulaire
  const selectedProduct = safeProductsList.find(
    (prod) => String(prod.id) === String(formData.product_id)
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.product_id) {
      setError("Veuillez sélectionner un produit dans la liste.");
      setLoading(false);
      return;
    }

    const requestedQty = Number(formData.quantite);

    if (requestedQty <= 0) {
      setError("La quantité doit être strictement supérieure à 0.");
      setLoading(false);
      return;
    }

    // 🔒 RESTRICTION : Bloquer les sorties supérieures au stock disponible
    if (formData.type === 'Sortie' && selectedProduct) {
      const availableStock = Number(selectedProduct.quantite || 0);

      if (requestedQty > availableStock) {
        setError(
          `Impossible d'effectuer cette sortie : la quantité demandée (${requestedQty} ${selectedProduct.unite || ''}) dépasse le stock disponible (${availableStock} ${selectedProduct.unite || ''}).`
        );
        setLoading(false);
        return;
      }
    }

    try {
      const payload = {
        product_id: Number(formData.product_id),
        sens: formData.type === 'Entrée' ? 'entree' : 'sortie',
        quantite: requestedQty,
        date_op: formData.date_op,
        motif: formData.motif.trim() || null
      };

      await api.post('/stock/movements', payload);
      onSuccess();
    } catch (err) {
      console.error('Erreur serveur:', err);
      setError(err.response?.data?.error || err.response?.data?.message || "Erreur lors de l'enregistrement du mouvement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#ffffff', borderRadius: '16px', width: '100%',
        maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden', fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        {/* En-tête */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #f3f4f6', backgroundColor: '#fafafa' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#111827' }}>Nouveau mouvement de stock</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: '18px', cursor: 'pointer', color: '#9ca3af' }}>✕</button>
        </div>

        {/* Message d'erreur */}
        {error && (
          <div style={{ margin: '16px 24px 0 24px', padding: '12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '13px' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Formulaire */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Sélection Type */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: '#6b7280', marginBottom: '8px' }}>
              Type d'opération
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={() => { setFormData((p) => ({ ...p, type: 'Entrée' })); setError(null); }}
                style={{
                  padding: '10px', borderRadius: '8px',
                  border: formData.type === 'Entrée' ? '2px solid #059669' : '1px solid #d1d5db',
                  backgroundColor: formData.type === 'Entrée' ? '#ecfdf5' : '#ffffff',
                  color: formData.type === 'Entrée' ? '#047857' : '#374151',
                  fontWeight: '600', fontSize: '13px', cursor: 'pointer'
                }}
              >
                ↓ Entrée de stock
              </button>
              <button
                type="button"
                onClick={() => { setFormData((p) => ({ ...p, type: 'Sortie' })); setError(null); }}
                style={{
                  padding: '10px', borderRadius: '8px',
                  border: formData.type === 'Sortie' ? '2px solid #d97706' : '1px solid #d1d5db',
                  backgroundColor: formData.type === 'Sortie' ? '#fffbeb' : '#ffffff',
                  color: formData.type === 'Sortie' ? '#b45309' : '#374151',
                  fontWeight: '600', fontSize: '13px', cursor: 'pointer'
                }}
              >
                ↑ Sortie de stock
              </button>
            </div>
          </div>

          {/* Sélection Produit */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: '#6b7280', marginBottom: '6px' }}>
              Produit concerné *
            </label>
            <select
              name="product_id"
              value={formData.product_id}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', backgroundColor: '#ffffff' }}
            >
              <option value="">-- Choisir un produit en réserve --</option>
              {safeProductsList.map((prod) => (
                <option key={prod.id} value={prod.id}>
                  {prod.nom} (En stock : {prod.quantite} {prod.unite})
                </option>
              ))}
            </select>
          </div>

          {/* Quantité & Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: '#6b7280', marginBottom: '6px' }}>
                Quantité *
              </label>
              <input
                type="number"
                name="quantite"
                min="0.01"
                max={formData.type === 'Sortie' && selectedProduct ? selectedProduct.quantite : undefined}
                step="any"
                value={formData.quantite}
                onChange={handleChange}
                required
                placeholder="Ex: 50"
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', boxSizing: 'border-box' }}
              />
              {formData.type === 'Sortie' && selectedProduct && (
                <span style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px', display: 'block' }}>
                  Disponible : {selectedProduct.quantite} {selectedProduct.unite}
                </span>
              )}
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: '#6b7280', marginBottom: '6px' }}>
                Date *
              </label>
              <input
                type="date"
                name="date_op"
                value={formData.date_op}
                onChange={handleChange}
                required
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Motif */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: '#6b7280', marginBottom: '6px' }}>
              Motif / Remarque
            </label>
            <textarea
              name="motif"
              rows="2"
              value={formData.motif}
              onChange={handleChange}
              placeholder="Ex: Distribution aux animaux"
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
          </div>

          {/* Boutons d'action */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '12px', borderTop: '1px solid #f3f4f6' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#ffffff', color: '#374151', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#059669', color: '#ffffff', fontSize: '14px', fontWeight: '600', cursor: 'pointer', opacity: loading ? 0.6 : 1 }}
            >
              {loading ? 'Enregistrement...' : 'Valider'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}