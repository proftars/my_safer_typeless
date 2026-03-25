const API_BASE = '/api'

export interface ApiError {
  message: string
  status: number
}

class ApiClient {
  private token: string | null = null

  setToken(token: string) {
    this.token = token
    localStorage.setItem('auth_token', token)
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('auth_token')
    }
    return this.token
  }

  clearToken() {
    this.token = null
    localStorage.removeItem('auth_token')
  }

  private async request<T>(
    endpoint: string,
    method: string,
    body?: unknown,
    isFormData = false,
  ): Promise<T> {
    const url = `${API_BASE}${endpoint}`
    const headers: Record<string, string> = {}

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    let fetchBody: BodyInit | undefined = undefined
    if (body) {
      if (isFormData) {
        fetchBody = body as FormData
      } else {
        headers['Content-Type'] = 'application/json'
        fetchBody = JSON.stringify(body)
      }
    }

    const response = await fetch(url, {
      method,
      headers,
      body: fetchBody,
    })

    if (!response.ok) {
      const error: ApiError = {
        message: `API Error: ${response.statusText}`,
        status: response.status,
      }
      try {
        const data = await response.json()
        error.message = data.message || data.error || error.message
      } catch {}
      throw error
    }

    return response.json() as Promise<T>
  }

  // Auth endpoints
  async setPassword(password: string, currentPassword?: string) {
    return this.request('/auth/set-password', 'POST', {
      password,
      ...(currentPassword && { currentPassword }),
    })
  }

  async verify(password: string): Promise<{ token: string }> {
    return this.request('/auth/verify', 'POST', { password })
  }

  async getAuthStatus(): Promise<{ passwordSet: boolean }> {
    return this.request('/auth/status', 'GET')
  }

  // Health endpoint
  async getHealth(): Promise<{
    status: string
    version: string
    services: {
      groq: boolean
      ollama: boolean
      whisperCpp: boolean
    }
  }> {
    return this.request('/health', 'GET')
  }

  // Transcription endpoints
  async transcribe(audioFile: File) {
    const formData = new FormData()
    formData.append('audio', audioFile)
    return this.request('/transcribe', 'POST', formData, true)
  }

  // History endpoints
  async getHistory(page = 1, limit = 20, search?: string): Promise<{
    items: Array<{
      id: string
      timestamp: string
      raw_text: string
      refined_text: string
      stt_engine: string
      stt_latency_ms: number
      llm_latency_ms: number
      total_latency_ms: number
    }>
    total: number
    page: number
    limit: number
    totalPages: number
  }> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (search) params.append('search', search)
    return this.request(`/history?${params.toString()}`, 'GET')
  }

  async getHistoryItem(id: string) {
    return this.request(`/history/${id}`, 'GET')
  }

  async deleteHistoryItem(id: string) {
    return this.request(`/history/${id}`, 'DELETE')
  }

  // Vocabulary endpoints
  async getVocabulary(): Promise<
    Array<{
      id: string
      term: string
      alternatives: string[]
      category: string
      enabled: boolean
    }>
  > {
    return this.request('/vocabulary', 'GET')
  }

  async createVocabulary(data: {
    term: string
    alternatives: string[]
    category: string
  }) {
    return this.request('/vocabulary', 'POST', data)
  }

  async updateVocabulary(
    id: string,
    data: {
      term?: string
      alternatives?: string[]
      category?: string
      enabled?: boolean
    },
  ) {
    return this.request(`/vocabulary/${id}`, 'PUT', data)
  }

  async deleteVocabulary(id: string) {
    return this.request(`/vocabulary/${id}`, 'DELETE')
  }

  async importVocabulary(entries: unknown[]) {
    return this.request('/vocabulary/import', 'POST', { entries })
  }

  async exportVocabulary(): Promise<{
    version: string
    timestamp: string
    entries: unknown[]
  }> {
    return this.request('/vocabulary/export', 'GET')
  }

  // Settings endpoints
  async getSettings(): Promise<Record<string, string>> {
    return this.request('/settings', 'GET')
  }

  async updateSettings(data: Record<string, unknown>) {
    return this.request('/settings', 'PUT', data)
  }

  // Stats endpoints
  async getStatsOverview(): Promise<{
    today: number
    thisWeek: number
    thisMonth: number
    allTime: number
    avgLatency: number
  }> {
    return this.request('/stats/overview', 'GET')
  }

  async getStatsDailyUsage(range = 30): Promise<
    Array<{
      date: string
      count: number
      avgLatency: number
    }>
  > {
    return this.request(`/stats/daily?range=${range}`, 'GET')
  }
}

export const api = new ApiClient()
