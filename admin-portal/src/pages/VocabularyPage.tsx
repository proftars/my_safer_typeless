import React, { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Layout } from '../components/Layout'

interface VocabularyItem {
  id: string
  term: string
  alternatives: string[]
  category: string
  enabled: boolean
}

export function VocabularyPage() {
  const [items, setItems] = useState<VocabularyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    term: '',
    alternatives: '',
    category: '',
  })

  useEffect(() => {
    fetchVocabulary()
  }, [])

  const fetchVocabulary = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getVocabulary()
      setItems(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vocabulary')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.term || !formData.category) {
      alert('請填入詞彙和分類')
      return
    }

    try {
      const alternatives = formData.alternatives
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s)

      if (editingId) {
        await api.updateVocabulary(editingId, {
          term: formData.term,
          alternatives,
          category: formData.category,
        })
      } else {
        await api.createVocabulary({
          term: formData.term,
          alternatives,
          category: formData.category,
        })
      }

      setFormData({ term: '', alternatives: '', category: '' })
      setEditingId(null)
      setShowForm(false)
      await fetchVocabulary()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Save failed')
    }
  }

  const handleEdit = (item: VocabularyItem) => {
    setFormData({
      term: item.term,
      alternatives: item.alternatives.join('\n'),
      category: item.category,
    })
    setEditingId(item.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除此詞彙嗎?')) return

    try {
      await api.deleteVocabulary(id)
      await fetchVocabulary()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const handleToggleEnabled = async (id: string, currentState: boolean) => {
    try {
      await api.updateVocabulary(id, { enabled: !currentState })
      await fetchVocabulary()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Toggle failed')
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({ term: '', alternatives: '', category: '' })
  }

  const handleExport = async () => {
    try {
      const data = await api.exportVocabulary()
      const json = JSON.stringify(data, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `vocabulary-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Export failed')
    }
  }

  const handleImport = async (file: File) => {
    try {
      const text = await file.text()
      const data = JSON.parse(text)

      if (!Array.isArray(data.entries)) {
        alert('無效的詞彙檔案格式')
        return
      }

      if (!confirm(`將匯入 ${data.entries.length} 個詞彙。繼續嗎?`)) return

      await api.importVocabulary(data.entries)
      await fetchVocabulary()
      alert('匯入成功')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Import failed')
    }
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

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-6">詞彙庫</h1>

          {/* Actions Bar */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
            >
              新增詞彙
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              匯出
            </button>
            <label className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer">
              匯入
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  const file = e.currentTarget.files?.[0]
                  if (file) handleImport(file)
                  e.currentTarget.value = ''
                }}
                className="hidden"
              />
            </label>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 mb-6">
              {error}
            </div>
          )}

          {/* Form Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-xl w-full">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {editingId ? '編輯詞彙' : '新增詞彙'}
                  </h2>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      詞彙 *
                    </label>
                    <input
                      type="text"
                      value={formData.term}
                      onChange={(e) => setFormData({ ...formData, term: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="輸入詞彙"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      分類 *
                    </label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="輸入分類"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      替代寫法 (每行一個)
                    </label>
                    <textarea
                      value={formData.alternatives}
                      onChange={(e) => setFormData({ ...formData, alternatives: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="輸入替代寫法，每行一個"
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                    >
                      {editingId ? '更新' : '新增'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">詞彙</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">替代寫法</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">分類</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">啟用</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-900 font-medium">{item.term}</td>
                    <td className="px-6 py-4 text-gray-600 text-xs max-w-xs">
                      {item.alternatives.join(', ') || '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-900">{item.category}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleEnabled(item.id, item.enabled)}
                        className={`px-3 py-1 rounded text-sm transition-colors ${
                          item.enabled
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {item.enabled ? '是' : '否'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap space-x-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                      >
                        編輯
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                      >
                        刪除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {items.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg">
              <p className="text-gray-600">沒有詞彙</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
