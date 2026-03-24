import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { getDb } from '../db';

const router = Router();
router.use(requireAuth);

/** GET /api/history?q=&page=&limit= */
router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
  const offset = (page - 1) * limit;
  const query = (req.query.q as string) || '';

  let rows: any[];
  let total: number;

  if (query) {
    // Full-text search
    rows = db
      .prepare(
        `SELECT t.* FROM transcriptions t
         JOIN transcriptions_fts fts ON t.id = fts.rowid
         WHERE transcriptions_fts MATCH ?
         ORDER BY t.created_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(query, limit, offset);

    const countRow = db
      .prepare(
        `SELECT COUNT(*) as count FROM transcriptions t
         JOIN transcriptions_fts fts ON t.id = fts.rowid
         WHERE transcriptions_fts MATCH ?`
      )
      .get(query) as { count: number };
    total = countRow.count;
  } else {
    rows = db
      .prepare('SELECT * FROM transcriptions ORDER BY created_at DESC LIMIT ? OFFSET ?')
      .all(limit, offset);

    const countRow = db
      .prepare('SELECT COUNT(*) as count FROM transcriptions')
      .get() as { count: number };
    total = countRow.count;
  }

  res.json({
    history: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

/** GET /api/history/:id */
router.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }

  const row = db.prepare('SELECT * FROM transcriptions WHERE id = ?').get(id);
  if (!row) {
    res.status(404).json({ error: 'Transcription not found' });
    return;
  }

  res.json(row);
});

/** DELETE /api/history/:id */
router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }

  // Also remove from FTS index
  db.prepare('DELETE FROM transcriptions_fts WHERE rowid = ?').run(id);
  const result = db.prepare('DELETE FROM transcriptions WHERE id = ?').run(id);

  if (result.changes === 0) {
    res.status(404).json({ error: 'Transcription not found' });
    return;
  }

  res.json({ message: 'Deleted' });
});

export default router;
