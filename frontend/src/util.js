export const fmtFCFA = (n) => (Number(n||0)).toLocaleString('fr-FR') + ' FCFA';
export const fmtNum = (n) => (Number(n||0)).toLocaleString('fr-FR');
export const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '';
export const fmtDateTime = (d) => d ? new Date(d).toLocaleString('fr-FR') : '';
export const today = () => new Date().toISOString().slice(0,10);
