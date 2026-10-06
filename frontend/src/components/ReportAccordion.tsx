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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            {t('status.COMPLIANT')}
          </span>
        )
      case 'NON_COMPLIANT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ShieldAlert className="w-3.5 h-3.5" />
            {t('status.NON_COMPLIANT')}
          </span>
        )
      case 'PARTIALLY_COMPLIANT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertCircle className="w-3.5 h-3.5" />
            {t('status.PARTIALLY_COMPLIANT')}
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            {status}
          </span>
        )
    }
  }

  const getSeverityBadge = (sev: GapItem['severity']) => {
    const map = {
      CRITICAL: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      HIGH: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
      MEDIUM: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      LOW: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    }
    return (
      <span
        className={`px-2 py-0.5 rounded-md text-[11px] font-bold border uppercase tracking-wide ${
          map[sev] || 'bg-slate-800 text-slate-400 border-slate-700'
        }`}
      >
        {t(`status.${sev}`, sev)}
      </span>
    )
  }

  const getPriorityBadge = (pri: CorrectiveActionItem['priority']) => {
    const map = {
      P1: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      P2: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      P3: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    }
    return (
      <span
        className={`px-2 py-0.5 rounded text-xs font-bold border ${
          map[pri] || 'bg-slate-800 text-slate-400'
        }`}
      >
        {pri}
      </span>
    )
  }

  return (
    <div className="space-y-4">
      {/* SECTION 1: EXECUTIVE SUMMARY */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-lg">
        <button
          onClick={() => toggleSection(1)}
          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-800/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-white">
                {t('analysis.summary')}
              </h3>
              <p className="text-xs text-slate-400">
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
          <div className="p-5 border-t border-slate-800 space-y-5 bg-slate-950/40">
            {/* Metric pill cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-xs text-slate-400">Compliance Status</span>
                <div className="mt-1 font-bold text-base text-slate-200">
                  {report.executive_summary?.overall_status}
                </div>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-xs text-slate-400">Confidence Score</span>
                <div className="mt-1 font-bold text-base text-indigo-400 font-mono">
                  {((report.executive_summary?.confidence_score || 0) * 100).toFixed(1)}%
                </div>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-xs text-slate-400">Identified Gaps</span>
                <div className="mt-1 font-bold text-base text-rose-400 font-mono">
                  {report.executive_summary?.critical_findings_count ??
                    report.gap_analysis?.total_gaps ?? 0}
                </div>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-xs text-slate-400">Statutory Articles</span>
                <div className="mt-1 font-bold text-base text-cyan-400 font-mono">
                  {report.executive_summary?.key_statutory_articles?.length ?? 0}
                </div>
              </div>
            </div>

            {/* Narrative text */}
            <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800/80 leading-relaxed text-sm text-slate-300">
              {report.executive_summary?.overview}
            </div>

            {/* Referenced articles */}
            {report.executive_summary?.key_statutory_articles?.length > 0 && (
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                  Key Governing Statutory Articles
                </span>
                <div className="flex flex-wrap gap-2">
                  {report.executive_summary.key_statutory_articles.map((art, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-md text-xs font-mono bg-slate-800 text-indigo-300 border border-slate-700"
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
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-lg">
        <button
          onClick={() => toggleSection(2)}
          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-800/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-white">
                {t('analysis.detailedGaps')}
              </h3>
              <p className="text-xs text-slate-400">
                Statutory discrepancies, omissions, and procedural non-compliance
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-400">
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
          <div className="p-5 border-t border-slate-800 space-y-4 bg-slate-950/40">
            {(!report.gap_analysis?.identified_gaps ||
              report.gap_analysis.identified_gaps.length === 0) ? (
              <div className="p-6 text-center text-sm text-slate-400">
                No statutory compliance gaps identified. Process aligns with legal obligations.
              </div>
            ) : (
              report.gap_analysis.identified_gaps.map((gap: GapItem, idx: number) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-colors space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-800 text-indigo-300 border border-slate-700">
                        {gap.article_number}
                      </span>
                      <span className="font-semibold text-sm text-white">
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

                  <div className="text-xs text-slate-300">
                    <span className="font-semibold text-slate-400">Obligation: </span>
                    {gap.statutory_obligation}
                  </div>

                  <div className="text-xs text-rose-300/90 bg-rose-950/20 p-2.5 rounded border border-rose-900/30">
                    <span className="font-semibold text-rose-400">Gap Description: </span>
                    {gap.gap_description}
                  </div>

                  {gap.risk_implication && (
                    <div className="text-xs text-amber-300/80">
                      <span className="font-semibold text-amber-400">Risk Implication: </span>
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
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-lg">
        <button
          onClick={() => toggleSection(3)}
          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-800/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Table className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-white">
                {t('analysis.complianceMatrix')}
              </h3>
              <p className="text-xs text-slate-400">
                Article-by-article audit records with evidence citations
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">
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
          <div className="p-5 border-t border-slate-800 overflow-x-auto bg-slate-950/40">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Article</th>
                  <th className="py-2.5 px-3 font-semibold">Title</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 px-3 font-semibold">Confidence</th>
                  <th className="py-2.5 px-3 font-semibold">Statutory Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {report.compliance_matrix?.articles?.map((item: ComplianceItem, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-indigo-300">
                      {item.article_number}
                    </td>
                    <td className="py-3 px-3 font-medium text-white max-w-[200px] truncate">
                      {item.article_title}
                    </td>
                    <td className="py-3 px-3">{getStatusBadge(item.status)}</td>
                    <td className="py-3 px-3 font-mono">
                      {(item.confidence * 100).toFixed(0)}%
                    </td>
                    <td className="py-3 px-3 max-w-sm">
                      <p className="line-clamp-2 text-slate-400 italic">
                        "{item.evidence_excerpt || item.reasoning}"
                      </p>
                      {item.statutory_citation && (
                        <div className="mt-1 flex items-center gap-1 text-[11px] text-indigo-400">
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
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-lg">
        <button
          onClick={() => toggleSection(4)}
          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-800/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-white">
                {t('analysis.correctiveActions')}
              </h3>
              <p className="text-xs text-slate-400">
                Prioritized remediation roadmap to achieve statutory compliance
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400">
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
          <div className="p-5 border-t border-slate-800 space-y-4 bg-slate-950/40">
            {report.corrective_actions?.actions?.map(
              (action: CorrectiveActionItem, idx: number) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-colors space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {getPriorityBadge(action.priority)}
                      <h4 className="font-semibold text-sm text-white">
                        {action.title}
                      </h4>
                    </div>
                    <span className="text-xs font-mono text-indigo-400">
                      Target: {action.target_article}
                    </span>
                  </div>

                  <div className="space-y-1.5 pl-2 border-l-2 border-indigo-500/30">
                    {action.remediation_steps.map((step, sIdx) => (
                      <div key={sIdx} className="text-xs text-slate-300 flex items-start gap-2">
                        <span className="font-mono text-indigo-400 shrink-0">
                          {sIdx + 1}.
                        </span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
                    <div>
                      <span className="text-slate-500">Responsible Entity: </span>
                      <span className="text-slate-300 font-medium">
                        {action.responsible_entity}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Estimated Timeline: </span>
                      <span className="text-slate-300 font-medium font-mono">
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
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-lg">
        <button
          onClick={() => toggleSection(5)}
          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-800/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-white">
                {t('analysis.kpiFramework')}
              </h3>
              <p className="text-xs text-slate-400">
                Key performance indicators, supervisory control metrics, and monitoring intervals
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-400">
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
          <div className="p-5 border-t border-slate-800 space-y-4 bg-slate-950/40">
            {report.kpi_framework?.kpis?.map((kpi: KpiItem, idx: number) => (
              <div
                key={idx}
                className="p-4 rounded-lg bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-colors space-y-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-cyan-400 shrink-0" />
                    <h4 className="font-semibold text-sm text-white">
                      {kpi.kpi_name}
                    </h4>
                  </div>
                  <span className="text-xs font-mono text-cyan-400">
                    {kpi.related_article}
                  </span>
                </div>

                <div className="text-xs text-slate-300">
                  <span className="font-semibold text-slate-400">Control Objective: </span>
                  {kpi.control_objective}
                </div>

                <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800/80 font-mono text-xs text-slate-300">
                  <span className="text-slate-500">Formula: </span>
                  {kpi.metric_formula}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 text-[11px] text-slate-400 border-t border-slate-800/80">
                  <div>
                    <span className="text-slate-500">Frequency: </span>
                    <span className="text-slate-300 font-medium">
                      {kpi.monitoring_frequency}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Role: </span>
                    <span className="text-slate-300 font-medium">
                      {kpi.responsible_role}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Threshold: </span>
                    <span className="text-cyan-300 font-mono font-medium">
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
