# My Safer Typeless - Electron Client

A production-ready Electron menu bar (tray) application for voice-to-text transcription with global hotkey support and auto-paste functionality.

## Features

- **Menu Bar App**: Runs as a macOS menu bar (tray) icon with no dock icon
- **Global Hotkey**: Press Ctrl+` (or custom hotkey) to start/stop recording
- **Audio Recording**: Records audio using Web Audio API in a hidden Electron window
- **Auto-Paste**: Automatically pastes transcribed text to the active application
- **Visual Feedback**: Tray icon changes color during recording (red) and processing (yellow)
- **Settings Management**: Configure server URL, authentication, hotkey, and paste preferences
- **Connection Testing**: Test server connectivity and authentication before saving settings
- **Error Handling**: Comprehensive error handling with user notifications
- **State Machine**: Proper state management for IDLE → RECORDING → PROCESSING → IDLE flow

## Architecture

### State Machine

```
IDLE (waiting for hotkey)
  ↓ (Ctrl+` pressed)
RECORDING (microphone active, red tray icon)
  ↓ (Ctrl+` pressed again or timeout at 60 sec)
PROCESSING (audio sent to server, yellow tray icon)
  ↓ (transcription complete)
IDLE (text pasted/copied)

ESC key: Cancel from RECORDING state
```

### Project Structure

```
electron/
├── src/
│   ├── main.ts              # Main Electron process
│   ├── recorder.ts          # Audio recording using Web Audio API
│   ├── api.ts               # API client for server communication
│   ├── hotkey.ts            # Global hotkey management
│   ├── tray.ts              # Menu bar (tray) icon management
│   ├── clipboard.ts         # Clipboard and paste functionality
│   ├── settings.ts          # Settings persistence (electron-store)
│   └── preload.ts           # IPC bridge for renderer processes
├── package.json             # Dependencies and build configuration
├── tsconfig.json            # TypeScript configuration
├── .gitignore              # Git ignore rules
└── README.md               # This file
```

## Installation

### Prerequisites

- macOS 10.13+
- Node.js 16+
- npm or yarn

### Setup

```bash
cd electron
npm install
```

## Development

### Start Dev Mode

```bash
npm run dev
```

This runs TypeScript in watch mode and launches the Electron app with hot reload.

### Build TypeScript

```bash
npm run build
```

Compiles TypeScript to JavaScript in the `dist/` directory.

## Packaging

### Create Distribution Package

```bash
npm run package:mac
```

Creates a `.dmg` file for distribution on macOS.

### Other Platforms

To package for other platforms, modify the build configuration in `package.json` or use electron-builder commands directly.

## Usage

### First Run

1. Launch the application
2. Click the menu bar icon (top right)
3. Select "Settings..."
4. Enter your server URL and password
5. Click "Test Connection" to verify
6. Adjust hotkey if desired (default: Ctrl+`)
7. Toggle auto-refine and auto-paste options
8. Click "Save Settings"

### Recording Audio

1. Press the global hotkey (default: Ctrl+`)
   - Tray icon turns red
   - Microphone is active
2. Speak your message (up to 60 seconds)
3. Press the hotkey again to stop and send
   - Tray icon turns yellow (processing)
4. After transcription:
   - Text is automatically pasted to the active application
   - Tray icon returns to normal (gray/idle)

### Canceling Recording

Press ESC at any time during recording to cancel without sending to the server.

## Configuration

All settings are stored locally in the user's application data directory:
- macOS: `~/Library/Application Support/My Safer Typeless/`

### Settings

- **Server URL**: The base URL of your My Safer Typeless server (e.g., `http://localhost:3100`)
- **Auth Token**: Stored after successful authentication (never shown in UI)
- **Global Hotkey**: Default `Control+\``, supports any valid electron-accelerator format
- **Auto-refine**: Use refined transcription (false = raw transcription)
- **Auto-paste**: Automatically paste results to active application

## API Integration

### Authentication

```
POST /api/auth/verify
Body: { "password": "your-password" }
Response: { "token": "jwt-token" }
```

### Transcription

```
POST /api/transcribe
Headers:
  - Authorization: Bearer {token}
  - Content-Type: multipart/form-data
Body: multipart with "audio" field (WAV file)
Response: {
  "rawText": "...",
  "refinedText": "...",
  "duration": 12.5
}
```

## Keyboard Shortcuts

- **Global Hotkey**: Ctrl+` (customizable) - Start/Stop recording
- **ESC**: Cancel recording (only during RECORDING state)
- **Cmd+V**: Auto-triggered after transcription (uses AppleScript)

## Troubleshooting

### Microphone Access Denied

macOS requires explicit permission for microphone access. On first run, you may see a system prompt. Grant permission by:
1. Opening System Preferences → Security & Privacy → Microphone
2. Adding "Electron" to the allowed applications list
3. Restarting the app

### Connection Failed

1. Verify the server URL is correct
2. Check that the server is running
3. Confirm the password is correct
4. Use "Test Connection" in Settings to debug

### Hotkey Not Working

1. Check the hotkey format in Settings
2. Verify another application isn't already using the same hotkey
3. Try a different hotkey combination
4. Restart the application

### No Audio Recorded

1. Check microphone permissions (see above)
2. Verify microphone is connected and working
3. Check volume level
4. Try another application's audio input to confirm microphone works

## Known Limitations

- macOS only (optimized for macOS menu bar)
- Maximum 60 seconds of recording per session
- Requires persistent network connection to server
- Paste functionality requires Accessibility permissions on macOS

## Performance Considerations

- Audio recording uses Web Audio API for compatibility and reliability
- Temporary audio files are stored in system temp directory and auto-cleaned
- Network timeout is set to 30 seconds for API calls
- Hotkey registration is global and works even when app is in background

## Security

- No passwords or tokens are logged
- Audio files are saved to temp directory and deleted immediately after transcription
- API communication uses Bearer token authentication
- All IPC communication between processes is controlled and validated

## Development Tips

### Enable DevTools in Settings Window

Set `isDev` environment variable or modify the code in `createSettingsWindow()` to automatically open DevTools.

### Logging

Check the browser console in DevTools for detailed logging:
- State changes
- Hotkey registration
- API requests/responses
- Audio recording events

### Testing Connection

The Settings window includes a "Test Connection" button that:
1. Verifies server is reachable
2. Attempts authentication with provided password
3. Returns token on success
4. Shows detailed error messages on failure

## Building for Distribution

1. Ensure code is fully tested
2. Update version in `package.json`
3. Run `npm run dist` to build and package
4. Sign the `.dmg` file (recommended for distribution)
5. Upload to distribution service

## License

MIT
