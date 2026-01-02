import { useEffect, useState } from 'react'
import { Phone, Clock, MessageCircle, AlertCircle, CheckCircle2, User, XCircle, UserPlus, Search, ArrowUpDown } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import toast from 'react-hot-toast'
import { useStore } from '../store/useStore'
import { conversationsAPI } from '../api/conversations'
import type { Conversation } from '../store/useStore'

export default function ConversationList() {
  const { currentOperator, refreshTrigger, triggerRefresh, setSelectedConversation } = useStore()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'QUEUED' | 'ALLOCATED' | 'RESOLVED'>('QUEUED')
  const [sortBy, setSortBy] = useState<'priority' | 'newest' | 'oldest'>('priority')
  const [allocating, setAllocating] = useState(false)
  const [searchPhone, setSearchPhone] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  const isManagerOrAdmin = currentOperator?.role === 'MANAGER' || currentOperator?.role === 'ADMIN'

  useEffect(() => {
    fetchConversations()
  }, [filter, sortBy, refreshTrigger])

  const fetchConversations = async () => {
    try {
      setLoading(true)
      const response = await conversationsAPI.list({
        state: filter,
        sort: sortBy,
        limit: 50,
      })

      if (response.data?.conversations) {
        setConversations(response.data.conversations)
      }
    } catch (error: any) {
      console.error('Failed to fetch conversations:', error)
      toast.error(error.response?.data?.message || 'Failed to load conversations')
    } finally {
      setLoading(false)
    }
  }

  const handleAllocate = async () => {
    if (!currentOperator) return

    setAllocating(true)
    try {
      const response = await conversationsAPI.allocate(currentOperator.id)
      
      if (response.data?.conversation) {
        toast.success('Conversation allocated successfully!')
        triggerRefresh()
      } else {
        toast('No conversations available for allocation', { icon: 'ℹ️' })
      }
    } catch (error: any) {
      console.error('Failed to allocate:', error)
      toast.error(error.response?.data?.message || 'Failed to allocate conversation')
    } finally {
      setAllocating(false)
    }
  }

  const handleResolve = async (conversationId: number) => {
    try {
      await conversationsAPI.resolve(conversationId)
      toast.success('Conversation resolved!')
      triggerRefresh()
    } catch (error: any) {
      console.error('Failed to resolve:', error)
      toast.error(error.response?.data?.message || 'Failed to resolve conversation')
    }
  }

  const handleDeallocate = async (conversationId: number) => {
    if (!window.confirm('Return this conversation to the queue?')) return
    
    try {
      await conversationsAPI.deallocate(conversationId)
      toast.success('Conversation returned to queue!')
      triggerRefresh()
    } catch (error: any) {
      console.error('Failed to deallocate:', error)
      toast.error(error.response?.data?.message || 'Failed to deallocate conversation')
    }
  }

  const handleReassign = async (conversationId: number) => {
    const operatorId = window.prompt('Enter operator ID to reassign to:')
    if (!operatorId) return

    try {
      await conversationsAPI.reassign(conversationId, parseInt(operatorId))
      toast.success('Conversation reassigned!')
      triggerRefresh()
    } catch (error: any) {
      console.error('Failed to reassign:', error)
      toast.error(error.response?.data?.message || 'Failed to reassign conversation')
    }
  }

  const handleSearch = async () => {
    if (!searchPhone.trim()) {
      toast.error('Please enter a phone number')
      return
    }

    try {
      const response = await conversationsAPI.search(searchPhone)
      if (response.data?.conversations) {
        setConversations(response.data.conversations)
        toast.success(`Found ${response.data.conversations.length} conversation(s)`)
      }
    } catch (error: any) {
      console.error('Failed to search:', error)
      toast.error(error.response?.data?.message || 'Search failed')
    }
  }

  const handleClaim = async (conversationId: number) => {
    if (!currentOperator) return

    try {
      await conversationsAPI.claim(conversationId, currentOperator.id)
      toast.success('Conversation claimed!')
      triggerRefresh()
    } catch (error: any) {
      console.error('Failed to claim:', error)
      toast.error(error.response?.data?.message || 'Failed to claim conversation')
    }
  }

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'QUEUED':
        return <Clock className="w-4 h-4" />
      case 'ALLOCATED':
        return <MessageCircle className="w-4 h-4" />
      case 'RESOLVED':
        return <CheckCircle2 className="w-4 h-4" />
      default:
        return <AlertCircle className="w-4 h-4" />
    }
  }

  const getPriorityColor = (score: number) => {
    if (score >= 0.05) return 'text-red-600 bg-red-50'
    if (score >= 0.03) return 'text-orange-600 bg-orange-50'
    return 'text-yellow-600 bg-yellow-50'
  }

  const formatResolvedTime = (resolvedAt: string | null) => {
    if (!resolvedAt) return null
    
    // Convert UTC to IST (Asia/Kolkata)
    const utcDate = new Date(resolvedAt)
    const istDate = toZonedTime(utcDate, 'Asia/Kolkata')
    
    // Format: "Jan 1, 2026 at 1:30 AM IST"
    return format(istDate, "MMM d, yyyy 'at' h:mm a 'IST'")
  }

  return (
    <div className="card">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Conversations</h2>
          <div className="flex items-center space-x-2">
            {!showSearch && filter === 'QUEUED' && (
              <button
                onClick={handleAllocate}
                disabled={allocating || loading}
                className="btn btn-primary"
              >
                {allocating ? 'Allocating...' : 'Auto-Allocate'}
              </button>
            )}
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="btn btn-secondary"
              title="Search by phone"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showSearch && (
          <div className="mb-4 flex items-center space-x-2">
            <input
              type="text"
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              placeholder="Enter phone number (e.g., +15550001111)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button
              onClick={handleSearch}
              className="btn btn-primary"
            >
              Search
            </button>
            <button
              onClick={() => {
                setShowSearch(false)
                setSearchPhone('')
                fetchConversations()
              }}
              className="btn btn-secondary"
            >
              Clear
            </button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            {(['QUEUED', 'ALLOCATED', 'RESOLVED'] as const).map((state) => (
              <button
                key={state}
                onClick={() => {
                  setFilter(state)
                  setShowSearch(false)
                  setSearchPhone('')
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === state
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {state}
              </button>
            ))}
          </div>

          {/* Sorting Dropdown */}
          <div className="flex items-center space-x-2">
            <ArrowUpDown className="w-4 h-4 text-gray-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'priority' | 'newest' | 'oldest')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
            >
              <option value="priority">Priority</option>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-2 text-sm text-gray-500">Loading conversations...</p>
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No {filter.toLowerCase()} conversations</p>
          </div>
        ) : (
          conversations.map((conversation) => (
            <div
              key={conversation.id}
              className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => setSelectedConversation(conversation)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div className={`badge badge-${conversation.state.toLowerCase()}`}>
                    {getStateIcon(conversation.state)}
                    <span className="ml-1">{conversation.state}</span>
                  </div>
                  {filter === 'QUEUED' && conversation.priority_score !== undefined && (
                    <div className={`px-2 py-1 rounded text-xs font-semibold ${getPriorityColor(conversation.priority_score)}`}>
                      Priority: {conversation.priority_score.toFixed(3)}
                    </div>
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })}
                </span>
              </div>

              <div className="flex items-center space-x-2 mb-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-900">
                  {conversation.customer_phone_number}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-4 text-gray-600">
                  <span className="flex items-center">
                    <MessageCircle className="w-4 h-4 mr-1" />
                    {conversation.message_count} messages
                  </span>
                  {conversation.inbox_name && (
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {conversation.inbox_name}
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {/* Claim button for QUEUED conversations */}
                  {conversation.state === 'QUEUED' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleClaim(conversation.id)
                      }}
                      className="btn btn-secondary btn-sm"
                    >
                      <UserPlus className="w-4 h-4 mr-1" />
                      Claim
                    </button>
                  )}

                  {/* Resolve button for own ALLOCATED conversations */}
                  {conversation.state === 'ALLOCATED' && conversation.assigned_operator_id === currentOperator?.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleResolve(conversation.id)
                      }}
                      className="btn btn-primary btn-sm"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Resolve
                    </button>
                  )}

                  {/* Manager/Admin actions for ALLOCATED conversations */}
                  {isManagerOrAdmin && conversation.state === 'ALLOCATED' && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleResolve(conversation.id)
                        }}
                        className="btn btn-primary btn-sm"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Resolve
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeallocate(conversation.id)
                        }}
                        className="btn btn-danger btn-sm"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Deallocate
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleReassign(conversation.id)
                        }}
                        className="btn btn-secondary btn-sm"
                      >
                        <UserPlus className="w-4 h-4 mr-1" />
                        Reassign
                      </button>
                    </>
                  )}
                </div>
              </div>

              {conversation.operator_name && (
                <div className="mt-2 flex items-center text-xs text-gray-500">
                  <User className="w-3 h-3 mr-1" />
                  Assigned to: {conversation.operator_name}
                </div>
              )}

              {conversation.resolved_at && (
                <div className="mt-2 flex items-center text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Resolved: {formatResolvedTime(conversation.resolved_at)}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
