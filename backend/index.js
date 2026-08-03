import express from 'express';
const app = express();
const PORT = 3000;

app.use(express.json());

// "Base de données" temporaire
let factures = [
  { id: 1, client: "Test", total: 10000 }
];
let nextId = 2;

// GET : Récupérer toutes les factures
app.get('/api/factures', (req, res) => {
  res.json(factures);
});

// GET : Récupérer 1 facture par ID
app.get('/api/factures/:id', (req, res) => {
  const facture = factures.find(f => f.id === parseInt(req.params.id));
  if (!facture) return res.status(404).json({ message: "Facture non trouvée" });
  res.json(facture);
});

// POST : Créer une facture
app.post('/api/factures', (req, res) => {
  const nouvelleFacture = { id: nextId++, ...req.body };
  factures.push(nouvelleFacture);
  res.status(201).json(nouvelleFacture);
});

// PUT : Modifier une facture
app.put('/api/factures/:id', (req, res) => {
  const facture = factures.find(f => f.id === parseInt(req.params.id));
  if (!facture) return res.status(404).json({ message: "Facture non trouvée" });
  Object.assign(facture, req.body);
  res.json(facture);
});

// DELETE : Supprimer une facture
app.delete('/api/factures/:id', (req, res) => {
  factures = factures.filter(f => f.id !== parseInt(req.params.id));
  res.json({ message: "Facture supprimée" });
});

app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});
