import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { query } from '../db/pool.js';
import { authRequired } from '../middleware/auth.js';
import { logAudit } from '../utils/audit.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UP = path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(UP, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, f, cb) => cb(null, UP),
  filename: (req, f, cb) => cb(null, Date.now() + '-' + Math.round(Math.random()*1e6) + path.extname(f.originalname)),
});
const upload = multer({ storage, limits: { fileSize: 10*1024*1024 } });

const router = Router();
router.use(authRequired);

router.post('/', upload.single('file'), async (req, res) => {
  const { module, record_id } = req.body;
  if (!req.file) return res.status(400).json({ error: 'Fichier requis' });
  const r = await query(`INSERT INTO attachments(module,record_id,filename,original_name,mimetype,uploaded_by)
    VALUES($1,$2,$3,$4,$5,$6) RETURNING id`,
    [module, record_id, req.file.filename, req.file.originalname, req.file.mimetype, req.user.id]);
  await logAudit({ user: req.user, action:'attach', module, recordId:Number(record_id), details:req.file.originalname });
  res.status(201).json({ id: r.rows[0].id, filename: req.file.filename });
});

router.get('/', async (req, res) => {
  const { module, record_id } = req.query;
  const r = await query('SELECT id,filename,original_name,mimetype,created_at FROM attachments WHERE module=$1 AND record_id=$2', [module, record_id]);
  res.json(r.rows);
});

router.get('/:id/download', async (req, res) => {
  const r = await query('SELECT * FROM attachments WHERE id=$1', [req.params.id]);
  if (!r.rows[0]) return res.status(404).json({ error: 'Introuvable' });
  res.download(path.join(UP, r.rows[0].filename), r.rows[0].original_name);
});

export default router;
