import { LogOut, MessageSquare } from 'lucide-react'
import { useStore } from '../store/useStore'

interface HeaderProps {
  onLogout: () => void
}

export default function Header({ onLogout }: HeaderProps) {
  const { currentOperator } = useStore()

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-primary-600 rounded-lg">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Conversation Allocation
              </h1>
              <p className="text-xs text-gray-500">Real-time Management System</p>
            </div>
          </div>

          {currentOperator && (
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {currentOperator.name}
                </p>
                <p className="text-xs text-gray-500">
                  {currentOperator.role}
                </p>
              </div>
              <button
                onClick={onLogout}
                className="btn btn-secondary"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
