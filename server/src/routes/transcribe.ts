import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { transcribe } from '../services/stt-manager';
import { refineText } from '../services/ollama';
import { getDb } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Configure multer for audio uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(config.audioUploadDir)) {
      fs.mkdirSync(config.audioUploadDir, { recursive: true });
    }
    cb(null, config.audioUploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${path.extname(file.originalname) || '.wav'}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max
  fileFilter: (_req, file, cb) => {
    const allowed = ['.wav', '.webm', '.mp3', '.m4a', '.ogg', '.flac'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext) || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported audio format: ${ext}`));
    }
  },
});

/**
 * POST /api/transcribe
 * Upload audio file, transcribe with STT, optionally refine with LLM.
 */
router.post('/', requireAuth, upload.single('audio'), async (req: Request, res: Response) => {
  const audioFile = req.file;

  if (!audioFile) {
    res.status(400).json({ error: 'No audio file uploaded. Send as multipart/form-data with field name "audio".' });
    return;
  }

  try {
    const language = (req.body.language as string) || config.defaultLanguage;
    const source = (req.body.source as string) || 'mac-mini';
    const skipRefinement = req.body.skip_refinement === 'true';

    // Step 1: STT
    const sttResult = await transcribe(audioFile.path, { language });

    // Step 2: LLM Refinement (if enabled)
    let refinedText: string | null = null;
    let llmLatencyMs: number | null = null;

    if (!skipRefinement) {
      // Check if AI refinement is enabled in settings
      const db = getDb();
      const aiSetting = db
        .prepare('SELECT value FROM settings WHERE key = ?')
        .get('ai_refinement') as { value: string } | undefined;

      if (aiSetting?.value !== 'false') {
        try {
          const refinement = await refineText(sttResult.text, { language });
          refinedText = refinement.refinedText;
          llmLatencyMs = refinement.latencyMs;
        } catch (error: any) {
          console.warn(`LLM refinement failed, returning raw text: ${error.message}`);
          // Don't fail the whole request if LLM is unavailable
        }
      }
    }

    // Step 3: Save to database
    const db = getDb();
    const result = db
      .prepare(
        `INSERT INTO transcriptions
         (raw_text, refined_text, language, duration_ms, stt_engine, stt_latency_ms, llm_latency_ms, audio_path, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        sttResult.text,
        refinedText,
        language,
        req.body.duration_ms ? parseInt(req.body.duration_ms, 10) : null,
        sttResult.engine,
        sttResult.latencyMs,
        llmLatencyMs,
        config.keepAudioFiles ? audioFile.path : null,
        source
      );

    // Update FTS index
    db.prepare(
      `INSERT INTO transcriptions_fts(rowid, raw_text, refined_text)
       VALUES (?, ?, ?)`
    ).run(result.lastInsertRowid, sttResult.text, refinedText);

    // Clean up audio file if not keeping
    if (!config.keepAudioFiles && fs.existsSync(audioFile.path)) {
      fs.unlinkSync(audioFile.path);
    }

    // Response
    const totalLatency = sttResult.latencyMs + (llmLatencyMs || 0);
    res.json({
      id: result.lastInsertRowid,
      raw_text: sttResult.text,
      refined_text: refinedText,
      stt_engine: sttResult.engine,
      stt_latency_ms: sttResult.latencyMs,
      llm_latency_ms: llmLatencyMs,
      total_latency_ms: totalLatency,
      used_fallback: sttResult.usedFallback,
      language,
    });
  } catch (error: any) {
    // Clean up on error
    if (audioFile && fs.existsSync(audioFile.path)) {
      fs.unlinkSync(audioFile.path);
    }
    console.error('Transcription error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
