import { useState } from 'react'
import { User, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import apiClient from '../api/client'

interface LoginModalProps {
  onLogin: (operator: any) => void
}

export default function LoginModal({ onLogin }: LoginModalProps) {
  const [operatorId, setOperatorId] = useState('1')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!operatorId || isNaN(Number(operatorId))) {
      toast.error('Please enter a valid operator ID')
      return
    }

    setLoading(true)
    try {
      // Get operator status to verify they exist
      const response = await apiClient.get(`/operators/${operatorId}/status`, {
        headers: { 'X-Operator-Id': operatorId }
      })
      
      if (response.data?.data?.status) {
        const operator = {
          id: response.data.data.status.operator_id,
          name: response.data.data.status.name,
          email: `operator${operatorId}@example.com`,
          role: response.data.data.status.role,
          tenant_id: 1,
          status: response.data.data.status.status
        }
        
        toast.success(`Welcome, ${operator.name}!`)
        onLogin(operator)
      } else {
        toast.error('Operator not found')
      }
    } catch (error: any) {
      console.error('Login error:', error)
      toast.error(error.response?.data?.message || 'Failed to login. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
            <User className="w-8 h-8 text-primary-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Conversation Allocation
          </h1>
          <p className="text-gray-600">
            Sign in to manage conversations
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="operatorId" className="block text-sm font-medium text-gray-700 mb-2">
              Operator ID
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="operatorId"
                type="text"
                value={operatorId}
                onChange={(e) => setOperatorId(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter operator ID (1-4)"
                disabled={loading}
                autoFocus
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Test IDs: 1 (Operator), 2 (Operator), 3 (Manager), 4 (Admin)
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn btn-primary py-3 text-base font-semibold"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-center text-gray-500">
            Demo credentials are pre-configured. Use operator IDs 1-4 for testing.
          </p>
        </div>
      </div>
    </div>
  )
}
