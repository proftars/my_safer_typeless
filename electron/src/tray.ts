import { Menu, Tray, nativeImage, app, Notification, BrowserWindow } from 'electron';
import { AppState, hotkeyManager } from './hotkey';
import { settingsManager } from './settings';

export enum TrayIconState {
  IDLE = 'idle',
  RECORDING = 'recording',
  PROCESSING = 'processing',
  ERROR = 'error',
}

export interface TrayManagerEvents {
  onSettings?: () => void;
  onQuit?: () => void;
}

/**
 * Create a 32x32 colored circle icon as a NativeImage.
 * macOS tray icons are typically 22x22 points (44x44 pixels @2x).
 * We use 32x32 for simplicity which displays well.
 */
function createCircleIcon(r: number, g: number, b: number): Electron.NativeImage {
  const size = 32;
  const radius = 10;
  const cx = size / 2;
  const cy = size / 2;

  // Create raw RGBA pixel buffer
  const buffer = Buffer.alloc(size * size * 4, 0);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const offset = (y * size + x) * 4;

      if (dist <= radius) {
        // Anti-alias the edge
        const alpha = dist > radius - 1 ? Math.max(0, Math.min(255, Math.round((radius - dist) * 255))) : 255;
        buffer[offset] = r;
        buffer[offset + 1] = g;
        buffer[offset + 2] = b;
        buffer[offset + 3] = alpha;
      }
    }
  }

  return nativeImage.createFromBuffer(buffer, {
    width: size,
    height: size,
  });
}

const ICONS: Record<TrayIconState, { r: number; g: number; b: number }> = {
  [TrayIconState.IDLE]: { r: 140, g: 140, b: 140 },
  [TrayIconState.RECORDING]: { r: 220, g: 50, b: 50 },
  [TrayIconState.PROCESSING]: { r: 220, g: 180, b: 50 },
  [TrayIconState.ERROR]: { r: 220, g: 130, b: 50 },
};

export class TrayManager {
  private tray: Tray | null = null;
  private iconState: TrayIconState = TrayIconState.IDLE;
  private events: TrayManagerEvents = {};
  private iconCache: Map<TrayIconState, Electron.NativeImage> = new Map();
  private mainWindow: BrowserWindow | null = null;

  constructor(events: TrayManagerEvents = {}) {
    this.events = events;
  }

  private getIcon(state: TrayIconState): Electron.NativeImage {
    if (!this.iconCache.has(state)) {
      const color = ICONS[state];
      this.iconCache.set(state, createCircleIcon(color.r, color.g, color.b));
    }
    return this.iconCache.get(state)!;
  }

  initialize(): void {
    this.tray = new Tray(this.getIcon(TrayIconState.IDLE));
    this.tray.setToolTip('My Safer Typeless');
    this.updateMenu();

    this.tray.on('click', () => {
      if (hotkeyManager.getState() === AppState.IDLE) {
        hotkeyManager['handleHotkeyPress']?.();
      }
    });

    this.tray.on('right-click', () => {
      this.updateMenu();
    });

    console.log('Tray initialized');
  }

  private updateMenu(): void {
    if (!this.tray) return;

    const state = hotkeyManager.getState();
    const serverUrl = settingsManager.getServerUrl();
    const isAuthenticated = !!settingsManager.getAuthToken();

    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: `Status: ${this.getStatusLabel()}`,
        enabled: false,
      },
      {
        label: `Server: ${serverUrl}`,
        enabled: false,
      },
      {
        label: isAuthenticated ? '✓ Authenticated' : '⚠ Not Authenticated',
        enabled: false,
      },
      { type: 'separator' },
      {
        label: 'Settings...',
        click: () => {
          this.events.onSettings?.();
        },
      },
      {
        label: `Toggle Recording (${hotkeyManager.getCurrentHotkey()})`,
        enabled: state === AppState.IDLE || state === AppState.RECORDING,
        click: () => {
          // Handled by hotkey manager
        },
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          this.events.onQuit?.();
        },
      },
    ];

    const contextMenu = Menu.buildFromTemplate(template);
    this.tray?.setContextMenu(contextMenu);
  }

  private getStatusLabel(): string {
    switch (hotkeyManager.getState()) {
      case AppState.IDLE:
        return '待命中';
      case AppState.RECORDING:
        return '錄音中...';
      case AppState.PROCESSING:
        return '處理中...';
      default:
        return '未知';
    }
  }

  updateState(newState: AppState): void {
    switch (newState) {
      case AppState.RECORDING:
        this.setIconState(TrayIconState.RECORDING);
        break;
      case AppState.PROCESSING:
        this.setIconState(TrayIconState.PROCESSING);
        break;
      case AppState.IDLE:
        this.setIconState(TrayIconState.IDLE);
        break;
    }
    this.updateMenu();
  }

  private setIconState(state: TrayIconState): void {
    if (this.iconState === state) return;
    this.iconState = state;

    if (this.tray) {
      this.tray.setImage(this.getIcon(state));
    }
  }

  setError(): void {
    this.setIconState(TrayIconState.ERROR);
    this.updateMenu();
  }

  setMainWindow(window: BrowserWindow | null): void {
    this.mainWindow = window;
  }

  showNotification(title: string, message: string): void {
    new Notification({ title, body: message }).show();
  }

  showNotificationSuccess(message: string): void {
    this.showNotification('My Safer Typeless', message);
  }

  showNotificationError(message: string): void {
    this.setError();
    this.showNotification('Error', message);
  }

  destroy(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }
}

export const trayManager = new TrayManager();
