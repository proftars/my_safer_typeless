import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Layout } from '../components/Layout'

interface HistoryItem {
  id: string
  timestamp: string
  raw_text: string
  refined_text: string
  stt_engine: string
  stt_latency_ms: number
  llm_latency_ms: number
  total_latency_ms: number
}

interface HistoryResponse {
  items: HistoryItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export function HistoryPage() {
  const [history, setHistory] = useState<HistoryResponse | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null)

  const limit = 20

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setError(null)
        const data = await api.getHistory(page, limit, search)
        setHistory(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load history')
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [page, search])

  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除此記錄嗎?')) return

    try {
      await api.deleteHistoryItem(id)
      setHistory((prev) => {
        if (!prev) return null
        return {
          ...prev,
          items: prev.items.filter((item) => item.id !== id),
          total: prev.total - 1,
        }
      })
      setSelectedItem(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed')
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
          <h1 className="text-3xl font-bold text-gray-900 mb-6">轉錄紀錄</h1>

          {/* Search Bar */}
          <div className="mb-6">
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="搜尋原始文字或潤飾文字..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 mb-6">
              {error}
            </div>
          )}

          {selectedItem && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
                  <h2 className="text-xl font-semibold text-gray-900">詳細資訊</h2>
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="text-gray-600 hover:text-gray-900 text-xl"
                  >
                    ✕
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">時間</h3>
                    <p className="text-gray-900 text-sm">
                      {new Date(selectedItem.timestamp).toLocaleString('zh-Hant')}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">原始文字</h3>
                    <p className="text-gray-900 text-sm bg-gray-50 p-3 rounded break-words">
                      {selectedItem.raw_text}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">潤飾文字</h3>
                    <p className="text-gray-900 text-sm bg-gray-50 p-3 rounded break-words">
                      {selectedItem.refined_text}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-1">語音引擎</h3>
                      <p className="text-gray-900 text-sm">{selectedItem.stt_engine}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-1">總延遲</h3>
                      <p className="text-gray-900 text-sm">{selectedItem.total_latency_ms}ms</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-1">STT延遲</h3>
                      <p className="text-gray-900 text-sm">{selectedItem.stt_latency_ms}ms</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-1">LLM延遲</h3>
                      <p className="text-gray-900 text-sm">{selectedItem.llm_latency_ms}ms</p>
                    </div>
                  </div>
                  <div className="pt-4 flex gap-2">
                    <button
                      onClick={() => handleDelete(selectedItem.id)}
                      className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                      刪除
                    </button>
                    <button
                      onClick={() => setSelectedItem(null)}
                      className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                    >
                      關閉
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">時間</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">原始文字</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">潤飾文字</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">引擎</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">延遲</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {history?.items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-900 whitespace-nowrap">
                      {new Date(item.timestamp).toLocaleDateString('zh-Hant')} <br />
                      <span className="text-xs text-gray-600">
                        {new Date(item.timestamp).toLocaleTimeString('zh-Hant')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-900 max-w-xs truncate">
                      {item.raw_text}
                    </td>
                    <td className="px-6 py-4 text-gray-900 max-w-xs truncate">
                      {item.refined_text}
                    </td>
                    <td className="px-6 py-4 text-gray-900 whitespace-nowrap">
                      {item.stt_engine}
                    </td>
                    <td className="px-6 py-4 text-gray-900 whitespace-nowrap">
                      {item.total_latency_ms}ms
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap space-x-2">
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                      >
                        詳情
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

          {/* Pagination */}
          {history && history.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-gray-600">
                第 {history.page} 頁 / 共 {history.totalPages} 頁 ({history.total} 筆記錄)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  上一頁
                </button>
                <button
                  onClick={() => setPage(Math.min(history.totalPages, page + 1))}
                  disabled={page === history.totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  下一頁
                </button>
              </div>
            </div>
          )}

          {history?.items.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600">沒有找到轉錄記錄</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
