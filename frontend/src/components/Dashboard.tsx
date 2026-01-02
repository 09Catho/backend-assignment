import { useEffect, useState } from 'react'
import { MessageSquare, Clock, CheckCircle, TrendingUp } from 'lucide-react'
import { useStore } from '../store/useStore'
import { operatorsAPI } from '../api/operators'
import { conversationsAPI } from '../api/conversations'

interface Stats {
  active_conversations: number
  resolved_today: number
  resolved_this_week: number
  avg_resolution_time_minutes: number
}

export default function Dashboard() {
  const { currentOperator, refreshTrigger } = useStore()
  const [stats, setStats] = useState<Stats | null>(null)
  const [queuedCount, setQueuedCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      if (!currentOperator) return

      try {
        setLoading(true)
        const [statsRes, queuedRes] = await Promise.all([
          operatorsAPI.getStats(currentOperator.id),
          conversationsAPI.list({ state: 'QUEUED', limit: 1 })
        ])

        if (statsRes.data?.stats) {
          setStats(statsRes.data.stats)
        }

        if (queuedRes.data?.conversations) {
          setQueuedCount(queuedRes.meta?.count || 0)
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [currentOperator, refreshTrigger])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    )
  }

  const statCards = [
    {
      title: 'Active Conversations',
      value: stats?.active_conversations || 0,
      icon: MessageSquare,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Queued',
      value: queuedCount,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      title: 'Resolved Today',
      value: stats?.resolved_today || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Avg Resolution Time',
      value: stats?.avg_resolution_time_minutes 
        ? `${Math.round(stats.avg_resolution_time_minutes)}m`
        : 'N/A',
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, index) => (
        <div key={index} className="card p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
          <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
        </div>
      ))}
    </div>
  )
}
