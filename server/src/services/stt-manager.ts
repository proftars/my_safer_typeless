import { transcribeWithGroq, checkGroqHealth } from './stt-groq';
import { transcribeWithLocal } from './stt-local';
import { getDb } from '../db';

interface TranscriptionResult {
  text: string;
  engine: string; // 'groq' | 'groq-turbo' | 'local'
  latencyMs: number;
  usedFallback: boolean;
}

/**
 * Get the current STT engine preference from settings.
 */
function getSttEngine(): string {
  const db = getDb();
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('stt_engine') as
    | { value: string }
    | undefined;
  return row?.value || 'groq';
}

/**
 * Transcribe audio with automatic fallback.
 *
 * Strategy:
 * 1. Try the preferred engine (default: Groq)
 * 2. If it fails, automatically fall back to the local engine
 * 3. Return result with metadata about which engine was used
 */
export async function transcribe(
  audioFilePath: string,
  options: { language?: string } = {}
): Promise<TranscriptionResult> {
  const preferredEngine = getSttEngine();
  const startTime = Date.now();

  // If preferred engine is local, just use local
  if (preferredEngine === 'local') {
    try {
      const result = await transcribeWithLocal(audioFilePath, options);
      return {
        text: result.text,
        engine: result.engine,
        latencyMs: Date.now() - startTime,
        usedFallback: false,
      };
    } catch (error: any) {
      throw new Error(`Local STT failed: ${error.message}`);
    }
  }

  // Try Groq first
  try {
    const groqModel =
      preferredEngine === 'groq-turbo' ? 'whisper-large-v3-turbo' : 'whisper-large-v3';

    const result = await transcribeWithGroq(audioFilePath, {
      ...options,
      model: groqModel,
    });

    return {
      text: result.text,
      engine: result.engine,
      latencyMs: Date.now() - startTime,
      usedFallback: false,
    };
  } catch (groqError: any) {
    console.warn(`Groq STT failed, falling back to local: ${groqError.message}`);

    // Fallback to local whisper.cpp
    const fallbackStart = Date.now();
    try {
      const result = await transcribeWithLocal(audioFilePath, options);
      return {
        text: result.text,
        engine: result.engine,
        latencyMs: Date.now() - fallbackStart,
        usedFallback: true,
      };
    } catch (localError: any) {
      throw new Error(
        `Both STT engines failed. Groq: ${groqError.message}. Local: ${localError.message}`
      );
    }
  }
}
