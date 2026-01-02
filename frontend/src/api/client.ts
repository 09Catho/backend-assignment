import axios from 'axios'

const API_BASE_URL = '/api/v1'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add operator ID to all requests
apiClient.interceptors.request.use((config) => {
  const operator = localStorage.getItem('currentOperator')
  if (operator) {
    try {
      const { id } = JSON.parse(operator)
      config.headers['X-Operator-Id'] = id.toString()
    } catch (error) {
      console.error('Failed to parse operator from localStorage:', error)
    }
  }
  return config
})

// Handle errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.message || 'An error occurred'
    console.error('API Error:', message, error)
    return Promise.reject(error)
  }
)

export default apiClient
