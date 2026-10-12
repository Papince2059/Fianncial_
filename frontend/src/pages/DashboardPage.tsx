import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ShieldCheck,
  ShieldAlert,
  Activity,
  Layers,
  Sparkles,
  ArrowRight,
  ChevronRight,
  TrendingUp,
} from 'lucide-react'
import { api } from '../api/client'
import type { DashboardMetrics, AnalysisSummary } from '../types/api'

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation()
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    api
      .getDashboardMetrics()
      .then((data) => setMetrics(data))
      .catch((err) => console.error('Failed to load dashboard metrics', err))
      .finally(() => setLoading(false))
  }, [])

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'COMPLIANT':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            {t('status.COMPLIANT')}
          </span>
        )
      case 'NON_COMPLIANT':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            {t('status.NON_COMPLIANT')}
          </span>
        )
      case 'PARTIALLY_COMPLIANT':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            {t('status.PARTIALLY_COMPLIANT')}
          </span>
        )
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            {status || 'PENDING'}
          </span>
        )
    }
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Hero / Header banner */}
      <div className="relative rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-[#151B33] via-[#1E2540] to-[#151B33] border border-slate-200 shadow-xl overflow-hidden text-white">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#DE1B54]/20 via-transparent to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs border border-white/15 text-xs font-semibold text-rose-200">
            <span className="w-2 h-2 rounded-full bg-[#DE1B54] animate-pulse"></span>
            <span>Dubai Public Finance Statutory Intelligence</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            {t('dashboard.title')}
          </h1>
          <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
            {t('dashboard.description')}
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              to="/analyses/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-white bg-[#DE1B54] hover:bg-[#C21345] shadow-lg shadow-rose-900/30 transition-all hover:scale-[1.02]"
            >
              <span>{t('nav.newAnalysis')}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/processes"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-white bg-white/10 hover:bg-white/15 border border-white/20 transition-colors"
            >
              <Layers className="w-4 h-4 text-rose-300" />
              <span>{t('nav.processes')}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Analyses */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {t('dashboard.totalAnalyses')}
            </span>
            <Activity className="w-4 h-4 text-[#DE1B54]" />
          </div>
          <div className="text-3xl font-extrabold text-[#151B33] font-mono">
            {loading ? '...' : metrics?.total_analyses ?? 0}
          </div>
          <p className="text-xs text-slate-500">
            Monitored financial workflows
          </p>
        </div>

        {/* Compliant Count */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {t('dashboard.compliantCount')}
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-600 font-mono">
            {loading ? '...' : metrics?.compliant_count ?? 0}
          </div>
          <p className="text-xs text-slate-500">
            Zero critical gaps detected
          </p>
        </div>

        {/* Non-Compliant Count */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {t('dashboard.nonCompliantCount')}
            </span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-3xl font-extrabold text-rose-600 font-mono">
            {loading ? '...' : (metrics?.non_compliant_count ?? 0) + (metrics?.partially_compliant_count ?? 0)}
          </div>
          <p className="text-xs text-slate-500">
            Requires corrective remediation
          </p>
        </div>

        {/* Mean Confidence */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {t('dashboard.averageConfidence')}
            </span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-3xl font-extrabold text-blue-600 font-mono">
            {loading
              ? '...'
              : `${(((metrics?.average_confidence ?? 0.85)) * 100).toFixed(0)}%`}
          </div>
          <p className="text-xs text-slate-500">
            Hierarchical RAG confidence rubric
          </p>
        </div>
      </div>

      {/* Recent Analyses Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white">
          <div>
            <h3 className="font-semibold text-base text-[#151B33]">
              {t('dashboard.recentAnalyses')}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified statutory compliance audit reports
            </p>
          </div>
          <Link
            to="/analyses"
            className="text-xs font-semibold text-[#DE1B54] hover:text-[#C21345] flex items-center gap-1"
          >
            <span>View all</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          {(!metrics?.recent_analyses || metrics.recent_analyses.length === 0) ? (
            <div className="p-8 text-center text-sm text-slate-500 space-y-3">
              <p>{t('dashboard.noAnalyses')}</p>
              <Link
                to="/analyses/new"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#DE1B54] text-white text-xs font-semibold shadow hover:bg-[#C21345]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t('nav.newAnalysis')}</span>
              </Link>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-semibold">Process</th>
                  <th className="py-3 px-4 font-semibold">Corpus / Law</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Confidence</th>
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {metrics.recent_analyses.map((analysis: AnalysisSummary) => (
                  <tr
                    key={analysis.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-semibold text-[#151B33]">
                      {analysis.process_name || analysis.process_id}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {analysis.law_name && analysis.law_name !== 'Law No. (1) of 2016'
                        ? analysis.law_name
                        : 'All Enacted Laws (7 Statutes)'}
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(
                        analysis.overall_compliance_status || analysis.status
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                      {analysis.confidence_score
                        ? `${(analysis.confidence_score * 100).toFixed(0)}%`
                        : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(analysis.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/analyses/${analysis.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-[#DE1B54] hover:text-[#C21345] hover:bg-rose-50 transition-colors"
                      >
                        <span>View Dossier</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
