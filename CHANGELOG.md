# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-03-25

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
