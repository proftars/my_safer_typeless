import Store from 'electron-store';
import { app } from 'electron';
import * as path from 'path';

export interface AppSettings {
  serverUrl: string;
  authToken: string | null;
  hotkeyKey: string;
  autoRefine: boolean;
  autoPaste: boolean;
  lastPassword?: string;
}

const defaultSettings: AppSettings = {
  serverUrl: 'http://localhost:3100',
  authToken: null,
  hotkeyKey: 'Control+`',
  autoRefine: true,
  autoPaste: true,
};

export class SettingsManager {
  private store: Store<AppSettings>;

  constructor() {
    this.store = new Store<AppSettings>({
      defaults: defaultSettings,
      cwd: path.join(app.getPath('userData'), 'config'),
      name: 'settings',
    });
  }

  getServerUrl(): string {
    return this.store.get('serverUrl', defaultSettings.serverUrl);
  }

  setServerUrl(url: string): void {
    this.store.set('serverUrl', url);
  }

  getAuthToken(): string | null {
    return this.store.get('authToken', null);
  }

  setAuthToken(token: string | null): void {
    this.store.set('authToken', token);
  }

  getHotkeyKey(): string {
    return this.store.get('hotkeyKey', defaultSettings.hotkeyKey);
  }

  setHotkeyKey(key: string): void {
    this.store.set('hotkeyKey', key);
  }

  getAutoRefine(): boolean {
    return this.store.get('autoRefine', defaultSettings.autoRefine);
  }

  setAutoRefine(value: boolean): void {
    this.store.set('autoRefine', value);
  }

  getAutoPaste(): boolean {
    return this.store.get('autoPaste', defaultSettings.autoPaste);
  }

  setAutoPaste(value: boolean): void {
    this.store.set('autoPaste', value);
  }

  getLastPassword(): string | undefined {
    return this.store.get('lastPassword');
  }

  setLastPassword(password: string): void {
    this.store.set('lastPassword', password);
  }

  getAllSettings(): AppSettings {
    return {
      serverUrl: this.getServerUrl(),
      authToken: this.getAuthToken(),
      hotkeyKey: this.getHotkeyKey(),
      autoRefine: this.getAutoRefine(),
      autoPaste: this.getAutoPaste(),
    };
  }

  reset(): void {
    this.store.clear();
  }
}

export const settingsManager = new SettingsManager();
