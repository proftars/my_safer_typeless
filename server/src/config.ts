import path from 'path';

export const config = {
  port: parseInt(process.env.PORT || '3100', 10),
  host: process.env.HOST || '0.0.0.0',

  // Auth
  sharedPassword: process.env.SHARED_PASSWORD || '',

  // Groq API
  groqApiKey: process.env.GROQ_API_KEY || '',
  groqModel: process.env.GROQ_MODEL || 'whisper-large-v3',
  groqApiUrl: 'https://api.groq.com/openai/v1/audio/transcriptions',

  // Local whisper.cpp
  whisperCppPath: process.env.WHISPER_CPP_PATH || 'whisper-cpp',
  whisperModelPath: process.env.WHISPER_MODEL_PATH || '',

  // Ollama
  ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
  ollamaModel: process.env.OLLAMA_MODEL || 'qwen2.5:7b',

  // Language
  defaultLanguage: process.env.DEFAULT_LANGUAGE || 'zh-TW',

  // Audio
  audioUploadDir: process.env.AUDIO_UPLOAD_DIR || path.join(process.cwd(), 'audio-uploads'),
  keepAudioFiles: process.env.KEEP_AUDIO_FILES === 'true',

  // Database
  dbPath: path.join(process.cwd(), 'data', 'safer-typeless.db'),
};
