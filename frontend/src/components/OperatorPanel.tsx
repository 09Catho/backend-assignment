import { useEffect, useState } from 'react'
import { Power, PowerOff, RefreshCw, Inbox } from 'lucide-react'
import toast from 'react-hot-toast'
import { useStore } from '../store/useStore'
import { operatorsAPI } from '../api/operators'

interface OperatorStatus {
  status: 'AVAILABLE' | 'OFFLINE'
  last_status_change_at: string
}

interface InboxData {
  id: number
  display_name: string
  phone_number: string
}

export default function OperatorPanel() {
  const { currentOperator, triggerRefresh } = useStore()
  const [status, setStatus] = useState<OperatorStatus | null>(null)
  const [inboxes, setInboxes] = useState<InboxData[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetchOperatorData()
  }, [currentOperator])

  const fetchOperatorData = async () => {
    if (!currentOperator) return

    try {
      setLoading(true)
      const [statusRes, inboxesRes] = await Promise.all([
        operatorsAPI.getStatus(currentOperator.id),
        operatorsAPI.getInboxes(currentOperator.id)
      ])

      if (statusRes.data?.status) {
        setStatus(statusRes.data.status)
      }

      if (inboxesRes.data?.inboxes) {
        setInboxes(inboxesRes.data.inboxes)
      }
    } catch (error) {
      console.error('Failed to fetch operator data:', error)
      toast.error('Failed to load operator information')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusToggle = async () => {
    if (!currentOperator || !status) return

    const newStatus = status.status === 'AVAILABLE' ? 'OFFLINE' : 'AVAILABLE'
    setUpdating(true)

    try {
      const response = await operatorsAPI.updateStatus(currentOperator.id, newStatus)
      
      if (response.data?.status) {
        setStatus(response.data.status)
        toast.success(`Status changed to ${newStatus}`)
        triggerRefresh()
      }
    } catch (error: any) {
      console.error('Failed to update status:', error)
      toast.error(error.response?.data?.message || 'Failed to update status')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Status</h3>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {status?.status === 'AVAILABLE' ? (
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-green-700">Available</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">Offline</span>
              </div>
            )}
          </div>

          <button
            onClick={handleStatusToggle}
            disabled={updating}
            className={`btn ${
              status?.status === 'AVAILABLE' ? 'btn-danger' : 'btn-primary'
            }`}
          >
            {updating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : status?.status === 'AVAILABLE' ? (
              <>
                <PowerOff className="w-4 h-4 mr-2" />
                Go Offline
              </>
            ) : (
              <>
                <Power className="w-4 h-4 mr-2" />
                Go Available
              </>
            )}
          </button>
        </div>

        {status?.status === 'OFFLINE' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-800">
              <strong>Grace Period Active:</strong> Your allocated conversations will be returned to the queue after 15 minutes.
            </p>
          </div>
        )}
      </div>

      {/* Inboxes Card */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Inbox className="w-5 h-5 mr-2" />
          Subscribed Inboxes
        </h3>

        {inboxes.length === 0 ? (
          <p className="text-sm text-gray-500">No inbox subscriptions</p>
        ) : (
          <div className="space-y-3">
            {inboxes.map((inbox) => (
              <div
                key={inbox.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {inbox.display_name}
                  </p>
                  <p className="text-xs text-gray-500">{inbox.phone_number}</p>
                </div>
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        
        <div className="space-y-2">
          <button
            onClick={() => triggerRefresh()}
            className="w-full btn btn-secondary justify-start"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Data
          </button>
        </div>
      </div>

      {/* Info Card */}
      <div className="card p-6 bg-primary-50 border-primary-200">
        <h4 className="text-sm font-semibold text-primary-900 mb-2">
          💡 Quick Tip
        </h4>
        <p className="text-xs text-primary-800">
          Use "Auto-Allocate" to get the highest priority conversation automatically. Conversations are sorted by message count and wait time.
        </p>
      </div>
    </div>
  )
}
