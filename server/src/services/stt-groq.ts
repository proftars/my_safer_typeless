import fs from 'fs';
import path from 'path';
import { config } from '../config';

interface GroqTranscriptionResult {
  text: string;
  language?: string;
}

/**
 * Transcribe audio using Groq Whisper API.
 * Supports whisper-large-v3 and whisper-large-v3-turbo.
 */
export async function transcribeWithGroq(
  audioFilePath: string,
  options: {
    language?: string;
    model?: string;
  } = {}
): Promise<{ text: string; engine: string }> {
  const apiKey = config.groqApiKey;
  if (!apiKey) {
    throw new Error('Groq API key not configured');
  }

  const model = options.model || config.groqModel;
  const language = options.language || config.defaultLanguage;

  // Map language codes: zh-TW -> zh for Whisper
  const whisperLang = language.startsWith('zh') ? 'zh' : language.split('-')[0];

  // Build multipart form data using native FormData + Blob (compatible with native fetch in Node 18+)
  const fileBuffer = fs.readFileSync(audioFilePath);
  const blob = new Blob([fileBuffer]);
  const formData = new FormData();
  formData.append('file', blob, path.basename(audioFilePath));
  formData.append('model', model);
  formData.append('language', whisperLang);
  formData.append('response_format', 'json');

  const response = await fetch(config.groqApiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Groq API error (${response.status}): ${errorBody}`);
  }

  const result = (await response.json()) as GroqTranscriptionResult;

  return {
    text: result.text.trim(),
    engine: model === 'whisper-large-v3-turbo' ? 'groq-turbo' : 'groq',
  };
}

/**
 * Check if Groq API is accessible.
 */
export async function checkGroqHealth(): Promise<boolean> {
  if (!config.groqApiKey) return false;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${config.groqApiKey}` },
    });
    return response.ok;
  } catch {
    return false;
  }
}
