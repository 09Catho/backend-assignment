import apiClient from './client'
import type { Conversation } from '../store/useStore'

export interface ConversationsResponse {
  status: string
  data: {
    conversations: Conversation[]
    next_cursor: string | null
    has_more: boolean
  }
  meta: {
    count: number
  }
}

export const conversationsAPI = {
  list: async (params: {
    state?: 'QUEUED' | 'ALLOCATED' | 'RESOLVED'
    sort?: 'priority' | 'newest' | 'oldest'
    limit?: number
    cursor?: string
  } = {}) => {
    const response = await apiClient.get<ConversationsResponse>('/conversations', { params })
    return response.data
  },

  allocate: async (operatorId: number) => {
    const response = await apiClient.post('/conversations/allocate', { operator_id: operatorId })
    return response.data
  },

  claim: async (conversationId: number, operatorId: number) => {
    const response = await apiClient.post('/conversations/claim', {
      conversation_id: conversationId,
      operator_id: operatorId,
    })
    return response.data
  },

  resolve: async (conversationId: number) => {
    const response = await apiClient.post('/conversations/resolve', {
      conversation_id: conversationId,
    })
    return response.data
  },

  deallocate: async (conversationId: number) => {
    const response = await apiClient.post('/conversations/deallocate', {
      conversation_id: conversationId,
    })
    return response.data
  },

  reassign: async (conversationId: number, operatorId: number) => {
    const response = await apiClient.post('/conversations/reassign', {
      conversation_id: conversationId,
      operator_id: operatorId,
    })
    return response.data
  },

  search: async (phoneNumber: string) => {
    const response = await apiClient.get('/conversations/search', {
      params: { phone_number: phoneNumber },
    })
    return response.data
  },
}
