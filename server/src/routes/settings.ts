import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { getDb } from '../db';

const router = Router();
router.use(requireAuth);

// Keys that should not be exposed via API
const HIDDEN_KEYS = ['shared_password_hash'];

// Keys that should be masked in response
const MASKED_KEYS = ['groq_api_key'];

function maskValue(key: string, value: string): string {
  if (MASKED_KEYS.includes(key) && value.length > 8) {
    return value.slice(0, 4) + '****' + value.slice(-4);
  }
  return value;
}

/** GET /api/settings */
router.get('/', (_req: Request, res: Response) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM settings ORDER BY key').all() as Array<{
    key: string;
    value: string;
    updated_at: string;
  }>;

  const settings: Record<string, { value: string; updated_at: string }> = {};
  for (const row of rows) {
    if (HIDDEN_KEYS.includes(row.key)) continue;
    settings[row.key] = {
      value: maskValue(row.key, row.value),
      updated_at: row.updated_at,
    };
  }

  res.json({ settings });
});

/** PUT /api/settings */
router.put('/', (req: Request, res: Response) => {
  const db = getDb();
  const updates = req.body as Record<string, string>;

  if (!updates || typeof updates !== 'object') {
    res.status(400).json({ error: 'Request body must be an object of key-value pairs' });
    return;
  }

  // Prevent updating hidden keys via this endpoint
  for (const key of HIDDEN_KEYS) {
    if (key in updates) {
      res.status(400).json({ error: `Cannot update ${key} via this endpoint` });
      return;
    }
  }

  const upsert = db.prepare(
    `INSERT INTO settings (key, value, updated_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  );

  const updateAll = db.transaction(() => {
    for (const [key, value] of Object.entries(updates)) {
      upsert.run(key, String(value));
    }
  });

  updateAll();
  res.json({ message: 'Settings updated', updated: Object.keys(updates) });
});

export default router;
