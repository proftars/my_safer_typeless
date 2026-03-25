# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-03-25

### Changed
- Upgraded default LLM from Qwen 2.5:7B to Qwen3:8B for better Chinese text refinement
- Switched from `form-data` package to native `FormData` + `Blob` for Groq API uploads (fixes Node.js 24 compatibility)
- Added `dotenv` for `.env` file loading (fixes environment variables not being read by tsx)
- Disabled Qwen3 thinking mode (`think: false`) for faster text refinement
- Added safety filter to strip residual `<think>` tags from Qwen3 output

### Fixed
- Fixed Groq API returning `multipart: NextPart: EOF` error due to incompatible form-data library with native fetch
- Fixed `.env` file not being loaded when running `tsx watch`

## [1.0.0] - 2026-03-25

### Added
- Express server with TypeScript
- Groq Whisper API integration (primary STT engine)
- Local whisper.cpp integration (fallback STT engine)
- Automatic STT engine fallback (Groq → whisper.cpp)
- Ollama text refinement with Qwen 2.5:7B (preserves conversational tone)
- Custom vocabulary management (CRUD + import/export)
- Transcription history with full-text search (FTS5)
- Shared password authentication
- System settings API
- Usage statistics API
- Health check endpoint
- SQLite database with WAL mode
