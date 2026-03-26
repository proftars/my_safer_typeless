import { BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

export enum RecorderState {
  IDLE = 'idle',
  RECORDING = 'recording',
  STOPPED = 'stopped',
}

export interface RecorderEvents {
  onStart?: () => void;
  onStop?: (filePath: string) => void;
  onError?: (error: string) => void;
  onStateChange?: (state: RecorderState) => void;
}

export class AudioRecorder {
  private recorderWindow: BrowserWindow | null = null;
  private state: RecorderState = RecorderState.IDLE;
  private currentAudioPath: string | null = null;
  private events: RecorderEvents = {};

  constructor(events: RecorderEvents = {}) {
    this.events = events;
    this.setupIPC();
  }

  private setupIPC(): void {
    ipcMain.on('recorder:recording-started', () => {
      this.setState(RecorderState.RECORDING);
      this.events.onStart?.();
    });

    ipcMain.on('recorder:recording-stopped', (event, audioPath: string) => {
      this.currentAudioPath = audioPath;
      this.setState(RecorderState.STOPPED);
      this.events.onStop?.(audioPath);
    });

    ipcMain.on('recorder:error', (event, error: string) => {
      this.setState(RecorderState.IDLE);
      this.events.onError?.(error);
    });
  }

  private setState(newState: RecorderState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.events.onStateChange?.(this.state);
    }
  }

  async initialize(): Promise<void> {
    if (this.recorderWindow) {
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.recorderWindow = new BrowserWindow({
          width: 800,
          height: 600,
          show: false,
          webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            // enableRemoteModule removed in Electron 28+
            sandbox: true,
          },
        });

        const htmlPath = path.join(__dirname, '..', 'recorder-window.html');

        // Create the HTML file if it doesn't exist
        if (!fs.existsSync(htmlPath)) {
          this.createRecorderHTML(htmlPath);
        }

        this.recorderWindow.loadFile(htmlPath);

        this.recorderWindow.on('closed', () => {
          this.recorderWindow = null;
        });

        // Wait for window to be ready
        this.recorderWindow.webContents.on('did-finish-load', () => {
          resolve();
        });

        this.recorderWindow.webContents.on('crashed', () => {
          reject(new Error('Recorder window crashed'));
        });

        // Handle any loading errors
        const timeout = setTimeout(() => {
          reject(new Error('Recorder window initialization timeout'));
        }, 5000);

        this.recorderWindow.webContents.on('did-finish-load', () => {
          clearTimeout(timeout);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  private createRecorderHTML(filePath: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Recorder</title>
    <style>
        body { margin: 0; padding: 20px; background: #f0f0f0; font-family: Arial, sans-serif; }
        #status { padding: 10px; background: white; border-radius: 4px; margin: 10px 0; }
        button { padding: 10px 20px; background: #007AFF; color: white; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #0051D5; }
        button:disabled { background: #ccc; cursor: not-allowed; }
        #recording-indicator { display: none; color: red; font-weight: bold; margin: 10px 0; }
    </style>
</head>
<body>
    <h1>Audio Recorder</h1>
    <div id="status">Status: <span id="status-text">Idle</span></div>
    <div id="recording-indicator">🔴 Recording...</div>
    <button id="start-btn" onclick="startRecording()">Start Recording</button>
    <button id="stop-btn" onclick="stopRecording()" disabled>Stop Recording</button>
    <button id="cancel-btn" onclick="cancelRecording()" disabled>Cancel</button>
    <script>
        let mediaRecorder = null;
        let audioChunks = [];
        let stream = null;
        let recordingStartTime = null;

        const maxRecordingDuration = 60000; // 60 seconds
        let recordingTimeout = null;

        async function startRecording() {
            try {
                if (stream) return;

                // Request microphone access
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                        sampleRate: 16000,
                    }
                });

                audioChunks = [];
                mediaRecorder = new MediaRecorder(stream, {
                    mimeType: 'audio/wav',
                    audioBitsPerSecond: 128000,
                });

                mediaRecorder.ondataavailable = (event) => {
                    audioChunks.push(event.data);
                };

                mediaRecorder.start();
                recordingStartTime = Date.now();

                // Set a timeout to auto-stop recording after max duration
                recordingTimeout = setTimeout(() => {
                    console.log('Max recording duration reached, stopping...');
                    stopRecording();
                }, maxRecordingDuration);

                updateUI(true);
                window.electronAPI.recordingStarted();
            } catch (error) {
                console.error('Recording error:', error);
                window.electronAPI.recordingError('Microphone access denied or unavailable');
                updateUI(false);
            }
        }

        async function stopRecording() {
            if (!mediaRecorder || mediaRecorder.state === 'inactive') return;

            clearTimeout(recordingTimeout);

            return new Promise((resolve) => {
                mediaRecorder.onstop = async () => {
                    try {
                        // Create WAV blob
                        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });

                        // Save to temp directory
                        const tempDir = require('os').tmpdir();
                        const timestamp = Date.now();
                        const audioPath = require('path').join(tempDir, \`recording-\${timestamp}.wav\`);

                        // Convert blob to buffer and save
                        const buffer = await audioBlob.arrayBuffer();
                        const fs = require('fs');
                        fs.writeFileSync(audioPath, Buffer.from(buffer));

                        // Stop all audio tracks
                        if (stream) {
                            stream.getTracks().forEach(track => track.stop());
                            stream = null;
                        }

                        mediaRecorder = null;
                        audioChunks = [];

                        updateUI(false);
                        window.electronAPI.recordingStopped(audioPath);
                        resolve();
                    } catch (error) {
                        console.error('Stop recording error:', error);
                        window.electronAPI.recordingError('Failed to save recording');
                        updateUI(false);
                    }
                };

                mediaRecorder.stop();
            });
        }

        async function cancelRecording() {
            if (!mediaRecorder || mediaRecorder.state === 'inactive') return;

            clearTimeout(recordingTimeout);

            mediaRecorder.onstop = () => {
                // Stop all audio tracks without saving
                if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                    stream = null;
                }

                mediaRecorder = null;
                audioChunks = [];

                updateUI(false);
                window.electronAPI.recordingCancelled();
            };

            mediaRecorder.stop();
        }

        function updateUI(isRecording) {
            const startBtn = document.getElementById('start-btn');
            const stopBtn = document.getElementById('stop-btn');
            const cancelBtn = document.getElementById('cancel-btn');
            const indicator = document.getElementById('recording-indicator');
            const statusText = document.getElementById('status-text');

            startBtn.disabled = isRecording;
            stopBtn.disabled = !isRecording;
            cancelBtn.disabled = !isRecording;

            if (isRecording) {
                indicator.style.display = 'block';
                statusText.textContent = 'Recording...';
            } else {
                indicator.style.display = 'none';
                statusText.textContent = 'Idle';
            }
        }

        // Expose functions to window for button clicks
        window.startRecording = startRecording;
        window.stopRecording = stopRecording;
        window.cancelRecording = cancelRecording;
    </script>
</body>
</html>`;

    fs.writeFileSync(filePath, html);
  }

  async start(): Promise<void> {
    if (!this.recorderWindow) {
      await this.initialize();
    }

    if (this.state !== RecorderState.IDLE) {
      throw new Error('Recorder is already in use');
    }

    this.recorderWindow?.webContents.send('recorder:start');
  }

  async stop(): Promise<string> {
    if (this.state !== RecorderState.RECORDING) {
      throw new Error('Recorder is not recording');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Stop recording timeout'));
      }, 5000);

      const originalOnStop = this.events.onStop;
      this.events.onStop = (filePath: string) => {
        clearTimeout(timeout);
        originalOnStop?.(filePath);
        resolve(filePath);
      };

      this.recorderWindow?.webContents.send('recorder:stop');
    });
  }

  async cancel(): Promise<void> {
    if (this.state === RecorderState.RECORDING) {
      this.setState(RecorderState.IDLE);
      this.recorderWindow?.webContents.send('recorder:cancel');

      // Clean up any temp file
      if (this.currentAudioPath && fs.existsSync(this.currentAudioPath)) {
        try {
          fs.unlinkSync(this.currentAudioPath);
        } catch (error) {
          console.error('Failed to delete temp audio file:', error);
        }
      }
    }
  }

  getState(): RecorderState {
    return this.state;
  }

  async cleanup(): Promise<void> {
    if (this.recorderWindow) {
      this.recorderWindow.close();
      this.recorderWindow = null;
    }
  }
}
