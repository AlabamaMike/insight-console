'use client'

import { useState } from 'react'
import { uploadDocument, startAnalysis } from '@/lib/api'
import type { Document } from '@/types'
import { Upload, FileText, Play } from 'lucide-react'

interface DocumentUploadProps {
  dealId: number
  documents: Document[]
  onUpdate: () => void
}

export default function DocumentUpload({ dealId, documents, onUpdate }: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [starting, setStarting] = useState(false)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      await uploadDocument(dealId, file)
      onUpdate()
    } catch (error) {
      console.error('Upload failed:', error)
      alert('Failed to upload document')
    } finally {
      setUploading(false)
    }
  }

  const handleStartAnalysis = async () => {
    setStarting(true)
    try {
      await startAnalysis(dealId)
      onUpdate()
      alert('Analysis started! Workflows are being created.')
    } catch (error: any) {
      console.error('Failed to start analysis:', error)
      alert(error.response?.data?.detail || 'Failed to start analysis')
    } finally {
      setStarting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Upload Documents
        </h3>
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 hover:bg-gray-100">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Upload className="w-8 h-8 mb-2 text-gray-500 dark:text-gray-400" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">PDF, DOCX, TXT</p>
          </div>
          <input
            type="file"
            className="hidden"
            accept=".pdf,.docx,.txt"
            onChange={handleFileUpload}
            disabled={uploading}
          />
        </label>
      </div>

      {/* Documents List */}
      {documents.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Uploaded Documents
          </h3>
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-900 rounded"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {doc.filename}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {(doc.file_size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Start Analysis Button */}
          <button
            onClick={handleStartAnalysis}
            disabled={starting}
            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium disabled:opacity-50"
          >
            <Play className="h-5 w-5" />
            {starting ? 'Starting Analysis...' : 'Start Analysis'}
          </button>
        </div>
      )}
    </div>
  )
}
