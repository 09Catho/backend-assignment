import { useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { useStore } from './store/useStore'
import Header from './components/Header'
import Dashboard from './components/Dashboard'
import ConversationList from './components/ConversationList'
import OperatorPanel from './components/OperatorPanel'
import LoginModal from './components/LoginModal'

function App() {
  const { currentOperator, setCurrentOperator } = useStore()
  const [showLogin, setShowLogin] = useState(!currentOperator)

  useEffect(() => {
    // Check if operator is stored in localStorage
    const stored = localStorage.getItem('currentOperator')
    if (stored) {
      try {
        setCurrentOperator(JSON.parse(stored))
        setShowLogin(false)
      } catch (error) {
        console.error('Failed to parse stored operator:', error)
        localStorage.removeItem('currentOperator')
      }
    }
  }, [setCurrentOperator])

  const handleLogin = (operator: any) => {
    setCurrentOperator(operator)
    localStorage.setItem('currentOperator', JSON.stringify(operator))
    setShowLogin(false)
  }

  const handleLogout = () => {
    setCurrentOperator(null)
    localStorage.removeItem('currentOperator')
    setShowLogin(true)
  }

  if (showLogin || !currentOperator) {
    return (
      <>
        <LoginModal onLogin={handleLogin} />
        <Toaster position="top-right" />
      </>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onLogout={handleLogout} />
      
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="space-y-6">
          {/* Dashboard Stats */}
          <Dashboard />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Conversation List */}
            <div className="lg:col-span-2">
              <ConversationList />
            </div>
            
            {/* Operator Panel */}
            <div className="lg:col-span-1">
              <OperatorPanel />
            </div>
          </div>
        </div>
      </main>
      
      <Toaster position="top-right" />
    </div>
  )
}

export default App
