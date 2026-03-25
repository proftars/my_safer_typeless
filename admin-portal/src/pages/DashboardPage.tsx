import React, { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Layout } from '../components/Layout'

interface StatsOverview {
  today: number
  thisWeek: number
  thisMonth: number
  allTime: number
  avgLatency: number
}

interface DailyStats {
  date: string
  count: number
  avgLatency: number
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
        const [overview, daily] = await Promise.all([
          api.getStatsOverview(),
          api.getStatsDailyUsage(30),
        ])
        setStats(overview)
        setDailyStats(daily)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load statistics')
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
        { label: '今日轉錄', value: stats.today, color: 'bg-blue-500' },
        { label: '本週轉錄', value: stats.thisWeek, color: 'bg-green-500' },
        { label: '本月轉錄', value: stats.thisMonth, color: 'bg-yellow-500' },
        { label: '總計轉錄', value: stats.allTime, color: 'bg-purple-500' },
      ]
    : []

  const maxCount = Math.max(...dailyStats.map((d) => d.count), 0) || 1
  const maxLatency = Math.max(...dailyStats.map((d) => d.avgLatency), 0) || 100

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
                style={{
                  borderLeftColor: card.color === 'bg-blue-500' ? '#3b82f6' :
                                  card.color === 'bg-green-500' ? '#10b981' :
                                  card.color === 'bg-yellow-500' ? '#f59e0b' : '#a855f7'
                }}
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
              <p className="text-4xl font-bold text-indigo-600">{stats.avgLatency.toFixed(0)}ms</p>
              <p className="text-sm text-gray-600 mt-2">過去30天的平均轉錄延遲時間</p>
            </div>
          )}

          {/* Daily Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">30天使用統計</h2>

            <div className="space-y-8">
              {/* Count Chart */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-4">轉錄數量</h3>
                <div className="flex items-end gap-1 h-40">
                  {dailyStats.map((stat, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center">
                      <div
                        className="w-full bg-indigo-500 rounded-t hover:bg-indigo-600 transition-colors cursor-pointer"
                        style={{
                          height: `${(stat.count / maxCount) * 100}%`,
                          minHeight: stat.count > 0 ? '2px' : '0px',
                        }}
                        title={`${stat.date}: ${stat.count}`}
                      ></div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-600">
                  <span>{dailyStats[0]?.date || ''}</span>
                  <span>{dailyStats[dailyStats.length - 1]?.date || ''}</span>
                </div>
              </div>

              {/* Latency Chart */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-4">平均延遲 (毫秒)</h3>
                <div className="flex items-end gap-1 h-40">
                  {dailyStats.map((stat, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center">
                      <div
                        className="w-full bg-green-500 rounded-t hover:bg-green-600 transition-colors cursor-pointer"
                        style={{
                          height: `${(stat.avgLatency / maxLatency) * 100}%`,
                          minHeight: stat.avgLatency > 0 ? '2px' : '0px',
                        }}
                        title={`${stat.date}: ${stat.avgLatency.toFixed(0)}ms`}
                      ></div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-600">
                  <span>{dailyStats[0]?.date || ''}</span>
                  <span>{dailyStats[dailyStats.length - 1]?.date || ''}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
