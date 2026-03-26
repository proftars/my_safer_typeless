import axios, { AxiosInstance } from 'axios';
import { settingsManager } from './settings';
import * as fs from 'fs';
import * as path from 'path';

export interface TranscriptionResponse {
  rawText: string;
  refinedText: string;
  duration: number;
}

export interface AuthResponse {
  token: string;
}

export class ApiClient {
  private client: AxiosInstance;
  private serverUrl: string;

  constructor() {
    this.serverUrl = settingsManager.getServerUrl();
    this.client = axios.create({
      baseURL: this.serverUrl,
      timeout: 30000,
    });
  }

  updateServerUrl(url: string): void {
    this.serverUrl = url;
    this.client = axios.create({
      baseURL: this.serverUrl,
      timeout: 30000,
    });
  }

  getServerUrl(): string {
    return this.serverUrl;
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/health');
      return true;
    } catch (error) {
      return false;
    }
  }

  async authenticate(password: string): Promise<string> {
    try {
      const response = await this.client.post<AuthResponse>(
        '/api/auth/verify',
        { password }
      );
      const token = response.data.token;
      settingsManager.setAuthToken(token);
      settingsManager.setLastPassword(password);
      return token;
    } catch (error) {
      throw new Error(`Authentication failed: ${this.extractErrorMessage(error)}`);
    }
  }

  async transcribe(audioFilePath: string): Promise<TranscriptionResponse> {
    const token = settingsManager.getAuthToken();
    if (!token) {
      throw new Error('No authentication token. Please authenticate first.');
    }

    try {
      // Check if file exists and is readable
      if (!fs.existsSync(audioFilePath)) {
        throw new Error(`Audio file not found: ${audioFilePath}`);
      }

      const fileStats = fs.statSync(audioFilePath);
      if (fileStats.size === 0) {
        throw new Error('Audio file is empty');
      }

      // Create form data with the audio file
      const formData = new FormData();
      const fileBuffer = fs.readFileSync(audioFilePath);
      const blob = new Blob([fileBuffer], { type: 'audio/wav' });
      formData.append('audio', blob, path.basename(audioFilePath));

      const response = await this.client.post<TranscriptionResponse>(
        '/api/transcribe',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      return response.data;
    } catch (error) {
      throw new Error(`Transcription failed: ${this.extractErrorMessage(error)}`);
    }
  }

  private extractErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
      if (error.response?.data?.message) {
        return error.response.data.message;
      }
      if (error.response?.status === 401) {
        return 'Authentication failed - invalid token';
      }
      if (error.response?.status === 500) {
        return 'Server error - please try again later';
      }
      return error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Unknown error occurred';
  }
}

export const apiClient = new ApiClient();
