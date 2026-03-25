import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'

export function LoginPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(true)
  const navigate = useNavigate()
  const { login } = useAuth()

  useEffect(() => {
    api.getAuthStatus()
      .then((status) => {
        setNeedsSetup(!status.passwordSet)
      })
      .catch(() => {
        setNeedsSetup(false)
      })
      .finally(() => {
        setCheckingStatus(false)
      })
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await login(password)
      navigate('/dashboard')
    } catch (err) {
      const message = err instanceof Error ? err.message : '登入失敗'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('兩次輸入的密碼不一致')
      return
    }
    if (password.length < 4) {
      setError('密碼至少需要 4 個字元')
      return
    }

    setLoading(true)
    try {
      const result = await api.setPassword(password) as { token: string }
      api.setToken(result.token)
      navigate('/dashboard')
      // Reload to update auth state
      window.location.href = '/admin/'
    } catch (err) {
      const message = err instanceof Error ? err.message : '設定密碼失敗'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (checkingStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center">
        <div className="text-white text-lg">載入中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Safer Typeless</h1>
            <p className="text-gray-600">{needsSetup ? '初始設定' : '管理後台'}</p>
          </div>

          {needsSetup ? (
            <form onSubmit={handleSetup} className="space-y-6">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  設定管理員密碼
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="輸入新密碼（至少 4 字元）"
                  disabled={loading}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
                  required
                />
              </div>
              <div>
                <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-2">
                  確認密碼
                </label>
                <input
                  id="confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次輸入密碼"
                  disabled={loading}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
                  required
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? '設定中...' : '設定密碼並進入'}
              </button>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-800">
                  首次使用，請設定管理員密碼。此密碼用於保護管理後台的存取權限。
                </p>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  密碼
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="輸入管理員密碼"
                  disabled={loading}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
                  required
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? '登入中...' : '登入'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
