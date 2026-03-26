# Quick Start Guide

Get up and running with the My Safer Typeless Electron client in 5 minutes.

## 1. Install Dependencies

```bash
cd electron
npm install
```

This installs Electron, TypeScript, and other dependencies (~200MB).

## 2. Start Development Mode

Make sure your server is running on `http://localhost:3100`, then:

```bash
npm run dev
```

The app will launch with the TypeScript compiler in watch mode.

## 3. Configure the App

1. Click the menu bar icon (top-right corner)
2. Select "Settings..."
3. Enter:
   - **Server URL**: `http://localhost:3100`
   - **Password**: Your server password
4. Click "Test Connection" (should say "Authentication successful!")
5. Click "Save Settings"

## 4. Record Your First Audio

1. Press **Ctrl+`** (control + backtick)
   - Tray icon turns red (recording)
2. Speak clearly
3. Press **Ctrl+`** again to stop
   - Tray icon turns yellow (processing)
   - After a few seconds, transcribed text is pasted

## Available Commands

```bash
npm run dev        # Start development mode (TypeScript watch + Electron)
npm run build      # Compile TypeScript only
npm run start      # Launch compiled app without watch mode
npm run package    # Create distribution package (all platforms)
npm run package:mac # Create .dmg for macOS distribution
npm run dist       # Build + package (full release process)
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+` | Start/Stop recording |
| ESC | Cancel recording |
| Cmd+V | Auto-paste (happens automatically) |

## Settings

Click the menu bar icon → "Settings..." to:
- Change server URL
- Update password
- Customize hotkey (e.g., Cmd+Shift+R)
- Toggle auto-refine
- Toggle auto-paste

## Troubleshooting

### App won't start
```bash
# Rebuild and try again
npm run build
npm start
```

### Microphone not working
1. System Preferences → Security & Privacy → Microphone
2. Grant permission to "Electron"
3. Restart the app

### Hotkey not working
1. Try a different hotkey in Settings (some are reserved by system)
2. Check if another app is using the same hotkey
3. Restart the app

### Connection failed
1. Verify server URL (include http:// or https://)
2. Check server is running: `curl http://localhost:3100/health`
3. Verify password is correct
4. Check internet connection

## Next Steps

- Read [README.md](./README.md) for detailed features
- Read [DEVELOPMENT.md](./DEVELOPMENT.md) for development guide
- Check TypeScript files in `src/` for implementation details

## Project Structure

```
electron/
├── src/           # TypeScript source code
├── dist/          # Compiled JavaScript (created after npm run build)
├── assets/        # Icons and resources
├── package.json   # Dependencies and build config
├── tsconfig.json  # TypeScript settings
└── README.md      # Full documentation
```

## Example Settings

For local development:
- **Server URL**: `http://localhost:3100`
- **Password**: `your-server-password` (from .env or setup)
- **Hotkey**: `Control+\`` (default)
- **Auto-refine**: On (for better transcriptions)
- **Auto-paste**: On (automatic pasting)

For production with Tailscale:
- **Server URL**: `http://[your-tailscale-ip]:3100`
- **Password**: Your server password
- (Other settings same as above)

## Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| TypeScript errors | Run `npm run build` to see full errors |
| Module not found | Run `npm install` to reinstall dependencies |
| Settings won't save | Check file permissions in `~/Library/Application Support/` |
| Paste not working | Grant Accessibility permissions (System Preferences → Security) |
| Server connection fails | Verify server is running: `curl http://localhost:3100/health` |

## Performance Tips

- Keep audio clips under 60 seconds for faster processing
- Use "auto-refine" for cleaner transcriptions
- Check server logs if transcription is slow
- Close other applications using the microphone

## Getting Help

1. Check the error message in the notification
2. Look at console logs (Dev Tools)
3. Review [DEVELOPMENT.md](./DEVELOPMENT.md) troubleshooting section
4. Check server logs for API errors

## What's Next?

Once you have the basics working:
1. Try different hotkey combinations
2. Test auto-paste in different applications
3. Experiment with longer audio clips
4. Read full documentation for advanced usage

---

**Happy transcribing!** 🎙️
