import { contextBridge, ipcRenderer } from 'electron';

// Expose IPC and safe APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  recordingStarted: () => {
    ipcRenderer.send('recorder:recording-started');
  },
  recordingStopped: (audioPath: string) => {
    ipcRenderer.send('recorder:recording-stopped', audioPath);
  },
  recordingError: (error: string) => {
    ipcRenderer.send('recorder:error', error);
  },
  recordingCancelled: () => {
    ipcRenderer.send('recorder:cancelled');
  },
  onStateChanged: (callback: (state: any) => void) => {
    ipcRenderer.on('state-changed', (event, state) => {
      callback(state);
    });
  },
  onSettingsChanged: (callback: (settings: any) => void) => {
    ipcRenderer.on('settings-changed', (event, settings) => {
      callback(settings);
    });
  },
  onError: (callback: (error: string) => void) => {
    ipcRenderer.on('app-error', (event, error) => {
      callback(error);
    });
  },
  openSettings: () => {
    ipcRenderer.send('open-settings');
  },
  saveSettings: (settings: any) => {
    ipcRenderer.send('save-settings', settings);
  },
  getSettings: () => {
    return ipcRenderer.invoke('get-settings');
  },
  testConnection: (serverUrl: string, password: string) => {
    return ipcRenderer.invoke('test-connection', { serverUrl, password });
  },
});

// Extend window interface for TypeScript
declare global {
  interface Window {
    electronAPI: {
      recordingStarted: () => void;
      recordingStopped: (audioPath: string) => void;
      recordingError: (error: string) => void;
      recordingCancelled: () => void;
      onStateChanged: (callback: (state: any) => void) => void;
      onSettingsChanged: (callback: (settings: any) => void) => void;
      onError: (callback: (error: string) => void) => void;
      openSettings: () => void;
      saveSettings: (settings: any) => void;
      getSettings: () => Promise<any>;
      testConnection: (serverUrl: string, password: string) => Promise<any>;
    };
  }
}
