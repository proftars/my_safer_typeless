import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  getAllVocabulary,
  getVocabularyById,
  createVocabulary,
  updateVocabulary,
  deleteVocabulary,
  importVocabulary,
} from '../services/vocabulary';

const router = Router();

// All routes require auth
router.use(requireAuth);

/** GET /api/vocabulary */
router.get('/', (_req: Request, res: Response) => {
  const entries = getAllVocabulary();
  res.json({ vocabulary: entries, total: entries.length });
});

/** POST /api/vocabulary */
router.post('/', (req: Request, res: Response) => {
  const { term, alternatives, category } = req.body;

  if (!term || typeof term !== 'string') {
    res.status(400).json({ error: 'term is required' });
    return;
  }

  const entry = createVocabulary({ term, alternatives, category });
  res.status(201).json(entry);
});

/** PUT /api/vocabulary/:id */
router.put('/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }

  const updated = updateVocabulary(id, req.body);
  if (!updated) {
    res.status(404).json({ error: 'Vocabulary entry not found' });
    return;
  }

  res.json(updated);
});

/** DELETE /api/vocabulary/:id */
router.delete('/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }

  const deleted = deleteVocabulary(id);
  if (!deleted) {
    res.status(404).json({ error: 'Vocabulary entry not found' });
    return;
  }

  res.json({ message: 'Deleted' });
});

/** POST /api/vocabulary/import */
router.post('/import', (req: Request, res: Response) => {
  const { entries } = req.body;

  if (!Array.isArray(entries)) {
    res.status(400).json({ error: 'entries must be an array' });
    return;
  }

  const count = importVocabulary(entries);
  res.json({ imported: count });
});

/** GET /api/vocabulary/export */
router.get('/export', (_req: Request, res: Response) => {
  const entries = getAllVocabulary();
  res.json({
    version: '1.0',
    exported_at: new Date().toISOString(),
    entries: entries.map((e) => ({
      term: e.term,
      alternatives: e.alternatives,
      category: e.category,
    })),
  });
});

export default router;
