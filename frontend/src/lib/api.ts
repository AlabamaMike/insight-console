import axios from 'axios'
import type { Deal, Document, Workflow, Synthesis } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// API Functions

export const healthCheck = async () => {
  const { data } = await api.get('/health')
  return data
}

// Deals
export const getDeals = async (): Promise<Deal[]> => {
  const { data } = await api.get('/api/deals')
  return data
}

export const getDeal = async (id: number): Promise<Deal> => {
  const { data } = await api.get(`/api/deals/${id}`)
  return data
}

export const createDeal = async (dealData: {
  name: string
  target_company?: string
  sector?: string
  deal_type?: string
}): Promise<Deal> => {
  const { data } = await api.post('/api/deals', dealData)
  return data
}

// Documents
export const getDocuments = async (dealId: number): Promise<Document[]> => {
  const { data } = await api.get(`/api/deals/${dealId}/documents`)
  return data
}

export const uploadDocument = async (dealId: number, file: File): Promise<Document> => {
  const formData = new FormData()
  formData.append('file', file)

  const { data } = await api.post(`/api/deals/${dealId}/documents`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return data
}

// Analysis
export const startAnalysis = async (dealId: number) => {
  const { data } = await api.post(`/api/deals/${dealId}/analysis/start`)
  return data
}

export const getWorkflows = async (dealId: number): Promise<Workflow[]> => {
  const { data } = await api.get(`/api/deals/${dealId}/analysis/workflows`)
  return data
}

export const executeWorkflow = async (dealId: number, workflowId: number): Promise<Workflow> => {
  const { data } = await api.post(`/api/deals/${dealId}/analysis/workflows/${workflowId}/execute`)
  return data
}

// Synthesis
export const generateSynthesis = async (dealId: number) => {
  const { data } = await api.post(`/api/deals/${dealId}/synthesis/generate`)
  return data
}

export const getSynthesis = async (dealId: number): Promise<Synthesis> => {
  const { data} = await api.get(`/api/deals/${dealId}/synthesis`)
  return data
}

export default api
