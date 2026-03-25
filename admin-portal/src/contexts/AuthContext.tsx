import React, { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../lib/api'

interface AuthContextType {
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (password: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      setIsLoading(true)
      const stored = localStorage.getItem('auth_token')
      if (stored) {
        api.setToken(stored)
        setToken(stored)
      }
    } catch (err) {
      console.error('Auth check failed:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (password: string) => {
    try {
      setError(null)
      const result = await api.verify(password)
      api.setToken(result.token)
      setToken(result.token)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      setError(message)
      throw err
    }
  }

  const logout = () => {
    api.clearToken()
    setToken(null)
    localStorage.removeItem('auth_token')
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        isAuthenticated: !!token,
        isLoading,
        error,
        login,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
