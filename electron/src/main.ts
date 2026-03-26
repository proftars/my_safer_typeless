import {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  dialog,
  screen,
} from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { AudioRecorder, RecorderState } from './recorder';
import { hotkeyManager, AppState } from './hotkey';
import { trayManager, TrayIconState } from './tray';
import { apiClient } from './api';
import { settingsManager } from './settings';
import { ClipboardManager } from './clipboard';

let mainWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;
let recorder: AudioRecorder | null = null;

const isDev = process.env.NODE_ENV === 'development';

// Application initialization
async function initializeApp(): Promise<void> {
  try {
    // Initialize recorder
    recorder = new AudioRecorder({
      onStart: () => {
        hotkeyManager.setProcessing();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('recording-started');
        }
        trayManager.updateState(AppState.RECORDING);
      },
      onStop: async (audioPath: string) => {
        await handleRecordingStop(audioPath);
      },
      onError: (error: string) => {
        hotkeyManager.setIdle();
        trayManager.setError();
        trayManager.showNotificationError(`Recording error: ${error}`);
        console.error('Recorder error:', error);
      },
    });

    await recorder.initialize();

    // Initialize hotkey manager
    hotkeyManager.setMainWindow(mainWindow);
    hotkeyManager.register(settingsManager.getHotkeyKey());
    hotkeyManager.registerEscapeKey();

    hotkeyManager.register(settingsManager.getHotkeyKey());

    // Setup hotkey handlers
    setupHotkeyHandlers();

    // Initialize tray
    trayManager.setMainWindow(mainWindow);
    trayManager.initialize();

    trayManager.setMainWindow(mainWindow);
    setupTrayHandlers();

    console.log('Application initialized successfully');
  } catch (error) {
    console.error('Failed to initialize application:', error);
    dialog.showErrorBox(
      'Initialization Error',
      'Failed to initialize the application. Please restart.'
    );
  }
}

function setupHotkeyHandlers(): void {
  hotkeyManager['events'].onStartRecording = async () => {
    console.log('Starting recording...');
    trayManager.updateState(AppState.RECORDING);

    try {
      if (recorder) {
        await recorder.start();
      }
    } catch (error) {
      console.error('Failed to start recording:', error);
      hotkeyManager.setIdle();
      trayManager.setError();
      trayManager.showNotificationError(
        `Failed to start recording: ${error}`
      );
    }
  };

  hotkeyManager['events'].onStopRecording = () => {
    console.log('Stopping recording...');
    hotkeyManager.setProcessing();
    trayManager.updateState(AppState.PROCESSING);

    if (recorder) {
      recorder.stop().catch((error) => {
        console.error('Failed to stop recording:', error);
        hotkeyManager.setIdle();
        trayManager.setError();
        trayManager.showNotificationError(
          `Failed to stop recording: ${error}`
        );
      });
    }
  };

  hotkeyManager['events'].onCancel = async () => {
    console.log('Cancelling recording...');
    if (recorder) {
      await recorder.cancel();
    }
    hotkeyManager.setIdle();
    trayManager.updateState(AppState.IDLE);
    trayManager.showNotification('Cancelled', 'Recording cancelled');
  };
}

function setupTrayHandlers(): void {
  trayManager['events'].onSettings = () => {
    showSettingsWindow();
  };

  trayManager['events'].onQuit = () => {
    app.quit();
  };
}

async function handleRecordingStop(audioPath: string): Promise<void> {
  try {
    console.log(`Recording saved to: ${audioPath}`);

    // Send to server for transcription
    hotkeyManager.setProcessing();
    trayManager.updateState(AppState.PROCESSING);
    trayManager.showNotification('Processing', 'Transcribing audio...');

    const response = await apiClient.transcribe(audioPath);
    console.log('Transcription successful:', response);

    // Choose which text to paste
    const textToPaste = settingsManager.getAutoRefine()
      ? response.refinedText
      : response.rawText;

    // Auto-paste the result
    if (settingsManager.getAutoPaste()) {
      try {
        await ClipboardManager.pasteTextWithDelay(textToPaste, 200);
        trayManager.showNotificationSuccess(
          'Text transcribed and pasted successfully'
        );
      } catch (error) {
        console.error('Failed to paste text:', error);
        // Even if paste fails, copy to clipboard
        ClipboardManager.copyText(textToPaste);
        trayManager.showNotificationSuccess(
          'Text transcribed and copied to clipboard'
        );
      }
    } else {
      // Just copy to clipboard
      ClipboardManager.copyText(textToPaste);
      trayManager.showNotificationSuccess(
        'Text transcribed and copied to clipboard'
      );
    }

    // Clean up temp file
    try {
      if (fs.existsSync(audioPath)) {
        fs.unlinkSync(audioPath);
      }
    } catch (error) {
      console.error('Failed to delete temp file:', error);
    }

    hotkeyManager.setIdle();
    trayManager.updateState(AppState.IDLE);
  } catch (error) {
    console.error('Transcription error:', error);
    hotkeyManager.setIdle();
    trayManager.setError();

    const errorMessage = error instanceof Error ? error.message : String(error);
    trayManager.showNotificationError(`Transcription failed: ${errorMessage}`);

    // Clean up temp file even on error
    try {
      if (fs.existsSync(audioPath)) {
        fs.unlinkSync(audioPath);
      }
    } catch (cleanupError) {
      console.error('Failed to delete temp file:', cleanupError);
    }
  }
}

function createSettingsWindow(): void {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 500,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      sandbox: true,
    },
    show: false,
  });

  const htmlPath = path.join(__dirname, '..', 'settings.html');

  // Create settings HTML if it doesn't exist
  if (!fs.existsSync(htmlPath)) {
    createSettingsHTML(htmlPath);
  }

  settingsWindow.loadFile(htmlPath);

  settingsWindow.once('ready-to-show', () => {
    settingsWindow?.show();
  });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });

  if (isDev) {
    settingsWindow.webContents.openDevTools();
  }
}

function showSettingsWindow(): void {
  createSettingsWindow();
}

function createSettingsHTML(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Settings</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: #f5f5f5;
            padding: 20px;
        }
        .container {
            max-width: 460px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            padding: 24px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            font-size: 24px;
            margin-bottom: 24px;
            color: #333;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: #333;
            font-size: 14px;
        }
        input[type="text"],
        input[type="password"],
        select {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
            font-family: inherit;
        }
        input:focus, select:focus {
            outline: none;
            border-color: #007AFF;
            box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
        }
        .checkbox-group {
            display: flex;
            align-items: center;
            margin-bottom: 16px;
        }
        input[type="checkbox"] {
            width: 18px;
            height: 18px;
            margin-right: 10px;
            cursor: pointer;
        }
        .checkbox-group label {
            margin: 0;
            cursor: pointer;
            font-weight: 400;
        }
        .button-group {
            display: flex;
            gap: 10px;
            margin-top: 24px;
        }
        button {
            flex: 1;
            padding: 10px 16px;
            border: none;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.2s;
        }
        .btn-primary {
            background: #007AFF;
            color: white;
        }
        .btn-primary:hover {
            background: #0051D5;
        }
        .btn-primary:active {
            background: #004399;
        }
        .btn-secondary {
            background: #f0f0f0;
            color: #333;
        }
        .btn-secondary:hover {
            background: #e0e0e0;
        }
        .status {
            padding: 12px;
            border-radius: 4px;
            margin-top: 12px;
            font-size: 13px;
            display: none;
        }
        .status.success {
            background: #e8f5e9;
            color: #2e7d32;
            display: block;
        }
        .status.error {
            background: #ffebee;
            color: #c62828;
            display: block;
        }
        .status.info {
            background: #e3f2fd;
            color: #1565c0;
            display: block;
        }
        .divider {
            height: 1px;
            background: #e0e0e0;
            margin: 24px 0;
        }
        .help-text {
            font-size: 12px;
            color: #666;
            margin-top: 4px;
        }
        .spinner {
            display: inline-block;
            width: 12px;
            height: 12px;
            border: 2px solid #007AFF;
            border-radius: 50%;
            border-top-color: transparent;
            animation: spin 0.6s linear infinite;
            margin-right: 6px;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Settings</h1>

        <div class="form-group">
            <label for="server-url">Server URL</label>
            <input type="text" id="server-url" placeholder="http://localhost:3100">
            <div class="help-text">The URL of your My Safer Typeless server</div>
        </div>

        <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" placeholder="Enter server password">
            <div class="help-text">Used to authenticate with the server</div>
        </div>

        <button class="btn-primary" id="test-connection-btn" onclick="testConnection()" style="width: 100%; margin-bottom: 12px;">
            Test Connection
        </button>

        <div id="connection-status" class="status"></div>

        <div class="divider"></div>

        <div class="form-group">
            <label for="hotkey">Global Hotkey</label>
            <input type="text" id="hotkey" placeholder="Control+\`" value="">
            <div class="help-text">e.g., Control+\`, Cmd+Shift+V, Alt+M</div>
        </div>

        <div class="checkbox-group">
            <input type="checkbox" id="auto-refine" checked>
            <label for="auto-refine">Auto-refine transcriptions</label>
        </div>

        <div class="checkbox-group">
            <input type="checkbox" id="auto-paste" checked>
            <label for="auto-paste">Auto-paste results</label>
        </div>

        <div class="button-group">
            <button class="btn-primary" onclick="saveSettings()">Save Settings</button>
            <button class="btn-secondary" onclick="closeWindow()">Close</button>
        </div>

        <div id="save-status" class="status"></div>
    </div>

    <script>
        let isTestingConnection = false;

        async function loadSettings() {
            try {
                const settings = await window.electronAPI.getSettings();
                document.getElementById('server-url').value = settings.serverUrl || '';
                document.getElementById('hotkey').value = settings.hotkeyKey || '';
                document.getElementById('auto-refine').checked = settings.autoRefine !== false;
                document.getElementById('auto-paste').checked = settings.autoPaste !== false;
            } catch (error) {
                console.error('Failed to load settings:', error);
                showStatus('Failed to load settings', 'error');
            }
        }

        async function testConnection() {
            if (isTestingConnection) return;

            const serverUrl = document.getElementById('server-url').value.trim();
            const password = document.getElementById('password').value.trim();

            if (!serverUrl) {
                showStatus('Please enter server URL', 'error', 'connection-status');
                return;
            }

            if (!password) {
                showStatus('Please enter password', 'error', 'connection-status');
                return;
            }

            isTestingConnection = true;
            const btn = document.getElementById('test-connection-btn');
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner"></span>Testing...';

            try {
                const result = await window.electronAPI.testConnection(serverUrl, password);
                if (result.success) {
                    showStatus(result.message || 'Connection successful!', 'success', 'connection-status');
                } else {
                    showStatus(result.message || 'Connection failed', 'error', 'connection-status');
                }
            } catch (error) {
                showStatus(\`Connection error: \${error}\`, 'error', 'connection-status');
            } finally {
                isTestingConnection = false;
                btn.disabled = false;
                btn.innerHTML = 'Test Connection';
            }
        }

        function saveSettings() {
            const settings = {
                serverUrl: document.getElementById('server-url').value.trim(),
                hotkeyKey: document.getElementById('hotkey').value.trim() || 'Control+\`',
                autoRefine: document.getElementById('auto-refine').checked,
                autoPaste: document.getElementById('auto-paste').checked,
            };

            if (!settings.serverUrl) {
                showStatus('Please enter server URL', 'error', 'save-status');
                return;
            }

            window.electronAPI.saveSettings(settings);
            showStatus('Settings saved successfully!', 'success', 'save-status');

            setTimeout(() => {
                closeWindow();
            }, 1000);
        }

        function closeWindow() {
            window.close();
        }

        function showStatus(message, type, elementId = 'save-status') {
            const element = document.getElementById(elementId);
            element.textContent = message;
            element.className = \`status \${type}\`;
        }

        // Load settings when window opens
        loadSettings();
    </script>
</body>
</html>`;

  fs.writeFileSync(filePath, html);
}

// IPC Handlers
ipcMain.handle('get-settings', () => {
  return settingsManager.getAllSettings();
});

ipcMain.on('save-settings', (event, settings) => {
  try {
    if (settings.serverUrl) {
      settingsManager.setServerUrl(settings.serverUrl);
      apiClient.updateServerUrl(settings.serverUrl);
    }
    if (settings.hotkeyKey) {
      hotkeyManager.register(settings.hotkeyKey);
    }
    if (typeof settings.autoRefine === 'boolean') {
      settingsManager.setAutoRefine(settings.autoRefine);
    }
    if (typeof settings.autoPaste === 'boolean') {
      settingsManager.setAutoPaste(settings.autoPaste);
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('settings-changed', settings);
    }
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
});

ipcMain.handle('test-connection', async (event, { serverUrl, password }) => {
  try {
    apiClient.updateServerUrl(serverUrl);
    const token = await apiClient.authenticate(password);

    if (token) {
      return {
        success: true,
        message: 'Authentication successful!',
        token,
      };
    } else {
      return {
        success: false,
        message: 'Authentication failed',
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Connection failed: ${message}`,
    };
  }
});

ipcMain.on('open-settings', () => {
  showSettingsWindow();
});

// App event handlers
app.on('ready', async () => {
  // Create a minimal hidden window for IPC
  mainWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Load a blank page
  mainWindow.loadDataURL('data:text/html,<html></html>');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  await initializeApp();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    mainWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    mainWindow.loadDataURL('data:text/html,<html></html>');
  }
});

app.on('before-quit', async () => {
  hotkeyManager.unregisterAll();
  trayManager.destroy();

  if (recorder) {
    await recorder.cleanup();
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  hotkeyManager.setIdle();
  trayManager.setError();
  trayManager.showNotificationError('An unexpected error occurred');
});

export {};
