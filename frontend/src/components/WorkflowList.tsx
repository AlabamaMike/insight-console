'use client'

import { useState } from 'react'
import { executeWorkflow, generateSynthesis } from '@/lib/api'
import type { Workflow } from '@/types'
import { Play, CheckCircle, Loader, XCircle, TrendingUp } from 'lucide-react'

interface WorkflowListProps {
  dealId: number
  workflows: Workflow[]
  onUpdate: () => void
}

const workflowLabels = {
  competitive_analysis: 'Competitive Analysis',
  market_sizing: 'Market Sizing',
  unit_economics: 'Unit Economics',
  management_assessment: 'Management Assessment',
  financial_benchmarking: 'Financial Benchmarking',
}

export default function WorkflowList({ dealId, workflows, onUpdate }: WorkflowListProps) {
  const [executing, setExecuting] = useState<number | null>(null)
  const [synthesizing, setSynthesizing] = useState(false)

  const handleExecute = async (workflowId: number) => {
    setExecuting(workflowId)
    try {
      await executeWorkflow(dealId, workflowId)
      onUpdate()
    } catch (error) {
      console.error('Execution failed:', error)
      alert('Failed to execute workflow')
    } finally {
      setExecuting(null)
    }
  }

  const handleGenerateSynthesis = async () => {
    setSynthesizing(true)
    try {
      await generateSynthesis(dealId)
      onUpdate()
      alert('Synthesis generated! View it in the Synthesis tab.')
    } catch (error: any) {
      console.error('Synthesis failed:', error)
      alert(error.response?.data?.detail || 'Failed to generate synthesis')
    } finally {
      setSynthesizing(false)
    }
  }

  const completedCount = workflows.filter((w) => w.status === 'completed').length
  const canSynthesize = completedCount === workflows.length && workflows.length > 0

  if (workflows.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg p-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">
          No workflows yet. Upload documents and start analysis first.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Progress Summary */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Analysis Progress
          </h3>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {completedCount} / {workflows.length} completed
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-primary-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${(completedCount / workflows.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Workflows */}
      <div className="space-y-3">
        {workflows.map((workflow) => (
          <div
            key={workflow.id}
            className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-1">
                  {workflowLabels[workflow.workflow_type]}
                </h4>
                {workflow.current_step && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">{workflow.current_step}</p>
                )}
                <div className="mt-2 flex items-center gap-2">
                  {workflow.status === 'completed' && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                  {workflow.status === 'running' && (
                    <Loader className="h-5 w-5 text-blue-500 animate-spin" />
                  )}
                  {workflow.status === 'failed' && (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                    {workflow.status}
                  </span>
                  <span className="text-sm text-gray-500">
                    {workflow.progress_percent}%
                  </span>
                </div>
              </div>

              {workflow.status === 'pending' && (
                <button
                  onClick={() => handleExecute(workflow.id)}
                  disabled={executing === workflow.id}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  <Play className="h-4 w-4" />
                  Execute
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Generate Synthesis */}
      {canSynthesize && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-6 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                All workflows completed!
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Generate a comprehensive synthesis report
              </p>
            </div>
            <button
              onClick={handleGenerateSynthesis}
              disabled={synthesizing}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium disabled:opacity-50 flex items-center gap-2"
            >
              <TrendingUp className="h-5 w-5" />
              {synthesizing ? 'Generating...' : 'Generate Synthesis'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
