// API Types matching backend models

export interface User {
  id: number
  email: string
  full_name: string
  firm_id: string
  role: string
  is_active: boolean
}

export interface Deal {
  id: number
  name: string
  target_company?: string
  sector?: string
  deal_type?: string
  status: 'draft' | 'analyzing' | 'synthesis' | 'ready' | 'archived'
  key_questions: string[]
  hypotheses: string[]
  created_by_id: number
  firm_id: string
  created_at: string
  updated_at?: string
}

export interface Document {
  id: number
  deal_id: number
  filename: string
  file_size: number
  mime_type: string
  uploaded_by_id: number
  created_at: string
}

export interface Workflow {
  id: number
  workflow_type: 'competitive_analysis' | 'market_sizing' | 'unit_economics' | 'management_assessment' | 'financial_benchmarking'
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed'
  progress_percent: number
  current_step?: string
  findings: any
}

export interface Synthesis {
  id: number
  deal_id: number
  status: 'pending' | 'generating' | 'completed' | 'failed'
  executive_summary?: string
  key_insights: string[]
  recommendation?: 'strong_buy' | 'buy' | 'hold' | 'pass' | 'strong_pass'
  recommendation_rationale?: string
  overall_confidence?: number
  confidence_by_dimension: Record<string, number>
  key_risks: Array<{
    risk: string
    severity: string
    likelihood: string
    impact_area: string
  }>
  risk_mitigation: string[]
  key_opportunities: Array<{
    opportunity: string
    potential_impact: string
    timeframe: string
  }>
  value_creation_levers: Array<{
    lever: string
    priority: string
    estimated_impact: string
  }>
  deal_score?: number
  dimension_scores: Record<string, number>
  cross_workflow_insights: string[]
  recommended_next_steps: Array<{
    step: string
    priority: string
    rationale: string
  }>
  information_gaps: string[]
  workflows_included: string[]
  created_at: string
  completed_at?: string
}
