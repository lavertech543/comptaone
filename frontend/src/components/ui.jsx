import { useState } from 'react';
import { Inbox } from 'lucide-react';
import './asc.css'



export function Modal({ title, onClose, children, footer }) {
  return (
    <>
      <style>{MODAL_CSS}</style>
      <div className="overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-head">
            <div className="modal-title">{title}</div>
            <button className="modal-close-btn" onClick={onClose}>✕</button>
          </div>
          <div className="modal-body">{children}</div>
          {footer && <div className="modal-foot">{footer}</div>}
        </div>
      </div>
    </>
  );
}

export function Field({ label, children }) {
  return <div className="field"><label>{label}</label>{children}</div>;
}

export function Table({ columns, rows, empty = 'Aucune donnée', emptySub, actions }) {
  if (!rows?.length) {
    return (
      <div className="table-empty-state">
        <div className="table-empty-icon">
          <Inbox size={26} strokeWidth={1.8} />
        </div>
        <span className="table-empty-title">{empty}</span>
        {emptySub && <span className="table-empty-sub">{emptySub}</span>}
      </div>
    );
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table>
        <thead>
          <tr>
            {columns.map(c => <th key={c.key}>{c.label}</th>)}
            {actions && <th></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id ?? i}>
              {columns.map(c => <td key={c.key}>{c.render ? c.render(r) : r[c.key]}</td>)}
              {actions && <td className="right">{actions(r)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const STATUS = {
  ouverte: ['green', 'Ouverte'],
  cloturee: ['gray', 'Clôturée'],
  en_production: ['green', 'En production'],
  vide: ['gray', 'Vide'],
  nettoye: ['amber', 'Nettoyé'],
  en_preparation: ['amber', 'En préparation'],
  en_cours: ['amber', 'En cours'],
  partiel: ['amber', 'Partiel'],
  solde: ['green', 'Soldé'],
  en_retard: ['red', 'En retard'],
  paye: ['green', 'Payé'],
  en_attente: ['amber', 'En attente'],
  acceptee: ['green', 'Acceptée'],
  refusee: ['red', 'Refusée'],
  actif: ['green', 'Actif'],
  inactif: ['gray', 'Inactif'],
};

export function StatusTag({ value }) {
  const [cls, label] = STATUS[value] || ['gray', value];
  return <span className={'tag ' + cls}>{label}</span>;
}

export function useForm(initial) {
  const [values, setValues] = useState(initial);
  const setField = (name) => (e) => {
    const val = e?.target ? e.target.value : e;
    setValues(prev => ({ ...prev, [name]: val }));
  };
  return [values, setField, setValues];
}