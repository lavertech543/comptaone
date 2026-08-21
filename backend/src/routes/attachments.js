import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { fileTypeFromBuffer } from 'file-type';
import { query } from '../db/pool.js';
import { authRequired } from '../middleware/auth.js';
import { logAudit } from '../utils/audit.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UP = path.resolve(path.join(__dirname, '..', '..', 'uploads'));
fs.mkdirSync(UP, { recursive: true });

// ─── Types MIME autorisés (whitelist stricte) ─────────────────────────────────
const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
]);

const storage = multer.diskStorage({
  destination: (req, f, cb) => cb(null, UP),
  filename: (req, f, cb) =>
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e6) + path.extname(f.originalname).toLowerCase()),
});

// Multer stocke en mémoire tampon pour permettre la validation MIME avant écriture
const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
});

const router = Router();
router.use(authRequired);

// ─── POST / — Upload avec validation MIME réelle ─────────────────────────────
router.post('/', uploadMemory.single('file'), async (req, res) => {
  try {
    const { module, record_id } = req.body;
    if (!req.file) return res.status(400).json({ error: 'Fichier requis' });

    // 1. Détecter le type MIME réel à partir des magic bytes (pas de la déclaration client)
    const detected = await fileTypeFromBuffer(req.file.buffer);
    const realMime = detected?.mime;

    if (!realMime || !ALLOWED_MIME.has(realMime)) {
      return res.status(400).json({
        error: `Type de fichier non autorisé (${realMime || 'inconnu'}). Types acceptés : images, PDF, Word, Excel, CSV, TXT.`,
      });
    }

    // 2. Sanitiser le nom original (supprimer caractères dangereux)
    const safeOriginalName = path.basename(req.file.originalname).replace(/[^\w.\-]/g, '_');

    // 3. Générer un nom de fichier aléatoire sécurisé pour le stockage
    const ext = path.extname(safeOriginalName).toLowerCase();
    const storedFilename = `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    const destPath = path.join(UP, storedFilename);

    // 4. Écrire le fichier sur le disque
    await fs.promises.writeFile(destPath, req.file.buffer);

    // 5. Enregistrer en base de données
    const r = await query(
      `INSERT INTO attachments(module, record_id, filename, original_name, mimetype, uploaded_by)
       VALUES($1, $2, $3, $4, $5, $6) RETURNING id`,
      [module, record_id, storedFilename, safeOriginalName, realMime, req.user.id]
    );

    await logAudit({
      user: req.user, action: 'attach', module,
      recordId: Number(record_id), details: safeOriginalName,
    });

    res.status(201).json({ id: r.rows[0].id, filename: storedFilename });
  } catch (err) {
    console.error('Erreur POST /api/attachments :', err);
    res.status(500).json({ error: "Erreur lors de l'upload du fichier" });
  }
});

// ─── GET / — Liste des pièces jointes ────────────────────────────────────────
router.get('/', async (req, res) => {
  const { module, record_id } = req.query;
  const r = await query(
    'SELECT id, filename, original_name, mimetype, created_at FROM attachments WHERE module=$1 AND record_id=$2',
    [module, record_id]
  );
  res.json(r.rows);
});

// ─── GET /:id/download — Téléchargement sécurisé (protection path traversal) ─
router.get('/:id/download', async (req, res) => {
  try {
    const r = await query('SELECT * FROM attachments WHERE id=$1', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Introuvable' });

    // Protection path traversal : s'assurer que le chemin résolu reste dans UP
    const resolved = path.resolve(UP, r.rows[0].filename);
    if (!resolved.startsWith(UP + path.sep) && resolved !== UP) {
      console.error(`⚠️ Tentative de path traversal détectée : ${r.rows[0].filename}`);
      return res.status(403).json({ error: 'Accès refusé' });
    }

    res.download(resolved, r.rows[0].original_name);
  } catch (err) {
    console.error('Erreur GET /api/attachments/:id/download :', err);
    res.status(500).json({ error: 'Erreur lors du téléchargement' });
  }
});

export default router;
