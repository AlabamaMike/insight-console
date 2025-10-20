'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getDeal, getDocuments, getWorkflows, getSynthesis } from '@/lib/api'
import type { Deal, Document, Workflow, Synthesis } from '@/types'
import DocumentUpload from '@/components/DocumentUpload'
import WorkflowList from '@/components/WorkflowList'
import SynthesisReport from '@/components/SynthesisReport'
import { ArrowLeft, FileText, Brain, BarChart3 } from 'lucide-react'

type TabType = 'documents' | 'workflows' | 'synthesis'

export default function DealPage() {
  const params = useParams()
  const dealId = Number(params.id)

  const [deal, setDeal] = useState<Deal | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [synthesis, setSynthesis] = useState<Synthesis | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('documents')

  useEffect(() => {
    loadData()
  }, [dealId])

  const loadData = async () => {
    try {
      setLoading(true)
      const [dealData, docsData, workflowsData] = await Promise.all([
        getDeal(dealId),
        getDocuments(dealId),
        getWorkflows(dealId).catch(() => []),
      ])

      setDeal(dealData)
      setDocuments(docsData)
      setWorkflows(workflowsData)

      // Try to load synthesis if deal is in synthesis/ready state
      if (dealData.status === 'synthesis' || dealData.status === 'ready') {
        try {
          const synthesisData = await getSynthesis(dealId)
          setSynthesis(synthesisData)
        } catch {
          // Synthesis might not exist yet
        }
      }
    } catch (error) {
      console.error('Failed to load deal data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!deal) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Deal not found</h2>
          <Link href="/" className="text-primary-600 hover:text-primary-700">
            Return to dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{deal.name}</h1>
          {deal.target_company && (
            <p className="text-lg text-gray-600 dark:text-gray-400">{deal.target_company}</p>
          )}
          <div className="flex gap-4 mt-4">
            {deal.sector && (
              <span className="text-sm text-gray-600 dark:text-gray-400">Sector: {deal.sector}</span>
            )}
            {deal.deal_type && (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Type: {deal.deal_type}
              </span>
            )}
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Status: {deal.status}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="-mb-px flex gap-8">
            <button
              onClick={() => setActiveTab('documents')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'documents'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FileText className="h-4 w-4" />
              Documents ({documents.length})
            </button>
            <button
              onClick={() => setActiveTab('workflows')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'workflows'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Brain className="h-4 w-4" />
              Workflows ({workflows.length})
            </button>
            <button
              onClick={() => setActiveTab('synthesis')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'synthesis'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              disabled={!synthesis}
            >
              <BarChart3 className="h-4 w-4" />
              Synthesis
              {synthesis && (
                <span className="ml-1 inline-flex items-center justify-center w-2 h-2 rounded-full bg-green-500"></span>
              )}
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'documents' && (
          <DocumentUpload dealId={dealId} documents={documents} onUpdate={loadData} />
        )}
        {activeTab === 'workflows' && (
          <WorkflowList dealId={dealId} workflows={workflows} onUpdate={loadData} />
        )}
        {activeTab === 'synthesis' && synthesis && (
          <SynthesisReport synthesis={synthesis} />
        )}
        {activeTab === 'synthesis' && !synthesis && (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg">
            <p className="text-gray-600 dark:text-gray-400">
              No synthesis available yet. Complete workflows first.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
