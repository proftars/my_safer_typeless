import React, { useEffect, useState } from 'react'
import { Sidebar } from './Sidebar'
import { api } from '../lib/api'

interface HealthStatus {
  status: string
  version: string
  services: {
    groq: boolean
    ollama: boolean
    whisperCpp: boolean
  }
}

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const data = await api.getHealth()
        setHealth(data)
      } catch (err) {
        console.error('Failed to fetch health status:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchHealth()
    const interval = setInterval(fetchHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  const getServiceColor = (active: boolean) => active ? 'bg-green-500' : 'bg-gray-400'

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">My Safer Typeless</h2>
          </div>
          {!loading && health && (
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600">版本:</span>
                <span className="font-mono text-gray-900">{health.version}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${getServiceColor(health.services.groq)}`}></div>
                  <span className="text-xs text-gray-600">Groq</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${getServiceColor(health.services.ollama)}`}></div>
                  <span className="text-xs text-gray-600">Ollama</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${getServiceColor(health.services.whisperCpp)}`}></div>
                  <span className="text-xs text-gray-600">Whisper</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-auto">
          <div className="p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
