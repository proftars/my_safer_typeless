import { Menu, Tray, app, BrowserWindow, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
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

export class TrayManager {
  private tray: Tray | null = null;
  private iconState: TrayIconState = TrayIconState.IDLE;
  private events: TrayManagerEvents = {};
  private mainWindow: BrowserWindow | null = null;

  constructor(events: TrayManagerEvents = {}) {
    this.events = events;
  }

  setMainWindow(window: BrowserWindow | null): void {
    this.mainWindow = window;
  }

  initialize(): void {
    // Create a simple placeholder icon if assets don't exist
    const iconPath = this.getOrCreateIcon(TrayIconState.IDLE);

    this.tray = new Tray(iconPath);

    this.updateMenu();

    // Click to toggle recording
    this.tray.on('click', () => {
      if (hotkeyManager.getState() === AppState.IDLE) {
        hotkeyManager['handleHotkeyPress']?.();
      }
    });

    // Right-click context menu
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
          if (state === AppState.IDLE) {
            hotkeyManager.setProcessing();
            // This will be handled by the main process
          }
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
        return 'Idle';
      case AppState.RECORDING:
        return 'Recording...';
      case AppState.PROCESSING:
        return 'Processing...';
      default:
        return 'Unknown';
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
    const iconPath = this.getOrCreateIcon(state);

    if (this.tray) {
      this.tray.setImage(iconPath);
    }
  }

  setError(): void {
    this.setIconState(TrayIconState.ERROR);
    this.updateMenu();
  }

  private getOrCreateIcon(state: TrayIconState): string {
    const assetsDir = path.join(app.getAppPath(), 'assets');

    // Ensure assets directory exists
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }

    const iconName = `tray-${state}.png`;
    const iconPath = path.join(assetsDir, iconName);

    // Create icon if it doesn't exist
    if (!fs.existsSync(iconPath)) {
      this.createPlaceholderIcon(iconPath, state);
    }

    return iconPath;
  }

  private createPlaceholderIcon(filePath: string, state: TrayIconState): void {
    // Create a simple PNG using raw bytes for a 16x16 icon
    // This is a minimal valid PNG file with the appropriate color
    const colors: Record<TrayIconState, Buffer> = {
      [TrayIconState.IDLE]: this.createGrayscalePNG(),
      [TrayIconState.RECORDING]: this.createRedPNG(),
      [TrayIconState.PROCESSING]: this.createYellowPNG(),
      [TrayIconState.ERROR]: this.createOrangePNG(),
    };

    const pngBuffer = colors[state] || colors[TrayIconState.IDLE];

    try {
      fs.writeFileSync(filePath, pngBuffer);
    } catch (error) {
      console.error(`Failed to write icon file: ${error}`);
    }
  }

  // Helper methods to generate simple PNG icons
  private createGrayscalePNG(): Buffer {
    // 16x16 grayscale PNG (placeholder)
    return Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x10, 0x08, 0x00, 0x00, 0x00, 0x00, 0x82, 0x10, 0x00,
      0x00, 0x00, 0x00, 0x2c, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x01, 0x21, 0x00, 0xde, 0xff, 0x80,
      0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80,
      0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80,
      0x7f, 0x80, 0xfe, 0x6b, 0x2f, 0x39, 0xee, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
      0x42, 0x60, 0x82,
    ]);
  }

  private createRedPNG(): Buffer {
    // 16x16 red PNG (placeholder)
    return Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x10, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x91, 0x68,
      0x36, 0x00, 0x00, 0x00, 0x1e, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x01, 0x13, 0x00, 0xec, 0xff,
      0xff, 0x00, 0x00, 0xff, 0x00, 0x00, 0xff, 0x00, 0x00, 0xff, 0x00, 0x00, 0xff, 0x00, 0x00, 0xff,
      0x00, 0x00, 0xff, 0x00, 0x00, 0xff, 0x92, 0xf3, 0x24, 0xc9, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
      0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ]);
  }

  private createYellowPNG(): Buffer {
    // 16x16 yellow PNG (placeholder)
    return Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x10, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x91, 0x68,
      0x36, 0x00, 0x00, 0x00, 0x1e, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x01, 0x13, 0x00, 0xec, 0xff,
      0xff, 0xff, 0x00, 0xff, 0xff, 0x00, 0xff, 0xff, 0x00, 0xff, 0xff, 0x00, 0xff, 0xff, 0x00, 0xff,
      0xff, 0x00, 0xff, 0xff, 0x00, 0xff, 0xff, 0xb5, 0x3c, 0x62, 0x32, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ]);
  }

  private createOrangePNG(): Buffer {
    // 16x16 orange PNG (placeholder)
    return Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x10, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x91, 0x68,
      0x36, 0x00, 0x00, 0x00, 0x1e, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x01, 0x13, 0x00, 0xec, 0xff,
      0xff, 0x7f, 0x00, 0xff, 0x7f, 0x00, 0xff, 0x7f, 0x00, 0xff, 0x7f, 0x00, 0xff, 0x7f, 0x00, 0xff,
      0x7f, 0x00, 0xff, 0x7f, 0x00, 0xff, 0x7f, 0x4a, 0x7f, 0xf0, 0x91, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ]);
  }

  showNotification(title: string, message: string): void {
    if (this.tray) {
      this.tray.displayBalloon({
        title,
        content: message,
        icon: this.getOrCreateIcon(TrayIconState.IDLE),
      });
    }
  }

  showNotificationSuccess(message: string): void {
    this.showNotification('Success', message);
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
