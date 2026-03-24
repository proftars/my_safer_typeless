// Shared types for My Safer Typeless

export interface TranscriptionResult {
  id: number;
  raw_text: string;
  refined_text: string | null;
  stt_engine: 'groq' | 'groq-turbo' | 'local';
  stt_latency_ms: number;
  llm_latency_ms: number | null;
  total_latency_ms: number;
  used_fallback: boolean;
  language: string;
}

export interface VocabularyEntry {
  id: number;
  term: string;
  alternatives: string[];
  category: 'person' | 'place' | 'tech' | 'brand' | 'other';
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface HistoryEntry {
  id: number;
  raw_text: string;
  refined_text: string | null;
  language: string;
  duration_ms: number | null;
  stt_engine: string;
  stt_latency_ms: number | null;
  llm_latency_ms: number | null;
  audio_path: string | null;
  source: string;
  created_at: string;
}

export interface Settings {
  stt_engine: string;
  stt_fallback: string;
  whisper_model: string;
  ollama_model: string;
  language: string;
  hotkey_mode: 'toggle' | 'hold';
  hotkey_key: string;
  auto_paste: string;
  ai_refinement: string;
  groq_api_key: string;
  server_url: string;
}

export interface HealthStatus {
  status: string;
  version: string;
  services: {
    groq: string;
    ollama: string;
    whisperCpp: string;
  };
  timestamp: string;
}

export type RecordingState = 'idle' | 'recording' | 'processing' | 'cancelled';

export interface HotkeyConfig {
  mode: 'toggle' | 'hold';
  key: string; // e.g., 'ctrl+`'
  cancelKey: string; // e.g., 'Escape'
}
