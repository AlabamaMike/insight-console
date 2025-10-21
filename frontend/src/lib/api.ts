import axios, { AxiosError } from 'axios'
import type { Deal, Document, Workflow, Synthesis } from '@/types'
import { ApiError } from './errors'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
})

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Handle errors consistently
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: string; message?: string; code?: string }>) => {
    // Network error (no response)
    if (!error.response) {
      throw new ApiError(
        'Network error. Please check your connection.',
        0,
        'NETWORK_ERROR'
      )
    }

    const { status, data } = error.response
    const message = data?.message || data?.error || error.message

    // Create ApiError with proper status and message
    const apiError = new ApiError(message, status, data?.code, data)

    // Handle auth errors by clearing token
    if (status === 401) {
      localStorage.removeItem('auth_token')
      // Optionally redirect to login
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }

    return Promise.reject(apiError)
  }
)

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
  const { data } = await api.get(`/api/documents/deal/${dealId}`)
  return data
}

export const uploadDocument = async (
  dealId: number,
  file: File,
  onProgress?: (percent: number) => void
): Promise<Document> => {
  try {
    // Validate file size (50MB max)
    const MAX_SIZE = 50 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      throw new ApiError('File size exceeds 50MB limit', 400, 'FILE_TOO_LARGE')
    }

    // Step 1: Request upload URL from backend
    const uploadRequest = {
      deal_id: dealId,
      filename: file.name,
      mime_type: file.type,
      file_size: file.size,
    }

    const { data: uploadData } = await api.post('/api/documents/request-upload', uploadRequest)

    // Step 2: Upload file directly to R2 using presigned URL
    await axios.put(uploadData.upload_url, file, {
      headers: {
        'Content-Type': file.type,
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(percent)
        }
      },
      timeout: 300000, // 5 minute timeout for large files
    })

    // Step 3: Confirm upload completion
    const { data } = await api.post(`/api/documents/${uploadData.document_id}/confirm-upload`)
    return data.document
  } catch (error) {
    // Add context to upload errors
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(
      'Failed to upload document. Please try again.',
      500,
      'UPLOAD_FAILED',
      error
    )
  }
}

export const getDocumentDownloadUrl = async (documentId: number): Promise<{ download_url: string; filename: string }> => {
  const { data } = await api.get(`/api/documents/${documentId}/download`)
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
