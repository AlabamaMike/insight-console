'use client'

import Link from 'next/link'
import type { Deal } from '@/types'
import { Building2, TrendingUp, Calendar, ChevronRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface DealListProps {
  deals: Deal[]
  onRefresh: () => void
}

const statusColors = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  analyzing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  synthesis: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  ready: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  archived: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

const statusLabels = {
  draft: 'Draft',
  analyzing: 'Analyzing',
  synthesis: 'Synthesis',
  ready: 'Ready',
  archived: 'Archived',
}

export default function DealList({ deals }: DealListProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {deals.map((deal) => (
        <Link
          key={deal.id}
          href={`/deals/${deal.id}`}
          className="block bg-white dark:bg-slate-800 rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
        >
          <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  {deal.name}
                </h3>
                {deal.target_company && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    {deal.target_company}
                  </p>
                )}
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </div>

            {/* Details */}
            <div className="space-y-2 mb-4">
              {deal.sector && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <TrendingUp className="h-4 w-4" />
                  <span>{deal.sector}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Calendar className="h-4 w-4" />
                <span>
                  Created {formatDistanceToNow(new Date(deal.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex items-center justify-between">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  statusColors[deal.status]
                }`}
              >
                {statusLabels[deal.status]}
              </span>
              {deal.key_questions && deal.key_questions.length > 0 && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {deal.key_questions.length} questions
                </span>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
