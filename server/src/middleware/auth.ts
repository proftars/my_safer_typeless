import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db';

// In-memory session store (simple for v1)
const sessions = new Map<string, { createdAt: number }>();
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function getPasswordHash(): string {
  const db = getDb();
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('shared_password_hash') as
    | { value: string }
    | undefined;
  return row?.value || '';
}

export function setPasswordHash(hash: string): void {
  const db = getDb();
  db.prepare(
    'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime(\'now\'))'
  ).run('shared_password_hash', hash);
}

export async function verifyPassword(password: string): Promise<boolean> {
  const hash = getPasswordHash();
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function createSession(): string {
  // Clean expired sessions
  const now = Date.now();
  for (const [token, session] of sessions) {
    if (now - session.createdAt > SESSION_TTL_MS) {
      sessions.delete(token);
    }
  }

  const token = uuidv4();
  sessions.set(token, { createdAt: now });
  return token;
}

export function isPasswordSet(): boolean {
  return getPasswordHash() !== '';
}

/**
 * Auth middleware: checks for valid session token in Authorization header.
 * If no password is set yet, allows access (first-run setup).
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  // If no password set yet, allow access for initial setup
  if (!isPasswordSet()) {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const token = authHeader.slice(7);
  const session = sessions.get(token);

  if (!session) {
    res.status(401).json({ error: 'Invalid or expired session' });
    return;
  }

  // Check expiry
  if (Date.now() - session.createdAt > SESSION_TTL_MS) {
    sessions.delete(token);
    res.status(401).json({ error: 'Session expired' });
    return;
  }

  next();
}
