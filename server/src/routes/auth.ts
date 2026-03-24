import { Router, Request, Response } from 'express';
import {
  verifyPassword,
  hashPassword,
  createSession,
  setPasswordHash,
  isPasswordSet,
} from '../middleware/auth';

const router = Router();

/**
 * POST /api/auth/verify
 * Verify shared password and return session token.
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { password } = req.body;

    if (!password) {
      res.status(400).json({ error: 'Password is required' });
      return;
    }

    if (!isPasswordSet()) {
      res.status(400).json({
        error: 'No password set. Use POST /api/auth/set-password first.',
        needsSetup: true,
      });
      return;
    }

    const valid = await verifyPassword(password);
    if (!valid) {
      res.status(401).json({ error: 'Invalid password' });
      return;
    }

    const token = createSession();
    res.json({ token, expiresIn: '24h' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auth/set-password
 * Set or change the shared password.
 * On first run (no password set), no auth required.
 * After password is set, requires current password.
 */
router.post('/set-password', async (req: Request, res: Response) => {
  try {
    const { password, currentPassword } = req.body;

    if (!password || password.length < 4) {
      res.status(400).json({ error: 'Password must be at least 4 characters' });
      return;
    }

    // If password already set, require current password
    if (isPasswordSet()) {
      if (!currentPassword) {
        res.status(400).json({ error: 'Current password is required' });
        return;
      }
      const valid = await verifyPassword(currentPassword);
      if (!valid) {
        res.status(401).json({ error: 'Current password is incorrect' });
        return;
      }
    }

    const hash = await hashPassword(password);
    setPasswordHash(hash);

    const token = createSession();
    res.json({ message: 'Password set successfully', token, expiresIn: '24h' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/auth/status
 * Check if password is set (for first-run detection).
 */
router.get('/status', (_req: Request, res: Response) => {
  res.json({ passwordSet: isPasswordSet() });
});

export default router;
