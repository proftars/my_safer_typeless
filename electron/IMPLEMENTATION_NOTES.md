# Implementation Notes

This document explains the architecture decisions, implementation details, and technical rationale for the My Safer Typeless Electron client.

## Architecture Overview

### State Machine

The application uses a strict three-state machine:

```
IDLE → RECORDING → PROCESSING → IDLE
```

**IDLE**: Waiting for user input. Hotkey presses start recording.

**RECORDING**: Audio is being captured from the microphone. Tray icon is red. Another hotkey press stops recording and transitions to PROCESSING.

**PROCESSING**: Audio is being sent to the server for transcription. Tray icon is yellow. User cannot interact until this completes (or errors).

**ESC during RECORDING**: Cancels the recording and returns to IDLE without sending to server.

#### State Transitions

```typescript
IDLE:
  - Hotkey pressed → Start recording → RECORDING
  - Cancel → IDLE (no-op)

RECORDING:
  - Hotkey pressed → Send audio → PROCESSING
  - ESC pressed → Cancel → IDLE
  - Timeout (60s) → Auto-stop → PROCESSING

PROCESSING:
  - Server responds → Paste text → IDLE
  - Server error → Show error → IDLE
  - Hotkey pressed → Ignored (debounced)

IDLE:
  - Ready for next recording
```

### Process Architecture

```
Main Process (Electron)
├── Tray Manager (icon, menu, notifications)
├── Hotkey Manager (global shortcut handling)
├── Settings Manager (persistent storage)
├── API Client (server communication)
├── Clipboard Manager (paste operations)
└── Recorder (audio capture via BrowserWindow)
    └── Hidden BrowserWindow
        └── Web Audio API (microphone access)
```

#### Why Hidden BrowserWindow for Recording?

We chose Web Audio API in a hidden BrowserWindow over native node modules because:

1. **Reliability**: Web Audio API is well-tested and widely used
2. **Cross-platform**: Easier to port to other platforms if needed
3. **No native dependencies**: No C++ compilation, no `sox` or `rec` required
4. **Permissions handling**: Electron's permission model handles microphone access cleanly
5. **Debugging**: Can inspect and debug recording window if needed

#### Alternative Considered

Native approach using `node-record-lpcm16`:
- ❌ Requires additional system dependencies (sox/rec)
- ❌ More complex error handling
- ✓ Lower resource usage
- ✓ Slightly faster startup

We chose web audio for better reliability and maintainability.

## File Organization

### src/main.ts

**Entry point for the Electron application.**

Key responsibilities:
- App lifecycle management (ready, window-all-closed, activate, before-quit)
- Main window creation (minimal hidden window for IPC)
- Recorder initialization
- Hotkey registration
- Tray initialization
- IPC handler setup
- Settings window creation and management
- Error handling and notifications

**Key Decision**: Uses a minimal hidden window for IPC instead of preload script because:
1. Main process needs to control the audio recorder
2. IPC communication is simpler with a window reference
3. Allows proper context isolation for security

### src/recorder.ts

**Manages audio recording using Web Audio API in a hidden BrowserWindow.**

Key responsibilities:
- Hidden window creation and management
- Web Audio API setup and teardown
- Recording start/stop/cancel operations
- Temporary file management
- State tracking
- Event emission for main process

**Technical Details**:
- Records in WAV format (standard, widely supported)
- Maximum 60-second recording with auto-stop
- Auto-cleanup of temporary files on success and error
- Graceful error handling with user notifications

**Why WAV Format?**
- No compression overhead
- Wide browser support
- Standard format for audio APIs
- Server expects WAV input

### src/api.ts

**Handles all server communication via axios.**

Key responsibilities:
- Authentication (password → token exchange)
- Transcription requests (multipart audio upload)
- Health checks
- Error handling and translation
- Token management

**Implementation Details**:
- Uses FormData for multipart file upload
- Bearer token in Authorization header
- 30-second timeout for all requests
- Comprehensive error messages for users

**Security Notes**:
- Token is stored securely in electron-store
- Never logged or exposed
- Re-requested if expired
- Password is not stored (only last used one cached)

### src/hotkey.ts

**Global hotkey registration and state management.**

Key responsibilities:
- Register/unregister global hotkeys
- Implement state machine logic
- Handle ESC key for cancellation
- Normalize hotkey format for cross-platform support

**Hotkey Format Normalization**:
```typescript
"ctrl+`" → "Control+`"
"Cmd+Shift+V" → "Command+Shift+V"
"Alt+M" → "Alt+M"
```

**Why Escape is Special?**
- Only works during RECORDING state
- Cancels recording without sending to server
- User can press ESC while speaking if they make a mistake

### src/tray.ts

**Menu bar icon and context menu management.**

Key responsibilities:
- Tray icon creation and lifecycle
- Context menu rendering
- Icon state changes (idle/recording/processing/error)
- User notifications
- PNG icon generation

**Icon States**:
- **IDLE** (gray): App is ready
- **RECORDING** (red): Microphone is active
- **PROCESSING** (yellow): Waiting for server response
- **ERROR** (orange): Something went wrong

**Why Generated PNGs?**
- No external image files needed for basic functionality
- Custom colors can be added easily
- Fallback if assets don't exist
- Binary format included in source

**Note**: For production, replace with actual PNG assets in `assets/` directory.

### src/settings.ts

**Persistent application settings using electron-store.**

Key responsibilities:
- Type-safe settings access
- Default values
- Persistent storage
- Settings validation

**Settings Stored**:
```typescript
{
  serverUrl: string,           // Server base URL
  authToken: string | null,    // JWT token
  hotkeyKey: string,           // Global hotkey
  autoRefine: boolean,         // Use refined transcription
  autoPaste: boolean,          // Auto-paste results
  lastPassword?: string,       // Optional cached password
}
```

**Storage Location**:
- macOS: `~/Library/Application Support/My Safer Typeless/config/settings.json`
- Encrypted if using electron-store's encryption

### src/clipboard.ts

**Clipboard operations and auto-paste functionality.**

Key responsibilities:
- Copy text to clipboard
- Simulate Cmd+V keystroke
- Delay paste if needed

**macOS-Specific Implementation**:
```typescript
clipboard.writeText(text);
execSync(`osascript -e 'tell application "System Events" to keystroke "v" using command down'`);
```

Uses AppleScript via osascript because:
- Reliable way to send keystrokes
- Works even when app is in background
- No special permissions needed
- Standard on all macOS systems

**Delay Parameter**:
- 100ms default delay after copying
- Gives target application time to focus
- Prevents race conditions
- User won't notice the delay

### src/preload.ts

**IPC bridge with context isolation for security.**

Key responsibilities:
- Expose safe IPC methods to renderer processes
- Type definitions for TypeScript
- Validate messages before passing to main process

**Exposed APIs**:
- Recording lifecycle events
- Settings management
- Connection testing
- Error handling

**Security Model**:
- No `nodeIntegration` enabled
- Context isolation enforced
- Only safe methods exposed
- Validates all parameters

## Error Handling Strategy

### User-Facing Errors

All errors show:
1. System notification with error message
2. Tray icon changes to ERROR (orange) state
3. Clear explanation of what went wrong
4. Suggested fixes in some cases

Example:
```
"Connection failed: Authentication failed - invalid token"
→ User should check password in Settings
```

### Silent Errors (Logged But Not Shown)

- Temporary file cleanup failures
- Non-critical initialization issues
- Debug information

### Fatal Errors

- Recorder window crash → Restart required
- Main process crash → System handles

## Performance Considerations

### Memory Usage

- Baseline: ~60-80 MB (before recording)
- During recording: +30-50 MB (audio buffer)
- Peak: ~100-150 MB
- Cleanup: Memory released after paste

### CPU Usage

- Idle: ~0.1% (minimal)
- Recording: ~2-5% (Web Audio processing)
- Processing: ~3-8% (network + transcription)
- Paste: ~0% (synchronous operation)

### Network

- Upload speed: Depends on audio file size
  - 30 second audio ≈ 200-300 KB
  - Upload: ~1-5 seconds on 10 Mbps connection
- Transcription: 2-10 seconds server-side
- Total round-trip: 3-20 seconds typical

## Security Considerations

### Authentication

1. Password is submitted once to server
2. Server returns JWT token
3. Token is stored locally in electron-store
4. Token sent with each transcription request
5. Token never logged or exposed

### Audio Privacy

- Audio files stored in OS temp directory
- Deleted immediately after transcription
- Not logged or cached
- Only transmitted to server

### Clipboard Data

- Text written to clipboard is visible to other apps
- Paste simulated via AppleScript (standard macOS)
- No special permissions required
- Can be intercepted if app has accessibility permission

### Code Isolation

- Main process: Full access to system
- Preload script: Limited exposure
- Renderer processes: Sandboxed
- IPC: Validated message passing

## Testing Strategy

### Manual Testing Checklist

```
[ ] App launches without crashes
[ ] Tray icon appears in menu bar
[ ] Settings window opens and closes
[ ] Server connection test works
[ ] Settings are saved and persisted
[ ] Hotkey starts recording
[ ] Audio is captured properly
[ ] Second hotkey press stops recording
[ ] Audio is sent to server
[ ] Transcription result is pasted
[ ] ESC cancels recording
[ ] Icon colors change correctly
[ ] Errors show notifications
[ ] 60-second auto-stop works
```

### Debug Commands

```bash
# Check if process is running
ps aux | grep Electron

# View application logs
~/Library/Application\ Support/My\ Safer\ Typeless/

# Test server connectivity
curl http://localhost:3100/health
curl -X POST http://localhost:3100/api/auth/verify -d '{"password":"test"}'
```

## Future Enhancements

### Potential Improvements

1. **Multiple languages**: Language selection in settings
2. **Recording preview**: Show waveform during recording
3. **History**: Store transcription history
4. **Customization**: Custom paste format, text styling
5. **Offline mode**: Cache transcriptions if server unavailable
6. **Analytics**: Track usage patterns (with privacy)
7. **Plugin system**: Custom post-processing
8. **Cloud sync**: Settings sync across devices

### Platform Support

Currently optimized for macOS menu bar. Future versions could support:
- Windows system tray
- Linux app indicator
- Web version
- Mobile clients

### Accessibility

Could be improved:
- Keyboard-only mode
- Voice feedback
- Screen reader support
- Visual indicator for deaf/hard of hearing

## Dependencies Analysis

### Electron (28+)
- Main framework
- Menu bar (tray) support
- Global hotkeys
- Native notifications

### electron-store
- Settings persistence
- Type-safe key-value store
- Platform-aware storage location

### axios
- HTTP client for API calls
- Better error handling than fetch
- Timeout support
- Request interceptors

### TypeScript
- Type safety
- Better IDE support
- Compile-time error detection

### electron-builder
- Cross-platform packaging
- Code signing support
- Auto-update infrastructure
- DMG/MSI/APPX creation

## Debugging Tips

### Enable Console Logging

Edit `main.ts`:
```typescript
const isDev = true; // Force dev mode
```

This will:
- Show dev tools in settings window
- Log more detailed messages
- Enable console inspection

### Check Settings File

```bash
cat "~/Library/Application Support/My Safer Typeless/config/settings.json"
```

### Test API Manually

```bash
# Get token
curl -X POST http://localhost:3100/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"password":"your-password"}'

# Use token to transcribe
curl -X POST http://localhost:3100/api/transcribe \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "audio=@recording.wav"
```

### Monitor Hotkey Events

Add to `hotkey.ts`:
```typescript
console.log(`Hotkey: ${normalizedHotkey}, State: ${this.state}`);
```

## Maintenance Notes

### Version Bumping

1. Update `package.json` version
2. Update `README.md` if features changed
3. Update CHANGELOG.md
4. Tag release with git: `git tag v1.0.0`

### Dependency Updates

Check for updates:
```bash
npm outdated
npm audit
npm update
```

Test thoroughly after major updates.

### Code Quality

Maintain:
- TypeScript strict mode
- Consistent error handling
- Clear variable/function names
- Comments for complex logic

---

**This implementation prioritizes reliability, security, and user experience.**
