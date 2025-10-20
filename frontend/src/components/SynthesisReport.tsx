'use client'

import type { Synthesis } from '@/types'
import { TrendingUp, TrendingDown, AlertTriangle, Target, Lightbulb, CheckCircle2 } from 'lucide-react'

interface SynthesisReportProps {
  synthesis: Synthesis
}

const recommendationColors = {
  strong_buy: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  buy: 'bg-green-50 text-green-700 dark:bg-green-900/50 dark:text-green-400',
  hold: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  pass: 'bg-red-50 text-red-700 dark:bg-red-900/50 dark:text-red-400',
  strong_pass: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
}

const recommendationLabels = {
  strong_buy: 'Strong Buy',
  buy: 'Buy',
  hold: 'Hold',
  pass: 'Pass',
  strong_pass: 'Strong Pass',
}

export default function SynthesisReport({ synthesis }: SynthesisReportProps) {
  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Executive Summary
        </h2>
        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
          {synthesis.executive_summary}
        </p>
      </div>

      {/* Recommendation */}
      {synthesis.recommendation && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Investment Recommendation
              </h3>
              <span
                className={`inline-block px-4 py-2 rounded-full text-lg font-bold ${
                  recommendationColors[synthesis.recommendation]
                }`}
              >
                {recommendationLabels[synthesis.recommendation]}
              </span>
            </div>
            {synthesis.overall_confidence && (
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Confidence</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {synthesis.overall_confidence}%
                </p>
              </div>
            )}
          </div>
          {synthesis.recommendation_rationale && (
            <p className="text-gray-700 dark:text-gray-300 mt-4">
              {synthesis.recommendation_rationale}
            </p>
          )}
        </div>
      )}

      {/* Deal Score */}
      {synthesis.deal_score && (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Deal Score: {synthesis.deal_score}/100
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(synthesis.dimension_scores).map(([key, score]) => (
              <div key={key} className="bg-gray-50 dark:bg-slate-900 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1 capitalize">
                  {key.replace(/_/g, ' ')}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {typeof score === 'number' ? score : '—'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Insights */}
      {synthesis.key_insights.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Key Insights
          </h3>
          <ul className="space-y-2">
            {synthesis.key_insights.map((insight, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Key Opportunities */}
        {synthesis.key_opportunities.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Key Opportunities
            </h3>
            <div className="space-y-3">
              {synthesis.key_opportunities.map((opp, idx) => (
                <div key={idx} className="border-l-4 border-green-500 pl-3">
                  <p className="font-medium text-gray-900 dark:text-white">{opp.opportunity}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Impact: {opp.potential_impact} | {opp.timeframe}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key Risks */}
        {synthesis.key_risks.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Key Risks
            </h3>
            <div className="space-y-3">
              {synthesis.key_risks.map((risk, idx) => (
                <div key={idx} className="border-l-4 border-red-500 pl-3">
                  <p className="font-medium text-gray-900 dark:text-white">{risk.risk}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Severity: {risk.severity} | Likelihood: {risk.likelihood}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Value Creation Levers */}
      {synthesis.value_creation_levers.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-500" />
            Value Creation Levers
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {synthesis.value_creation_levers.map((lever, idx) => (
              <div key={idx} className="bg-gray-50 dark:bg-slate-900 p-4 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <p className="font-medium text-gray-900 dark:text-white">{lever.lever}</p>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      lever.priority === 'high'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                        : lever.priority === 'medium'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {lever.priority}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{lever.estimated_impact}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next Steps */}
      {synthesis.recommended_next_steps.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recommended Next Steps
          </h3>
          <div className="space-y-3">
            {synthesis.recommended_next_steps.map((step, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-900 rounded"
              >
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-600 text-white text-sm flex items-center justify-center font-medium">
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">{step.step}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{step.rationale}</p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    step.priority === 'high'
                      ? 'bg-red-100 text-red-800'
                      : step.priority === 'medium'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {step.priority}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
