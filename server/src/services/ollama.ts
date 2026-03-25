import { config } from '../config';
import { getDb } from '../db';

interface OllamaGenerateResponse {
  response: string;
  done: boolean;
}

/**
 * Get all enabled vocabulary terms formatted for the prompt.
 */
function getVocabularyPrompt(): string {
  const db = getDb();
  const rows = db
    .prepare('SELECT term, alternatives FROM vocabulary WHERE enabled = 1')
    .all() as Array<{ term: string; alternatives: string }>;

  if (rows.length === 0) return '';

  const lines = rows.map((row) => {
    const alts = JSON.parse(row.alternatives || '[]') as string[];
    if (alts.length > 0) {
      return `  - "${row.term}"（可能被誤聽為：${alts.join('、')}）`;
    }
    return `  - "${row.term}"`;
  });

  return lines.join('\n');
}

/**
 * Build the refinement prompt based on language.
 */
function buildPrompt(rawText: string, language: string): string {
  const vocabSection = getVocabularyPrompt();
  const vocabBlock = vocabSection
    ? `5. 使用以下自訂詞彙的正確寫法：\n${vocabSection}`
    : '';

  if (language.startsWith('zh')) {
    return `你是一個繁體中文文字編輯助手。請將以下語音轉錄結果稍微整理，使其更通順易讀。

規則：
1. 移除明顯的贅字和語氣詞（呃、嗯、那個、就是說、對對對）
2. 修正標點符號
3. 保留說話者的語氣和用詞風格，不要過度正式化
4. 維持原意，不要添加或刪減實質內容
${vocabBlock}

原始轉錄：
${rawText}

請直接輸出整理結果，不要加任何說明。`;
  }

  // English prompt
  return `You are an English text editor. Clean up the following voice transcription to make it more readable.

Rules:
1. Remove filler words (um, uh, like, you know, basically)
2. Fix punctuation
3. Keep the speaker's tone and word choices, don't over-formalize
4. Preserve the original meaning, don't add or remove substantive content
${vocabBlock}

Original transcription:
${rawText}

Output only the cleaned text, no explanations.`;
}

/**
 * Refine transcribed text using Ollama LLM.
 */
export async function refineText(
  rawText: string,
  options: { language?: string } = {}
): Promise<{ refinedText: string; latencyMs: number }> {
  const language = options.language || config.defaultLanguage;
  const prompt = buildPrompt(rawText, language);

  const startTime = Date.now();

  const response = await fetch(`${config.ollamaUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.ollamaModel,
      prompt,
      stream: false,
      think: false, // Disable thinking mode for Qwen3 (faster, no <think> overhead)
      options: {
        temperature: 0.3, // Low temperature for consistent output
        num_predict: 2048,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Ollama error (${response.status}): ${errorBody}`);
  }

  const result = (await response.json()) as OllamaGenerateResponse;
  // Strip any residual <think>...</think> blocks (safety net for Qwen3)
  const refinedText = result.response
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .trim();

  return {
    refinedText,
    latencyMs: Date.now() - startTime,
  };
}

/**
 * Check if Ollama is running and the model is available.
 */
export async function checkOllamaHealth(): Promise<{
  running: boolean;
  modelLoaded: boolean;
}> {
  try {
    const response = await fetch(`${config.ollamaUrl}/api/tags`);
    if (!response.ok) return { running: false, modelLoaded: false };

    const data = (await response.json()) as { models: Array<{ name: string }> };
    const modelLoaded = data.models?.some(
      (m) => m.name === config.ollamaModel || m.name.startsWith(config.ollamaModel)
    ) ?? false;

    return { running: true, modelLoaded };
  } catch {
    return { running: false, modelLoaded: false };
  }
}
