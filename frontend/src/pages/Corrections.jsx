import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Table, StatusTag } from '../components/ui.jsx';
import { fmtDateTime } from '../util.js';

export default function Corrections() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState(null);
  const load = () => api.get('/corrections').then(setRows).catch(e=>setErr(e.message));
  useEffect(() => { load(); }, []);
  async function review(r, decision){
    const commentaire = decision==='reject' ? prompt('Motif du refus (optionnel):')||'' : '';
    try{ await api.post(`/corrections/${r.id}/review`, { decision, commentaire }); load(); }catch(e){ setErr(e.message); }
  }
  return (
    <div className="panel">
      <div className="panel-head"><h2>Demandes de correction</h2></div>
      {err && <div className="err" style={{margin:12}}>{err}</div>}
      <div className="demo" style={{margin:12}}>Une donnée validée ne peut pas être modifiée directement. Toute correction passe par une demande soumise à l'administrateur, qui conserve l'historique des valeurs.</div>
      <Table rows={rows} empty="Aucune demande." columns={[
        {key:'module',label:'Module'},{key:'champ',label:'Champ'},
        {key:'ancienne_valeur',label:'Ancienne'},{key:'nouvelle_valeur',label:'Demandée'},
        {key:'motif',label:'Motif'},{key:'demandeur',label:'Demandeur'},
        {key:'statut',label:'Statut',render:r=><StatusTag value={r.statut}/>},
        {key:'created_at',label:'Date',render:r=>fmtDateTime(r.created_at)},
      ]}
      actions={user.role==='admin' ? (r)=> r.statut==='en_attente' ? <div className="flex">
        <button className="btn small" onClick={()=>review(r,'accept')}>Accepter</button>
        <button className="btn small danger" onClick={()=>review(r,'reject')}>Refuser</button>
      </div> : (r.validateur?`par ${r.validateur}`:'') : null}/>
    </div>
  );
}
