import { create } from 'zustand'

export interface Operator {
  id: number
  name: string
  email: string
  role: 'OPERATOR' | 'MANAGER' | 'ADMIN'
  tenant_id: number
  status?: 'AVAILABLE' | 'OFFLINE'
}

export interface Conversation {
  id: number
  external_conversation_id: string
  customer_phone_number: string
  state: 'QUEUED' | 'ALLOCATED' | 'RESOLVED'
  assigned_operator_id: number | null
  message_count: number
  priority_score: number
  last_message_at: string
  created_at: string
  updated_at: string
  resolved_at: string | null
  inbox_name?: string
  operator_name?: string | null
  labels?: Array<{
    id: number
    name: string
    color: string
  }>
}

interface Store {
  currentOperator: Operator | null
  setCurrentOperator: (operator: Operator | null) => void
  conversations: Conversation[]
  setConversations: (conversations: Conversation[]) => void
  selectedConversation: Conversation | null
  setSelectedConversation: (conversation: Conversation | null) => void
  refreshTrigger: number
  triggerRefresh: () => void
}

export const useStore = create<Store>((set) => ({
  currentOperator: null,
  setCurrentOperator: (operator) => set({ currentOperator: operator }),
  conversations: [],
  setConversations: (conversations) => set({ conversations }),
  selectedConversation: null,
  setSelectedConversation: (conversation) => set({ selectedConversation: conversation }),
  refreshTrigger: 0,
  triggerRefresh: () => set((state) => ({ refreshTrigger: state.refreshTrigger + 1 })),
}))
