import { globalShortcut, BrowserWindow } from 'electron';
import { settingsManager } from './settings';

export enum AppState {
  IDLE = 'idle',
  RECORDING = 'recording',
  PROCESSING = 'processing',
}

export interface HotkeyManagerEvents {
  onStartRecording?: () => void;
  onStopRecording?: () => void;
  onCancel?: () => void;
  onStateChange?: (state: AppState) => void;
}

export class HotkeyManager {
  private state: AppState = AppState.IDLE;
  private currentHotkey: string = '';
  private events: HotkeyManagerEvents = {};
  private mainWindow: BrowserWindow | null = null;

  constructor(events: HotkeyManagerEvents = {}) {
    this.events = events;
  }

  setMainWindow(window: BrowserWindow | null): void {
    this.mainWindow = window;
  }

  register(hotkey: string): boolean {
    try {
      // Unregister previous hotkey if exists
      if (this.currentHotkey) {
        globalShortcut.unregister(this.currentHotkey);
      }

      // Normalize hotkey format
      const normalizedHotkey = this.normalizeHotkey(hotkey);

      // Register the global hotkey
      const registered = globalShortcut.register(normalizedHotkey, () => {
        this.handleHotkeyPress();
      });

      if (registered) {
        this.currentHotkey = normalizedHotkey;
        settingsManager.setHotkeyKey(normalizedHotkey);
        console.log(`Hotkey registered: ${normalizedHotkey}`);
        return true;
      } else {
        console.error(`Failed to register hotkey: ${normalizedHotkey}`);
        return false;
      }
    } catch (error) {
      console.error('Error registering hotkey:', error);
      return false;
    }
  }

  registerEscapeKey(): boolean {
    try {
      const registered = globalShortcut.register('Escape', () => {
        if (this.state === AppState.RECORDING) {
          this.handleCancel();
        }
      });

      if (registered) {
        console.log('Escape key registered for cancellation');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error registering Escape key:', error);
      return false;
    }
  }

  private handleHotkeyPress(): void {
    switch (this.state) {
      case AppState.IDLE:
        this.setState(AppState.RECORDING);
        this.events.onStartRecording?.();
        break;

      case AppState.RECORDING:
        this.setState(AppState.PROCESSING);
        this.events.onStopRecording?.();
        break;

      case AppState.PROCESSING:
        // Ignore hotkey presses while processing
        break;
    }
  }

  private handleCancel(): void {
    if (this.state === AppState.RECORDING) {
      this.setState(AppState.IDLE);
      this.events.onCancel?.();
    }
  }

  private setState(newState: AppState): void {
    if (this.state !== newState) {
      const previousState = this.state;
      this.state = newState;

      // Notify UI via IPC if window is available
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('state-changed', {
          previousState,
          newState,
        });
      }

      this.events.onStateChange?.(this.state);

      console.log(`State changed: ${previousState} -> ${newState}`);
    }
  }

  getState(): AppState {
    return this.state;
  }

  setProcessing(): void {
    this.setState(AppState.PROCESSING);
  }

  setIdle(): void {
    this.setState(AppState.IDLE);
  }

  isRecording(): boolean {
    return this.state === AppState.RECORDING;
  }

  isProcessing(): boolean {
    return this.state === AppState.PROCESSING;
  }

  getCurrentHotkey(): string {
    return this.currentHotkey || settingsManager.getHotkeyKey();
  }

  unregisterAll(): void {
    try {
      globalShortcut.unregisterAll();
      console.log('All hotkeys unregistered');
    } catch (error) {
      console.error('Error unregistering hotkeys:', error);
    }
  }

  private normalizeHotkey(hotkey: string): string {
    // Handle common variations
    let normalized = hotkey
      .replace(/cmd/gi, 'Command')
      .replace(/ctrl/gi, 'Control')
      .replace(/alt/gi, 'Alt')
      .replace(/shift/gi, 'Shift')
      .replace(/opt/gi, 'Alt')
      .replace(/super/gi, 'Super')
      .replace(/win/gi, 'Super')
      .replace(/backtick/gi, '`')
      .replace(/grave/gi, '`')
      .trim();

    // Ensure proper spacing around +
    normalized = normalized
      .split('+')
      .map((part) => part.trim())
      .filter((part) => part)
      .join('+');

    return normalized;
  }
}

export const hotkeyManager = new HotkeyManager();
