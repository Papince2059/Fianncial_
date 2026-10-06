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
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {t('status.COMPLIANT')}
          </span>
        )
      case 'NON_COMPLIANT':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            {t('status.NON_COMPLIANT')}
          </span>
        )
      case 'PARTIALLY_COMPLIANT':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            {t('status.PARTIALLY_COMPLIANT')}
          </span>
        )
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400">
            {status || 'PENDING'}
          </span>
        )
    }
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Hero / Header banner */}
      <div className="relative rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-slate-900 border border-indigo-500/20 shadow-2xl overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Dubai Public Finance Statutory Intelligence</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            {t('dashboard.title')}
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            {t('dashboard.description')}
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              to="/analyses/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02]"
            >
              <span>{t('nav.newAnalysis')}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/processes"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition-colors"
            >
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>{t('nav.processes')}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Analyses */}
        <div className="glass-panel rounded-xl p-5 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">
              {t('dashboard.totalAnalyses')}
            </span>
            <Activity className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-white font-mono">
            {loading ? '...' : metrics?.total_analyses ?? 0}
          </div>
          <p className="text-xs text-slate-400">
            Monitored financial workflows
          </p>
        </div>

        {/* Compliant Count */}
        <div className="glass-panel rounded-xl p-5 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">
              {t('dashboard.compliantCount')}
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400 font-mono">
            {loading ? '...' : metrics?.compliant_count ?? 0}
          </div>
          <p className="text-xs text-slate-400">
            Zero critical gaps detected
          </p>
        </div>

        {/* Non-Compliant Count */}
        <div className="glass-panel rounded-xl p-5 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">
              {t('dashboard.nonCompliantCount')}
            </span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-extrabold text-rose-400 font-mono">
            {loading ? '...' : (metrics?.non_compliant_count ?? 0) + (metrics?.partially_compliant_count ?? 0)}
          </div>
          <p className="text-xs text-slate-400">
            Requires corrective remediation
          </p>
        </div>

        {/* Mean Confidence */}
        <div className="glass-panel rounded-xl p-5 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">
              {t('dashboard.averageConfidence')}
            </span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-extrabold text-cyan-400 font-mono">
            {loading
              ? '...'
              : `${(((metrics?.average_confidence ?? 0.85)) * 100).toFixed(0)}%`}
          </div>
          <p className="text-xs text-slate-400">
            Hierarchical RAG confidence rubric
          </p>
        </div>
      </div>

      {/* Recent Analyses Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-base text-white">
              {t('dashboard.recentAnalyses')}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Verified statutory compliance audit reports
            </p>
          </div>
          <Link
            to="/analyses"
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            <span>View all</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          {(!metrics?.recent_analyses || metrics.recent_analyses.length === 0) ? (
            <div className="p-8 text-center text-sm text-slate-400 space-y-3">
              <p>{t('dashboard.noAnalyses')}</p>
              <Link
                to="/analyses/new"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold shadow hover:bg-indigo-500"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t('nav.newAnalysis')}</span>
              </Link>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">Process</th>
                  <th className="py-3 px-4 font-semibold">Corpus / Law</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Confidence</th>
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {metrics.recent_analyses.map((analysis: AnalysisSummary) => (
                  <tr
                    key={analysis.id}
                    className="hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-semibold text-white">
                      {analysis.process_name || analysis.process_id}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {analysis.law_name || analysis.law_id || 'All Enacted Laws'}
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(
                        analysis.overall_compliance_status || analysis.status
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      {analysis.confidence_score
                        ? `${(analysis.confidence_score * 100).toFixed(0)}%`
                        : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(analysis.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/analyses/${analysis.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-indigo-400 hover:text-white hover:bg-indigo-600/20 transition-colors"
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
