# My Safer Typeless

Self-hosted voice-to-text with AI refinement. A Typeless alternative that runs on your Mac Mini.

## What it does

Press a hotkey, speak, and your words appear at the cursor — transcribed and cleaned up by AI.

- **Toggle mode** (default): Press `Ctrl+`` to start recording, press again to stop
- **Hold mode**: Hold the hotkey while speaking, release to stop
- **Esc**: Cancel current recording

## Architecture

```
Mac Mini (Server)          MacBook Air (Client)
┌─────────────────┐        ┌──────────────┐
│ Express Server   │◀──────│ Electron App  │
│ + Groq Whisper   │ Tailscale │ + Hotkey     │
│ + Ollama LLM     │        │ + Paste      │
│ + SQLite         │        └──────────────┘
└─────────────────┘
```

## Quick Start

### Prerequisites

- Node.js >= 22
- Ollama (`brew install ollama`)
- whisper.cpp (`brew install whisper-cpp`) — fallback only
- ffmpeg (`brew install ffmpeg`)
- [Groq API Key](https://console.groq.com) (free)

### Server Setup

```bash
cd server
cp .env.example .env
# Edit .env: set GROQ_API_KEY

npm install
npm run dev
```

The server starts at `http://0.0.0.0:3100`.

### First Run

1. Set a shared password: `POST /api/auth/set-password` with `{ "password": "your-password" }`
2. Verify: `POST /api/auth/verify` with `{ "password": "your-password" }` → returns session token
3. Transcribe: `POST /api/transcribe` with audio file + `Authorization: Bearer <token>`

## API

| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/verify` | Login with shared password |
| `POST /api/transcribe` | Upload audio, get transcription |
| `GET /api/history` | Transcription history |
| `GET/POST/PUT/DELETE /api/vocabulary` | Custom vocabulary management |
| `GET/PUT /api/settings` | System settings |
| `GET /api/stats/overview` | Usage statistics |
| `GET /api/health` | Service health check |

## Tech Stack

- **Server**: Node.js + Express + TypeScript + SQLite
- **STT**: Groq Whisper API (primary) + whisper.cpp (fallback)
- **LLM**: Ollama + Qwen 2.5:7B
- **Desktop**: Electron + React (coming in v0.2.0)
- **Admin Portal**: React + shadcn/ui (coming in v0.3.0)

## Version History

See [CHANGELOG.md](CHANGELOG.md).

## License

MIT
