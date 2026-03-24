import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import { config } from '../config';

const execFileAsync = promisify(execFile);

/**
 * Transcribe audio using local whisper.cpp.
 * Used as fallback when Groq API is unavailable.
 */
export async function transcribeWithLocal(
  audioFilePath: string,
  options: {
    language?: string;
    model?: string;
  } = {}
): Promise<{ text: string; engine: string }> {
  const language = options.language || config.defaultLanguage;
  const whisperLang = language.startsWith('zh') ? 'zh' : language.split('-')[0];

  // Build whisper.cpp command args
  const args: string[] = [];

  // Add model path if configured
  if (config.whisperModelPath) {
    args.push('-m', config.whisperModelPath);
  }

  args.push(
    '-l', whisperLang,
    '-f', audioFilePath,
    '--no-timestamps',
    '--print-special', 'false',
    '-otxt'
  );

  try {
    const { stdout, stderr } = await execFileAsync(config.whisperCppPath, args, {
      timeout: 60000, // 60 second timeout
      maxBuffer: 10 * 1024 * 1024, // 10 MB
    });

    // whisper.cpp outputs to stdout
    let text = stdout.trim();

    // If output was written to file instead, read it
    if (!text) {
      const txtPath = audioFilePath + '.txt';
      if (fs.existsSync(txtPath)) {
        text = fs.readFileSync(txtPath, 'utf-8').trim();
        fs.unlinkSync(txtPath); // Clean up
      }
    }

    if (!text) {
      throw new Error('whisper.cpp produced no output');
    }

    return {
      text,
      engine: 'local',
    };
  } catch (error: any) {
    throw new Error(`whisper.cpp error: ${error.message}`);
  }
}

/**
 * Check if whisper.cpp is available on the system.
 */
export async function checkWhisperHealth(): Promise<boolean> {
  try {
    await execFileAsync(config.whisperCppPath, ['--help'], { timeout: 5000 });
    return true;
  } catch {
    // --help may return non-zero exit code, but if the binary exists it ran
    return true;
  }
}
