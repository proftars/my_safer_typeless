# Development Guide

This guide covers setting up the development environment and working with the My Safer Typeless Electron client.

## Prerequisites

- macOS 10.13 or later (optimized for macOS)
- Node.js 16+ (download from https://nodejs.org)
- npm 8+ (comes with Node.js)
- A running instance of the My Safer Typeless server

## Initial Setup

### 1. Install Dependencies

```bash
cd electron
npm install
```

This will install:
- Electron (latest stable)
- TypeScript compiler
- electron-builder for packaging
- Other required dependencies

### 2. Configure Server Connection

Create a `.env` file in the electron directory (optional, for defaults):

```bash
cp .env.example .env
# Edit .env if needed for development defaults
```

### 3. Start Development Server

Make sure your My Safer Typeless server is running:

```bash
# In a separate terminal, from the server directory
npm start  # Runs on http://localhost:3100
```

## Running in Development Mode

### Start the Electron App

```bash
npm run dev
```

This command:
1. Watches TypeScript files for changes and recompiles
2. Launches the Electron application
3. Enables dev tools in windows when `isDev` is true

The app will automatically reload when you save TypeScript changes.

### First Run Checklist

1. App launches with menu bar icon in top-right
2. Click the icon to see the context menu
3. First time setup:
   - Click "Settings..."
   - Enter server URL: `http://localhost:3100`
   - Enter your server password
   - Click "Test Connection" to verify
   - Click "Save Settings"

## Building

### Compile TypeScript Only

```bash
npm run build
```

Output goes to `dist/` directory.

### Create Distribution Package

```bash
npm run package:mac
```

Creates a `.dmg` file in the `dist/` directory ready for distribution.

## Project Structure

```
src/
├── main.ts              # Main Electron process entry point
├── recorder.ts          # Audio recording logic
├── api.ts               # Server API client
├── hotkey.ts            # Global hotkey management
├── tray.ts              # Menu bar icon and context menu
├── clipboard.ts         # Clipboard and paste operations
├── settings.ts          # Settings persistence
└── preload.ts           # IPC bridge for renderer processes

dist/                    # Compiled JavaScript (created by npm run build)

assets/                  # Icons and resources
  ├── tray-idle.png      # Idle state icon
  ├── tray-recording.png # Recording state icon
  ├── tray-processing.png # Processing state icon
  └── tray-error.png     # Error state icon
```

## Code Organization

### Main Process (main.ts)

Handles:
- Application lifecycle (launch, quit, etc.)
- Tray icon initialization and management
- Global hotkey registration
- IPC message handling
- Settings window creation
- Recorder initialization

### Recorder (recorder.ts)

Handles:
- Audio capture using Web Audio API
- Recording start/stop/cancel
- Temporary file management
- State tracking
- Error handling

### API Client (api.ts)

Handles:
- Server communication via axios
- Authentication (password → token)
- Audio transcription requests
- Error handling and retry logic

### Hotkey Manager (hotkey.ts)

Handles:
- Global hotkey registration with electron.globalShortcut
- State machine (IDLE → RECORDING → PROCESSING → IDLE)
- Escape key handling for cancellation

### Tray Manager (tray.ts)

Handles:
- Tray icon creation and updates
- Context menu rendering
- Icon state changes (idle, recording, processing, error)
- User notifications

### Settings (settings.ts)

Handles:
- Persistent storage using electron-store
- Server URL, auth token, hotkey, preferences
- Type-safe settings access

## Development Workflow

### 1. Making Changes

Edit TypeScript files in `src/`. The `npm run dev` watcher will:
- Compile your changes
- Display compilation errors
- Allow you to fix and see changes quickly

### 2. Testing Changes

- Click the menu bar icon to see immediate updates
- Use the Settings window to configure and test
- Check the browser console in Dev Tools for logs

### 3. Debugging

#### View Console Logs

1. Right-click settings window → "Inspect Element"
2. Or enable in `main.ts` by setting `isDev = true`

#### Debug Hotkeys

Add console logs in `hotkey.ts`:
```typescript
console.log(`Hotkey pressed, current state: ${this.state}`);
```

#### Debug API Calls

Check network requests in Dev Tools → Network tab.

#### Debug Recorder Issues

The recorder window shows:
- Status of recording
- Start/Stop/Cancel buttons
- Detailed error messages

## Common Development Tasks

### Changing the Default Hotkey

Edit `src/settings.ts`, change the `defaultSettings`:
```typescript
const defaultSettings: AppSettings = {
  hotkeyKey: 'Ctrl+Shift+R',  // Change this
  // ... other settings
};
```

### Adding a New Setting

1. Add property to `AppSettings` interface in `settings.ts`
2. Add getter/setter methods in `SettingsManager` class
3. Update settings HTML form in `main.ts` (createSettingsHTML function)
4. Update IPC handler in `main.ts` (ipcMain.on('save-settings'))

### Testing Error Scenarios

In the settings window's test connection:
- Try invalid server URL to test network errors
- Try wrong password to test auth errors
- This helps verify error handling works

### Performance Testing

Check application memory and CPU:
1. Launch the app with Dev Tools open
2. Go to Dev Tools → Performance tab
3. Record a session while recording audio
4. Analyze the timeline for bottlenecks

## Troubleshooting Development Issues

### "Hotkey already registered" Error

This means the hotkey is in use by another app. Try a different combination or restart the system.

### Microphone Permission Error

Grant microphone access to Electron:
1. System Preferences → Security & Privacy → Microphone
2. Add "Electron" to the list
3. Restart the app

### Settings Window Won't Open

Check the console for errors. Common issues:
- `settingsWindow = null` not being set on close
- Invalid HTML file path
- Missing preload script

### App Crashes on Startup

1. Check `npm run build` completes without errors
2. Verify all dependencies are installed (`npm install`)
3. Check console for uncaught exception messages
4. Delete and reinstall node_modules if needed

### Recording Not Working

1. Verify microphone permissions (see above)
2. Test microphone in system settings
3. Check console for recorder errors
4. Try different microphone if available

## Testing Checklist

Before submitting changes, verify:

- [ ] Code compiles without TypeScript errors
- [ ] App starts without crashes
- [ ] Menu bar icon appears and updates state correctly
- [ ] Hotkey registers and functions work
- [ ] Recording starts and stops properly
- [ ] Audio is sent to server successfully
- [ ] Transcribed text is pasted correctly
- [ ] Settings can be saved and persisted
- [ ] All error scenarios show user notifications
- [ ] No console errors or warnings (except expected ones)

## Performance Guidelines

### Memory Usage

- Target: < 100 MB baseline, < 150 MB while recording
- Check Activity Monitor while recording

### CPU Usage

- Target: < 5% idle, < 20% while recording
- Profile with Dev Tools Performance tab if needed

### Network

- Target: < 5 seconds for transcription request
- Verify timeout handling works (30 second timeout)

## Building for Distribution

```bash
# Build and package for macOS
npm run dist

# Result: /dist/My Safer Typeless-1.0.0.dmg
```

## Release Checklist

Before creating a release version:

- [ ] Bump version in `package.json`
- [ ] Update CHANGELOG.md
- [ ] Test all features thoroughly
- [ ] Run full build without errors
- [ ] Test the `.dmg` file in a clean environment
- [ ] Create release notes
- [ ] Tag the git commit with version

## Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [electron-builder Documentation](https://www.electron.build/)
- [Electron Security](https://www.electronjs.org/docs/tutorial/security)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## Getting Help

1. Check console logs in Dev Tools
2. Review error messages in tray notifications
3. Test each component independently
4. Check server logs to verify requests are reaching the server
5. Review GitHub issues for similar problems
