import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Layout } from '../components/Layout'

interface StatsOverview {
  today: { count: number; durationMs: number }
  thisWeek: { count: number; durationMs: number }
  thisMonth: { count: number; durationMs: number }
  allTime: { count: number; durationMs: number }
  avgLatency: { sttMs: number; llmMs: number }
}

interface DailyStats {
  date: string
  count: number
  total_duration_ms: number
}

interface DailyResponse {
  daily: DailyStats[]
  range: number
}

export function DashboardPage() {
  const [stats, setStats] = useState<StatsOverview | null>(null)
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setError(null)
        const [overview, dailyResp] = await Promise.all([
          api.getStatsOverview() as unknown as Promise<StatsOverview>,
          api.getStatsDailyUsage(30) as unknown as Promise<DailyResponse>,
        ])
        setStats(overview)
        setDailyStats(Array.isArray(dailyResp) ? dailyResp : (dailyResp.daily || []))
      } catch (err) {
        setError(err instanceof Error ? err.message : '無法載入統計資料')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 60000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <p className="text-gray-600">載入中...</p>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      </Layout>
    )
  }

  const statCards = stats
    ? [
        { label: '今日轉錄', value: stats.today.count, color: '#3b82f6' },
        { label: '本週轉錄', value: stats.thisWeek.count, color: '#10b981' },
        { label: '本月轉錄', value: stats.thisMonth.count, color: '#f59e0b' },
        { label: '總計轉錄', value: stats.allTime.count, color: '#a855f7' },
      ]
    : []

  const maxCount = Math.max(...dailyStats.map((d) => d.count), 1)

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-8">儀表板</h1>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statCards.map((card, i) => (
              <div
                key={i}
                className="bg-white rounded-lg shadow p-6 border-l-4"
                style={{ borderLeftColor: card.color }}
              >
                <p className="text-gray-600 text-sm">{card.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{card.value}</p>
              </div>
            ))}
          </div>

          {/* Average Latency */}
          {stats && (
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">平均延遲</h2>
              <div className="flex gap-8">
                <div>
                  <p className="text-sm text-gray-600">語音辨識 (STT)</p>
                  <p className="text-3xl font-bold text-indigo-600">{stats.avgLatency.sttMs}ms</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">文字潤飾 (LLM)</p>
                  <p className="text-3xl font-bold text-green-600">{stats.avgLatency.llmMs}ms</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">合計</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.avgLatency.sttMs + stats.avgLatency.llmMs}ms</p>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-3">過去 7 天的平均延遲</p>
            </div>
          )}

          {/* Daily Chart */}
          {dailyStats.length > 0 ? (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">30天使用統計</h2>
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-4">每日轉錄數量</h3>
                <div className="flex items-end gap-1 h-40">
                  {dailyStats.map((stat, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center">
                      <div
                        className="w-full bg-indigo-500 rounded-t hover:bg-indigo-600 transition-colors cursor-pointer"
                        style={{
                          height: `${(stat.count / maxCount) * 100}%`,
                          minHeight: stat.count > 0 ? '4px' : '0px',
                        }}
                        title={`${stat.date}: ${stat.count} 筆`}
                      ></div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span>{dailyStats[0]?.date || ''}</span>
                  <span>{dailyStats[dailyStats.length - 1]?.date || ''}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
              尚無轉錄紀錄，開始使用後統計圖表將會顯示在這裡。
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
