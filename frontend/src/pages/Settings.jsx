import React, { useEffect, useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Building2, 
  MapPin, 
  Coins, 
  AlertTriangle, 
  Clock, 
  Percent, 
  Check, 
  Save, 
  AlertCircle,
  Sparkles,
  BellRing,
  Loader2
} from 'lucide-react';
import { api } from '../api.js';
import './responsive.css';

const SETTING_SECTIONS = [
  {
    title: 'Identité & Entreprise',
    icon: Building2,
    fields: [
      { key: 'entreprise_nom', label: 'Nom de l’entreprise', icon: Building2, type: 'text', placeholder: 'ex: N&K SARL' },
      { key: 'entreprise_adresse', label: 'Adresse physique / Siège', icon: MapPin, type: 'text', placeholder: 'ex: Douala, Cameroun' },
      { key: 'devise', label: 'Devise principale', icon: Coins, type: 'text', isMono: true, placeholder: 'ex: FCFA' },
    ]
  },
  {
    title: 'Seuils d’Alerte & Trésorerie',
    icon: AlertTriangle,
    fields: [
      { key: 'seuil_tresorerie', label: 'Seuil d’alerte trésorerie', icon: Coins, type: 'number', isMono: true, unit: 'FCFA', placeholder: '500000' },
      { key: 'mortalite_seuil_pct', label: 'Seuil d’alerte mortalité', icon: Percent, type: 'number', isMono: true, unit: '%', step: '0.1', placeholder: '2.5' },
    ]
  },
  {
    title: 'Rappels & Échéances',
    icon: BellRing,
    fields: [
      { key: 'rappel_creance_jours', label: 'Rappel créances client', icon: Clock, type: 'number', isMono: true, unit: 'jours', placeholder: '5' },
      { key: 'rappel_salaire_jours', label: 'Rappel paiement salaires', icon: Clock, type: 'number', isMono: true, unit: 'jours', placeholder: '3' },
    ]
  }
];

function SaveButton({ onClick, isLoading }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      className="btn-save-settings"
    >
      {isLoading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <Save size={16} />
      )}
      <span>{isLoading ? 'Enregistrement…' : 'Enregistrer les paramètres'}</span>
    </button>
  );
}

export default function Setting() {
  const [s, setS] = useState({});
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/settings')
      .then(res => setS(res || {}))
      .catch(e => setErr(e.message));
  }, []);

  const handleChange = (key, value) => {
    setS(prev => ({ ...prev, [key]: value }));
  };

  async function save() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      await api.put('/settings', s);
      setMsg('Paramètres système mis à jour avec succès.');
      setTimeout(() => setMsg(null), 4000);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="settings-container">
      {/* HEADER DE PAGE */}
      <div className="settings-header">
        <div className="settings-header-content">
          <div className="settings-icon-wrapper">
            <SettingsIcon size={22} />
          </div>
          <div>
            <div className="settings-title-group">
              <h2 className="settings-title">Paramètres du système</h2>
              <span className="settings-badge">Configuration</span>
            </div>
            <p className="settings-subtitle">
              Définissez les options globales, seuils critiques et délais de rappel de l'application.
            </p>
          </div>
        </div>

      </div>

      {/* FEEDBACKS (ERREUR OU SUCCÈS) */}
      {err && (
        <div className="settings-alert-error">
          <AlertCircle size={16} />
          <span>{err}</span>
        </div>
      )}

      {msg && (
        <div className="settings-alert-success">
          <Check size={16} />
          <span>{msg}</span>
        </div>
      )}

      {/* SECTIONS / CARTES */}
      <div className="settings-grid">
        {SETTING_SECTIONS.map((section) => {
          const SectionIcon = section.icon;

          return (
            <div key={section.title} className="settings-card">
              <div>
                <div className="settings-card-header">
                  <SectionIcon size={18} style={{ color: '#2563eb' }} />
                  <h3 className="settings-card-title">{section.title}</h3>
                </div>

                <div className="settings-fields-stack">
                  {section.fields.map((field) => {
                    const FieldIcon = field.icon;

                    return (
                      <div key={field.key} className="settings-field-group">
                        <label className="settings-label">
                          {field.label}
                        </label>
                        <div className="settings-input-wrapper">
                          <FieldIcon size={15} className="settings-input-icon" />
                          <input 
                            type={field.type}
                            step={field.step}
                            value={s[field.key] || ''} 
                            onChange={e => handleChange(field.key, e.target.value)}
                            placeholder={field.placeholder}
                            className={`settings-input ${field.isMono ? 'font-mono' : ''}`}
                            style={{
                              paddingRight: field.unit ? '4.5rem' : '0.75rem'
                            }}
                          />
                          {field.unit && (
                            <span className="settings-input-unit">
                              {field.unit}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* BARRE D'ACTION INFÉRIEURE */}
      <div className="settings-footer-bar">
        <div className="settings-footer-text">
          <Sparkles size={16} style={{ color: '#2563eb', flexShrink: 0 }} />
          <span>Toutes les modifications prendront effet immédiatement après enregistrement.</span>
        </div>

        <SaveButton onClick={save} isLoading={busy} />
      </div>
    </div>
  );
}