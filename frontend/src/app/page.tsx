'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getDeals } from '@/lib/api'
import { isAuthenticated } from '@/lib/auth'
import type { Deal } from '@/types'
import DealList from '@/components/DealList'
import CreateDealButton from '@/components/CreateDealButton'
import { PlusCircle } from 'lucide-react'

export default function Home() {
  const router = useRouter()
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check authentication
    if (!isAuthenticated()) {
      router.push('/auth/login')
      return
    }

    loadDeals()
  }, [router])

  const loadDeals = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getDeals()
      setDeals(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load deals')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Insight Console
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            AI-Powered Private Equity Deal Analysis
          </p>
        </div>

        {/* Actions */}
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
            Your Deals
          </h2>
          <CreateDealButton onDealCreated={loadDeals} />
        </div>

        {/* Content */}
        {loading && (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {!loading && !error && deals.length === 0 && (
          <div className="text-center py-12">
            <PlusCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No deals yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Get started by creating your first deal
            </p>
            <CreateDealButton onDealCreated={loadDeals} />
          </div>
        )}

        {!loading && !error && deals.length > 0 && (
          <DealList deals={deals} onRefresh={loadDeals} />
        )}
      </div>
    </main>
  )
}
