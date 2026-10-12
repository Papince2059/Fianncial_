import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  FivePartReport,
  GapItem,
  ComplianceItem,
  CorrectiveActionItem,
  KpiItem,
} from '../types/api'
import {
  FileText,
  AlertTriangle,
  Table,
  CheckSquare,
  BarChart3,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  ExternalLink,
  Target,
} from 'lucide-react'

interface ReportAccordionProps {
  report: FivePartReport
}

export const ReportAccordion: React.FC<ReportAccordionProps> = ({ report }) => {
  const { t } = useTranslation()
  const [openSection, setOpenSection] = useState<number>(1) // Default Part 1 open

  const toggleSection = (idx: number) => {
    setOpenSection(openSection === idx ? 0 : idx)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLIANT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            {t('status.COMPLIANT')}
          </span>
        )
      case 'NON_COMPLIANT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            {t('status.NON_COMPLIANT')}
          </span>
        )
      case 'PARTIALLY_COMPLIANT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            {t('status.PARTIALLY_COMPLIANT')}
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            {status}
          </span>
        )
    }
  }

  const getSeverityBadge = (sev: GapItem['severity']) => {
    const map = {
      CRITICAL: 'bg-rose-50 text-rose-700 border-rose-200',
      HIGH: 'bg-orange-50 text-orange-700 border-orange-200',
      MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
      LOW: 'bg-blue-50 text-blue-700 border-blue-200',
    }
    return (
      <span
        className={`px-2 py-0.5 rounded-md text-[11px] font-bold border uppercase tracking-wide ${
          map[sev] || 'bg-slate-100 text-slate-600 border-slate-200'
        }`}
      >
        {t(`status.${sev}`, sev)}
      </span>
    )
  }

  const getPriorityBadge = (pri: CorrectiveActionItem['priority']) => {
    const map = {
      P1: 'bg-rose-50 text-[#DE1B54] border-rose-200 font-bold',
      P2: 'bg-amber-50 text-amber-700 border-amber-200 font-bold',
      P3: 'bg-blue-50 text-blue-700 border-blue-200 font-bold',
    }
    return (
      <span
        className={`px-2 py-0.5 rounded text-xs font-bold border ${
          map[pri] || 'bg-slate-100 text-slate-600'
        }`}
      >
        {pri}
      </span>
    )
  }

  return (
    <div className="space-y-4">
      {/* SECTION 1: EXECUTIVE SUMMARY */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <button
          onClick={() => toggleSection(1)}
          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-50 text-[#DE1B54] border border-rose-200">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-[#151B33]">
                {t('analysis.summary')}
              </h3>
              <p className="text-xs text-slate-500">
                High-level synthesis and legal compliance overview
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(report.executive_summary?.overall_status || 'UNKNOWN')}
            {openSection === 1 ? (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-slate-400" />
            )}
          </div>
        </button>

        {openSection === 1 && (
          <div className="p-5 border-t border-slate-200 space-y-5 bg-slate-50/50">
            {/* Metric pill cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-xs">
                <span className="text-xs font-medium text-slate-500">Compliance Status</span>
                <div className="mt-1 font-bold text-base text-[#151B33]">
                  {report.executive_summary?.overall_status}
                </div>
              </div>
              <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-xs">
                <span className="text-xs font-medium text-slate-500">Confidence Score</span>
                <div className="mt-1 font-bold text-base text-blue-600 font-mono">
                  {((report.executive_summary?.confidence_score || 0) * 100).toFixed(1)}%
                </div>
              </div>
              <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-xs">
                <span className="text-xs font-medium text-slate-500">Identified Gaps</span>
                <div className="mt-1 font-bold text-base text-[#DE1B54] font-mono">
                  {report.executive_summary?.critical_findings_count ??
                    report.gap_analysis?.total_gaps ?? 0}
                </div>
              </div>
              <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-xs">
                <span className="text-xs font-medium text-slate-500">Statutory Articles</span>
                <div className="mt-1 font-bold text-base text-[#151B33] font-mono">
                  {report.executive_summary?.key_statutory_articles?.length ?? 0}
                </div>
              </div>
            </div>

            {/* Narrative text */}
            <div className="p-4 rounded-lg bg-white border border-slate-200 leading-relaxed text-sm text-slate-700 shadow-xs">
              {report.executive_summary?.overview}
            </div>

            {/* Referenced articles */}
            {report.executive_summary?.key_statutory_articles?.length > 0 && (
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-2">
                  Key Governing Statutory Articles
                </span>
                <div className="flex flex-wrap gap-2">
                  {report.executive_summary.key_statutory_articles.map((art, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-md text-xs font-mono bg-white text-slate-700 border border-slate-200 shadow-xs"
                    >
                      {art}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 2: DETAILED GAP ANALYSIS */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <button
          onClick={() => toggleSection(2)}
          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-50 text-[#DE1B54] border border-rose-200">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-[#151B33]">
                {t('analysis.detailedGaps')}
              </h3>
              <p className="text-xs text-slate-500">
                Statutory discrepancies, omissions, and procedural non-compliance
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-[#DE1B54] border border-rose-200">
              {report.gap_analysis?.identified_gaps?.length || 0} Gaps
            </span>
            {openSection === 2 ? (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-slate-400" />
            )}
          </div>
        </button>

        {openSection === 2 && (
          <div className="p-5 border-t border-slate-200 space-y-4 bg-slate-50/50">
            {(!report.gap_analysis?.identified_gaps ||
              report.gap_analysis.identified_gaps.length === 0) ? (
              <div className="p-6 text-center text-sm text-slate-500 bg-white rounded-lg border border-slate-200">
                No statutory compliance gaps identified. Process aligns with legal obligations.
              </div>
            ) : (
              report.gap_analysis.identified_gaps.map((gap: GapItem, idx: number) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg bg-white border border-slate-200 hover:border-slate-300 transition-colors space-y-2.5 shadow-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {gap.article_number}
                      </span>
                      <span className="font-semibold text-sm text-[#151B33]">
                        {gap.article_title}
                      </span>
                      {gap.process_step_num && (
                        <span className="text-xs text-slate-400">
                          (Step {gap.process_step_num})
                        </span>
                      )}
                    </div>
                    {getSeverityBadge(gap.severity)}
                  </div>

                  <div className="text-xs text-slate-600">
                    <span className="font-semibold text-slate-700">Obligation: </span>
                    {gap.statutory_obligation}
                  </div>

                  <div className="text-xs text-rose-800 bg-rose-50/80 p-2.5 rounded border border-rose-200">
                    <span className="font-semibold text-rose-900">Gap Description: </span>
                    {gap.gap_description}
                  </div>

                  {gap.risk_implication && (
                    <div className="text-xs text-amber-800 bg-amber-50/60 p-2.5 rounded border border-amber-200">
                      <span className="font-semibold text-amber-900">Risk Implication: </span>
                      {gap.risk_implication}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* SECTION 3: ARTICLE COMPLIANCE MATRIX */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <button
          onClick={() => toggleSection(3)}
          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600 border border-purple-200">
              <Table className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-[#151B33]">
                {t('analysis.complianceMatrix')}
              </h3>
              <p className="text-xs text-slate-500">
                Article-by-article audit records with evidence citations
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-500">
              {report.compliance_matrix?.articles?.length || 0} Articles Audited
            </span>
            {openSection === 3 ? (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-slate-400" />
            )}
          </div>
        </button>

        {openSection === 3 && (
          <div className="p-5 border-t border-slate-200 overflow-x-auto bg-slate-50/50">
            <table className="w-full text-left text-xs bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Article</th>
                  <th className="py-2.5 px-3 font-semibold">Title</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 px-3 font-semibold">Confidence</th>
                  <th className="py-2.5 px-3 font-semibold">Statutory Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {report.compliance_matrix?.articles?.map((item: ComplianceItem, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-[#DE1B54]">
                      {item.article_number}
                    </td>
                    <td className="py-3 px-3 font-medium text-[#151B33] max-w-[200px] truncate">
                      {item.article_title}
                    </td>
                    <td className="py-3 px-3">{getStatusBadge(item.status)}</td>
                    <td className="py-3 px-3 font-mono font-medium text-slate-700">
                      {(item.confidence * 100).toFixed(0)}%
                    </td>
                    <td className="py-3 px-3 max-w-sm">
                      <p className="line-clamp-2 text-slate-600 italic">
                        "{item.evidence_excerpt || item.reasoning}"
                      </p>
                      {item.statutory_citation && (
                        <div className="mt-1 flex items-center gap-1 text-[11px] text-[#DE1B54]">
                          <ExternalLink className="w-3 h-3" />
                          <span>{item.statutory_citation}</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 4: CORRECTIVE ACTION PLAN */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <button
          onClick={() => toggleSection(4)}
          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-[#151B33]">
                {t('analysis.correctiveActions')}
              </h3>
              <p className="text-xs text-slate-500">
                Prioritized remediation roadmap to achieve statutory compliance
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {report.corrective_actions?.actions?.length || 0} Actions
            </span>
            {openSection === 4 ? (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-slate-400" />
            )}
          </div>
        </button>

        {openSection === 4 && (
          <div className="p-5 border-t border-slate-200 space-y-4 bg-slate-50/50">
            {report.corrective_actions?.actions?.map(
              (action: CorrectiveActionItem, idx: number) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg bg-white border border-slate-200 hover:border-slate-300 transition-colors space-y-3 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {getPriorityBadge(action.priority)}
                      <h4 className="font-semibold text-sm text-[#151B33]">
                        {action.title}
                      </h4>
                    </div>
                    <span className="text-xs font-mono font-medium text-slate-600">
                      Target: {action.target_article}
                    </span>
                  </div>

                  <div className="space-y-1.5 pl-2.5 border-l-2 border-[#DE1B54]">
                    {action.remediation_steps.map((step, sIdx) => (
                      <div key={sIdx} className="text-xs text-slate-700 flex items-start gap-2">
                        <span className="font-mono text-[#DE1B54] font-semibold shrink-0">
                          {sIdx + 1}.
                        </span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                    <div>
                      <span className="font-medium text-slate-500">Responsible Entity: </span>
                      <span className="text-slate-800 font-medium">
                        {action.responsible_entity}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-slate-500">Estimated Timeline: </span>
                      <span className="text-slate-800 font-medium font-mono">
                        {action.estimated_timeline}
                      </span>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* SECTION 5: MISSING KPI & CONTROL FRAMEWORK */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <button
          onClick={() => toggleSection(5)}
          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-[#151B33]">
                {t('analysis.kpiFramework')}
              </h3>
              <p className="text-xs text-slate-500">
                Key performance indicators, supervisory control metrics, and monitoring intervals
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-[#DE1B54] border border-rose-200">
              {report.kpi_framework?.kpis?.length || 0} KPIs
            </span>
            {openSection === 5 ? (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-slate-400" />
            )}
          </div>
        </button>

        {openSection === 5 && (
          <div className="p-5 border-t border-slate-200 space-y-4 bg-slate-50/50">
            {report.kpi_framework?.kpis?.map((kpi: KpiItem, idx: number) => (
              <div
                key={idx}
                className="p-4 rounded-lg bg-white border border-slate-200 hover:border-slate-300 transition-colors space-y-2.5 shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-[#DE1B54] shrink-0" />
                    <h4 className="font-semibold text-sm text-[#151B33]">
                      {kpi.kpi_name}
                    </h4>
                  </div>
                  <span className="px-2.5 py-0.5 rounded bg-rose-50 border border-rose-200 text-[11px] font-mono text-[#DE1B54] self-start sm:self-auto font-medium">
                    {kpi.related_article}
                  </span>
                </div>

                <div className="text-xs text-slate-600">
                  <span className="font-semibold text-slate-700">Control Objective: </span>
                  {kpi.control_objective}
                </div>

                <div className="p-2.5 rounded bg-slate-50 border border-slate-200 font-mono text-xs text-slate-800">
                  <span className="text-slate-500 font-medium">Formula: </span>
                  {kpi.metric_formula}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 text-[11px] text-slate-500 border-t border-slate-100">
                  <div>
                    <span className="font-medium text-slate-500">Frequency: </span>
                    <span className="text-slate-800 font-medium">
                      {kpi.monitoring_frequency}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-slate-500">Role / Source: </span>
                    <span className="text-slate-800 font-medium">
                      {kpi.responsible_role}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-slate-500">Target: </span>
                    <span className="text-[#DE1B54] font-mono font-semibold">
                      {kpi.target_threshold}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
