import { clipboard } from 'electron';
import { execSync } from 'child_process';
import * as os from 'os';

export class ClipboardManager {
  static copyText(text: string): void {
    clipboard.writeText(text);
  }

  static getText(): string {
    return clipboard.readText();
  }

  static async pasteText(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Copy text to clipboard
        this.copyText(text);

        // Use AppleScript to send Cmd+V to the active application
        const platform = os.platform();
        if (platform === 'darwin') {
          // macOS
          const script = 'tell application "System Events" to keystroke "v" using command down';
          execSync(`osascript -e '${script}'`);
          resolve();
        } else {
          // For non-macOS (fallback - this app is primarily for macOS)
          reject(new Error('Paste functionality only supported on macOS'));
        }
      } catch (error) {
        reject(new Error(`Failed to paste text: ${error}`));
      }
    });
  }

  static async pasteTextWithDelay(text: string, delayMs: number = 100): Promise<void> {
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          await this.pasteText(text);
          resolve();
        } catch (error) {
          reject(error);
        }
      }, delayMs);
    });
  }
}
