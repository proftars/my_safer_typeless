import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { getDb } from '../db';

const router = Router();
router.use(requireAuth);

/** GET /api/stats/overview */
router.get('/overview', (_req: Request, res: Response) => {
  const db = getDb();

  const today = db.prepare(
    `SELECT COUNT(*) as count, COALESCE(SUM(duration_ms), 0) as total_duration_ms
     FROM transcriptions WHERE date(created_at) = date('now')`
  ).get() as { count: number; total_duration_ms: number };

  const thisWeek = db.prepare(
    `SELECT COUNT(*) as count, COALESCE(SUM(duration_ms), 0) as total_duration_ms
     FROM transcriptions WHERE created_at >= datetime('now', '-7 days')`
  ).get() as { count: number; total_duration_ms: number };

  const thisMonth = db.prepare(
    `SELECT COUNT(*) as count, COALESCE(SUM(duration_ms), 0) as total_duration_ms
     FROM transcriptions WHERE created_at >= datetime('now', '-30 days')`
  ).get() as { count: number; total_duration_ms: number };

  const allTime = db.prepare(
    `SELECT COUNT(*) as count, COALESCE(SUM(duration_ms), 0) as total_duration_ms
     FROM transcriptions`
  ).get() as { count: number; total_duration_ms: number };

  const avgLatency = db.prepare(
    `SELECT
       COALESCE(AVG(stt_latency_ms), 0) as avg_stt_ms,
       COALESCE(AVG(llm_latency_ms), 0) as avg_llm_ms
     FROM transcriptions WHERE created_at >= datetime('now', '-7 days')`
  ).get() as { avg_stt_ms: number; avg_llm_ms: number };

  res.json({
    today: { count: today.count, durationMs: today.total_duration_ms },
    thisWeek: { count: thisWeek.count, durationMs: thisWeek.total_duration_ms },
    thisMonth: { count: thisMonth.count, durationMs: thisMonth.total_duration_ms },
    allTime: { count: allTime.count, durationMs: allTime.total_duration_ms },
    avgLatency: {
      sttMs: Math.round(avgLatency.avg_stt_ms),
      llmMs: Math.round(avgLatency.avg_llm_ms),
    },
  });
});

/** GET /api/stats/daily?range=30 */
router.get('/daily', (req: Request, res: Response) => {
  const db = getDb();
  const range = Math.min(365, Math.max(1, parseInt(req.query.range as string, 10) || 30));

  const rows = db.prepare(
    `SELECT
       date(created_at) as date,
       COUNT(*) as count,
       COALESCE(SUM(duration_ms), 0) as total_duration_ms
     FROM transcriptions
     WHERE created_at >= datetime('now', '-' || ? || ' days')
     GROUP BY date(created_at)
     ORDER BY date ASC`
  ).all(range) as Array<{ date: string; count: number; total_duration_ms: number }>;

  res.json({ daily: rows, range });
});

export default router;
