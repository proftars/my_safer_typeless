import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Layout } from '../components/Layout'

export function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [changes, setChanges] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getSettings()
      setSettings(data)
      setChanges({})
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (key: string, value: string) => {
    setChanges({
      ...changes,
      [key]: value,
    })
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      await api.updateSettings(changes)
      setSettings({
        ...settings,
        ...changes,
      })
      setChanges({})
      setSuccess(true)

      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setChanges({})
  }

  const displaySettings = {
    ...settings,
    ...changes,
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <p className="text-gray-600">載入中...</p>
        </div>
      </Layout>
    )
  }

  const settingKeys = Object.keys(displaySettings).sort()

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-6">設定</h1>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 mb-6">
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 mb-6">
              設定已成功保存
            </div>
          )}

          {/* Settings Form */}
          <div className="bg-white rounded-lg shadow p-8 max-w-2xl">
            <div className="space-y-6">
              {settingKeys.length === 0 ? (
                <p className="text-gray-600 text-center py-8">沒有可用的設定</p>
              ) : (
                settingKeys.map((key) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">
                      {key
                        .replace(/_/g, ' ')
                        .replace(/([A-Z])/g, ' $1')
                        .trim()}
                    </label>
                    <input
                      type="text"
                      value={displaySettings[key] || ''}
                      onChange={(e) => handleChange(key, e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder={`Enter ${key}`}
                    />
                    {changes[key] !== undefined && changes[key] !== settings[key] && (
                      <p className="text-xs text-blue-600 mt-1">未儲存的變更</p>
                    )}
                  </div>
                ))
              )}

              {Object.keys(changes).length > 0 && (
                <div className="pt-6 flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? '儲存中...' : '儲存變更'}
                  </button>
                  <button
                    onClick={handleReset}
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    取消
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Info Section */}
          <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
            <h2 className="text-lg font-semibold text-blue-900 mb-2">設定信息</h2>
            <p className="text-sm text-blue-800">
              在此頁面管理系統設定。修改後需要點擊「儲存變更」按鈕才能生效。
            </p>
            <p className="text-sm text-blue-800 mt-2">
              總共有 <strong>{settingKeys.length}</strong> 個設定項目。
            </p>
          </div>
        </div>
      </div>
    </Layout>
  )
}
