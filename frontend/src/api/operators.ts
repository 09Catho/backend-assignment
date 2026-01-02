import apiClient from './client'

export const operatorsAPI = {
  getStatus: async (operatorId: number) => {
    const response = await apiClient.get(`/operators/${operatorId}/status`)
    return response.data
  },

  updateStatus: async (operatorId: number, status: 'AVAILABLE' | 'OFFLINE') => {
    const response = await apiClient.put(`/operators/${operatorId}/status`, { status })
    return response.data
  },

  getStats: async (operatorId: number) => {
    const response = await apiClient.get(`/operators/${operatorId}/stats`)
    return response.data
  },

  getInboxes: async (operatorId: number) => {
    const response = await apiClient.get(`/operators/${operatorId}/inboxes`)
    return response.data
  },

  list: async () => {
    const response = await apiClient.get('/operators')
    return response.data
  },
}
