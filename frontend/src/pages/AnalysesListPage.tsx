import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Sparkles, ChevronRight, Search } from 'lucide-react'
import { api } from '../api/client'
import type { AnalysisSummary } from '../types/api'

export const AnalysesListPage: React.FC = () => {
  const { t } = useTranslation()
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([])
  const [search, setSearch] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    api
      .listAnalyses()
      .then((data) => setAnalyses(data))
      .catch((err) => console.error('Failed to load analyses', err))
      .finally(() => setLoading(false))
  }, [])

  const filtered = analyses.filter(
    (a) =>
      (a.process_name || a.process_id).toLowerCase().includes(search.toLowerCase()) ||
      (a.law_name || a.law_id || '').toLowerCase().includes(search.toLowerCase()) ||
      a.id.toLowerCase().includes(search.toLowerCase())
  )

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
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#151B33] tracking-tight">
            Compliance Audit Dossiers
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Complete archive of statutory cross-referencing audit runs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search audits..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:border-[#DE1B54] focus:ring-1 focus:ring-[#DE1B54] text-slate-900 placeholder-slate-400 outline-none shadow-xs"
            />
          </div>

          <Link
            to="/analyses/new"
            className="shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-[#DE1B54] hover:bg-[#C21345] shadow-sm shadow-rose-500/20"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('nav.newAnalysis')}</span>
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-sm text-slate-500">
              Loading audits...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">
              No audit records found.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-semibold">Audit ID</th>
                  <th className="py-3 px-4 font-semibold">Financial Process</th>
                  <th className="py-3 px-4 font-semibold">Statute Scope</th>
                  <th className="py-3 px-4 font-semibold">Audit Status</th>
                  <th className="py-3 px-4 font-semibold">Confidence</th>
                  <th className="py-3 px-4 font-semibold">Executed Date</th>
                  <th className="py-3 px-4 font-semibold text-right">Dossier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-slate-500">
                      {a.id.slice(0, 8)}...
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[#151B33]">
                      {a.process_name || a.process_id}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {a.law_name && a.law_name !== 'Law No. (1) of 2016'
                        ? a.law_name
                        : 'All Enacted Laws (7 Statutes)'}
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(a.overall_compliance_status || a.status)}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                      {a.confidence_score
                        ? `${(a.confidence_score * 100).toFixed(0)}%`
                        : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(a.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/analyses/${a.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-[#DE1B54] hover:text-[#C21345] hover:bg-rose-50 transition-colors"
                      >
                        <span>View</span>
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
