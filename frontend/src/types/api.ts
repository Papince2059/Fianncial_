export interface LawSummary {
  id: string
  code: string
  title: string
  title_ar?: string
  jurisdiction: string
  effective_date: string
  version: string
  created_at: string
}

export interface LawDetail extends LawSummary {
  description?: string
  source_file?: string
  chapters: LawChapter[]
  definitions: LawDefinition[]
}

export interface LawChapter {
  id: string
  number: number
  title: string
  title_ar?: string
  articles: LawArticle[]
}

export interface LawArticle {
  id: string
  article_number: string
  title: string
  title_ar?: string
  content: string
  content_ar?: string
  breadcrumb_path: string
}

export interface LawDefinition {
  term: string
  term_ar?: string
  definition: string
  definition_ar?: string
  source_article_num?: string
}

export interface ProcessSummary {
  id: string
  code: string
  name: string
  department: string
  category: string
  step_count: number
  version: string
}

export interface ProcessStep {
  step_num: number
  name: string
  description: string
  responsible_role: string
  input_artifacts?: string[]
  output_artifacts?: string[]
  controls?: string[]
}

export interface ProcessDetail extends ProcessSummary {
  description: string
  steps: ProcessStep[]
  applicable_laws: string[]
}

export interface AnalysisSummary {
  id: string
  process_id: string
  process_name?: string
  law_id?: string
  law_name?: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
  overall_compliance_status?: string
  confidence_score?: number
  created_at: string
  completed_at?: string
}

export interface GapItem {
  article_number: string
  article_title: string
  statutory_obligation: string
  process_step_num?: number
  gap_description: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  risk_implication: string
}

export interface ComplianceItem {
  article_number: string
  article_title: string
  status: 'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIALLY_COMPLIANT' | 'NOT_APPLICABLE'
  confidence: number
  statutory_citation: string
  evidence_excerpt: string
  reasoning: string
}

export interface CorrectiveActionItem {
  priority: 'P1' | 'P2' | 'P3'
  title: string
  target_article: string
  remediation_steps: string[]
  responsible_entity: string
  estimated_timeline: string
}

export interface KpiItem {
  kpi_name: string
  related_article: string
  control_objective: string
  metric_formula: string
  monitoring_frequency: string
  responsible_role: string
  target_threshold: string
}

export interface FivePartReport {
  executive_summary: {
    overview: string
    overall_status: string
    confidence_score: number
    critical_findings_count: number
    key_statutory_articles: string[]
  }
  gap_analysis: {
    identified_gaps: GapItem[]
    total_gaps: number
  }
  compliance_matrix: {
    articles: ComplianceItem[]
    compliant_ratio: number
  }
  corrective_actions: {
    actions: CorrectiveActionItem[]
  }
  kpi_framework: {
    kpis: KpiItem[]
  }
}

export interface AnalysisDetail extends AnalysisSummary {
  report_json?: FivePartReport
  agent_metadata?: Record<string, any>
  error_message?: string
}

export interface StreamEvent {
  event: string
  data: {
    agent?: string
    status?: string
    message?: string
    timestamp?: string
    token_usage?: number
    report_chunk?: any
    report?: FivePartReport
    [key: string]: any
  }
}

export interface DashboardMetrics {
  total_analyses: number
  compliant_count: number
  non_compliant_count: number
  partially_compliant_count: number
  average_confidence: number
  recent_analyses: AnalysisSummary[]
  statutory_laws_count: number
  monitored_processes_count: number
}
