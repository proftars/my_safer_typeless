import { getDb } from '../db';

export interface VocabularyEntry {
  id: number;
  term: string;
  alternatives: string[];
  category: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface DbVocabularyRow {
  id: number;
  term: string;
  alternatives: string;
  category: string;
  enabled: number;
  created_at: string;
  updated_at: string;
}

function rowToEntry(row: DbVocabularyRow): VocabularyEntry {
  return {
    ...row,
    alternatives: JSON.parse(row.alternatives || '[]'),
    enabled: row.enabled === 1,
  };
}

export function getAllVocabulary(): VocabularyEntry[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM vocabulary ORDER BY term ASC').all() as DbVocabularyRow[];
  return rows.map(rowToEntry);
}

export function getVocabularyById(id: number): VocabularyEntry | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM vocabulary WHERE id = ?').get(id) as
    | DbVocabularyRow
    | undefined;
  return row ? rowToEntry(row) : null;
}

export function createVocabulary(data: {
  term: string;
  alternatives?: string[];
  category?: string;
}): VocabularyEntry {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO vocabulary (term, alternatives, category)
       VALUES (?, ?, ?)`
    )
    .run(
      data.term,
      JSON.stringify(data.alternatives || []),
      data.category || 'other'
    );

  return getVocabularyById(result.lastInsertRowid as number)!;
}

export function updateVocabulary(
  id: number,
  data: Partial<{
    term: string;
    alternatives: string[];
    category: string;
    enabled: boolean;
  }>
): VocabularyEntry | null {
  const db = getDb();
  const existing = getVocabularyById(id);
  if (!existing) return null;

  const updates: string[] = [];
  const values: any[] = [];

  if (data.term !== undefined) {
    updates.push('term = ?');
    values.push(data.term);
  }
  if (data.alternatives !== undefined) {
    updates.push('alternatives = ?');
    values.push(JSON.stringify(data.alternatives));
  }
  if (data.category !== undefined) {
    updates.push('category = ?');
    values.push(data.category);
  }
  if (data.enabled !== undefined) {
    updates.push('enabled = ?');
    values.push(data.enabled ? 1 : 0);
  }

  if (updates.length === 0) return existing;

  updates.push("updated_at = datetime('now')");
  values.push(id);

  db.prepare(`UPDATE vocabulary SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  return getVocabularyById(id);
}

export function deleteVocabulary(id: number): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM vocabulary WHERE id = ?').run(id);
  return result.changes > 0;
}

export function importVocabulary(
  entries: Array<{ term: string; alternatives?: string[]; category?: string }>
): number {
  const db = getDb();
  const insert = db.prepare(
    `INSERT INTO vocabulary (term, alternatives, category) VALUES (?, ?, ?)`
  );

  let count = 0;
  const importAll = db.transaction(() => {
    for (const entry of entries) {
      insert.run(
        entry.term,
        JSON.stringify(entry.alternatives || []),
        entry.category || 'other'
      );
      count++;
    }
  });

  importAll();
  return count;
}
