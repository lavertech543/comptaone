import { LogOut, X } from 'lucide-react';
import './LogoutConfirmModal.css';

export default function LogoutConfirmModal({ open, onClose, onConfirm, userName }) {
  if (!open) return null;

  return (
    <div className="logout-confirm-overlay" onClick={onClose} role="presentation">
      <div
        className="logout-confirm-dialog"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-confirm-title"
      >
        <button type="button" className="logout-confirm-close" onClick={onClose} aria-label="Fermer">
          <X size={18} />
        </button>

        <div className="logout-confirm-icon">
          <LogOut size={28} />
        </div>

        <h2 id="logout-confirm-title" className="logout-confirm-title">
          Confirmer la déconnexion
        </h2>

        <p className="logout-confirm-text">
          {userName ? (
            <>
              Vous êtes connecté en tant que <strong>{userName}</strong>.
              <br />
              Souhaitez-vous vraiment quitter votre session ?
            </>
          ) : (
            'Souhaitez-vous vraiment quitter votre session ?'
          )}
        </p>

        <div className="logout-confirm-actions">
          <button type="button" className="logout-confirm-btn logout-confirm-btn-cancel" onClick={onClose}>
            Annuler
          </button>
          <button type="button" className="logout-confirm-btn logout-confirm-btn-confirm" onClick={onConfirm}>
            <LogOut size={16} />
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}
