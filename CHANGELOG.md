# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-03-26

### Added
- Electron menu bar (tray) client for macOS
- Global hotkey registration (`Ctrl+\``) with state machine: IDLE → RECORDING → PROCESSING → IDLE
- Audio recording via Web Audio API in hidden BrowserWindow (WAV output, 60s auto-stop)
- ESC key cancellation during recording
- Auto-paste of transcribed text via AppleScript (Cmd+V keystroke simulation)
- Tray icon state indicators (idle / recording / processing / error)
- Settings window with server URL, password, hotkey, auto-refine, auto-paste toggles
- Connection test button in settings
- Persistent settings via electron-store
- Recorder window HTML for audio capture UI

### Fixed
- Electron tray icon rendering issue on macOS
- macOS compatibility fixes for tray and menu behavior

## [0.2.0] - 2026-03-25

### Added
- Admin Portal SPA (React 18 + TypeScript + Tailwind CSS + Vite)
- Login page with token-based auth (shared password → JWT)
- Dashboard with stats overview (today/week/month/all-time) + 30-day usage & latency charts (SVG)
- Transcription history page with full-text search, pagination, detail modal, delete
- Vocabulary management (CRUD + enable/disable + JSON import/export)
- Settings page with unsaved-change tracking
- Sidebar navigation with active route highlighting
- Server health indicators in top bar
- Traditional Chinese UI labels throughout
- Server serves built Admin Portal static files at `/admin/`

### Fixed
- Admin Portal build and routing bug fixes

## [0.1.1] - 2026-03-25

### Changed
- Upgraded default LLM from Qwen 2.5:7B to Qwen3:8B for better Chinese text refinement
- Switched from `form-data` package to native `FormData` + `Blob` for Groq API uploads (fixes Node.js 24 compatibility)
- Added `dotenv` for `.env` file loading (fixes environment variables not being read by tsx)
- Disabled Qwen3 thinking mode (`think: false`) for faster text refinement
- Added safety filter to strip residual `<think>` tags from Qwen3 output

### Fixed
- Groq API returning `multipart: NextPart: EOF` error due to incompatible form-data library with native fetch
- `.env` file not being loaded when running `tsx watch`

## [0.1.0] - 2026-03-25

### Added
- Express server with TypeScript
- Groq Whisper API integration (primary STT engine)
- Local whisper.cpp integration (fallback STT engine)
- Automatic STT engine fallback (Groq → whisper.cpp)
- Ollama text refinement (preserves conversational tone)
- Custom vocabulary management (CRUD + import/export)
- Transcription history with full-text search (FTS5)
- Shared password authentication
- System settings API
- Usage statistics API
- Health check endpoint
- SQLite database with WAL mode
