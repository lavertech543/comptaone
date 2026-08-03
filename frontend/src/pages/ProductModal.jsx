import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function ProductModal({ isOpen, onClose, onSuccess, productToEdit }) {
  const initialState = {
    nom: '',
    categorie: 'Alimentation',
    quantite: '',
    seuil_min: '',
    unite: 'kg'
  };

  const [formData, setFormData] = useState(initialState);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (productToEdit) {
      setFormData({
        nom: productToEdit.nom || '',
        categorie: productToEdit.categorie || 'Alimentation',
        quantite: productToEdit.quantite || '',
        seuil_min: productToEdit.seuil_min || '',
        unite: productToEdit.unite || 'kg'
      });
    } else {
      setFormData(initialState);
    }
    setError(null);
  }, [productToEdit, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const quantiteNum = Number(formData.quantite);
    const seuilNum = Number(formData.seuil_min);

    // Validation
    if (quantiteNum <= 0) {
      setError("La quantité en stock doit être strictement supérieure à 0.");
      return;
    }

    if (seuilNum < 0) {
      setError("Le seuil d'alerte ne peut pas être négatif.");
      return;
    }

    setSubmitting(true);

    // 💡 Conversion explicite des types avant envoi à l'API
    const payload = {
      ...formData,
      quantite: quantiteNum,
      seuil_min: seuilNum
    };

    try {
      let response;
      if (productToEdit) {
        response = await api.put(`/stock/products/${productToEdit.id}`, payload);
      } else {
        response = await api.post('/stock/products', payload);
      }
      
      // Passation de la donnée mise à jour au parent
      if (onSuccess) {
        onSuccess(response.data);
      }
      onClose();
    } catch (err) {
      console.error("Erreur d'enregistrement du produit :", err);
      setError(err.response?.data?.message || "Erreur lors de l'enregistrement du produit.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '480px',
          padding: '24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#111827' }}>
            {productToEdit ? 'Modifier le produit' : 'Ajouter un nouveau produit'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#9ca3af'
            }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              borderRadius: '6px',
              fontSize: '13px',
              marginBottom: '16px',
              border: '1px solid #fecaca'
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Nom du produit */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: '#374151' }}>
              Nom du produit *
            </label>
            <input
              type="text"
              name="nom"
              value={formData.nom}
              onChange={handleChange}
              required
              placeholder="Ex: Aliment Démarrage Broiler"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Catégorie */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: '#374151' }}>
              Catégorie *
            </label>
            <select
              name="categorie"
              value={formData.categorie}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                fontSize: '14px',
                backgroundColor: '#fff',
                boxSizing: 'border-box'
              }}
            >
              <option value="Alimentation">Alimentation</option>
              <option value="Santé / Soins">Santé / Soins</option>
              <option value="Équipement">Équipement</option>
              <option value="Général">Général</option>
            </select>
          </div>

          {/* Quantité & Unité */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: '#374151' }}>
                Quantité en stock *
              </label>
              <input
                type="number"
                name="quantite"
                step="any"
                min="0.01"
                value={formData.quantite}
                onChange={handleChange}
                required
                placeholder="Ex: 50"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: '#374151' }}>
                Unité *
              </label>
              <select
                name="unite"
                value={formData.unite}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  backgroundColor: '#fff',
                  boxSizing: 'border-box'
                }}
              >
                <option value="kg">kg</option>
                <option value="Sacs">Sacs</option>
                <option value="Litres">Litres</option>
                <option value="Flacons">Flacons</option>
                <option value="Unités">Unités</option>
              </select>
            </div>
          </div>

          {/* Seuil d'alerte */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: '#374151' }}>
              Seuil d'alerte stock bas *
            </label>
            <input
              type="number"
              name="seuil_min"
              step="any"
              min="0"
              value={formData.seuil_min}
              onChange={handleChange}
              required
              placeholder="Ex: 10"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Boutons d'action */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: '8px 16px',
                backgroundColor: '#ffffff',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer',
                color: '#374151',
                fontSize: '14px'
              }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '8px 16px',
                backgroundColor: '#2563eb',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: submitting ? 'not-allowed' : 'pointer',
                color: '#ffffff',
                fontSize: '14px',
                opacity: submitting ? 0.7 : 1
              }}
            >
              {submitting ? 'Enregistrement...' : productToEdit ? 'Mettre à jour' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}