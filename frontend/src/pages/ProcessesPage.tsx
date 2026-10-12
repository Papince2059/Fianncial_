import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Search,
  Sparkles,
  ChevronDown,
  ChevronUp,
  UserCheck,
  CheckCircle2,
} from 'lucide-react'
import { api } from '../api/client'
import type { ProcessSummary, ProcessDetail } from '../types/api'

export const ProcessesPage: React.FC = () => {
  const { t } = useTranslation()
  const [processes, setProcesses] = useState<ProcessSummary[]>([])
  const [selectedProcess, setSelectedProcess] = useState<ProcessDetail | null>(null)
  const [search, setSearch] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    api
      .listProcesses()
      .then((data) => setProcesses(data))
      .catch((err) => console.error('Failed to load processes', err))
      .finally(() => setLoading(false))
  }, [])

  const handleToggleExpand = async (procId: string) => {
    if (expandedId === procId) {
      setExpandedId(null)
      setSelectedProcess(null)
      return
    }

    setExpandedId(procId)
    try {
      const detail = await api.getProcess(procId)
      setSelectedProcess(detail)
    } catch (e) {
      console.error('Failed to fetch process detail', e)
    }
  }

  const filteredProcesses = processes.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      p.department.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#151B33] tracking-tight">
            {t('processes.title')}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {t('processes.description')}
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('processes.search')}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:border-[#DE1B54] focus:ring-2 focus:ring-[#DE1B54]/15 text-slate-900 placeholder-slate-400 outline-none shadow-xs"
          />
        </div>
      </div>

      {/* Process list */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500 bg-white rounded-xl border border-slate-200">
            Loading government financial processes...
          </div>
        ) : filteredProcesses.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500 bg-white rounded-xl border border-slate-200">
            No processes found matching "{search}".
          </div>
        ) : (
          filteredProcesses.map((p) => {
            const isExpanded = expandedId === p.id
            return (
              <div
                key={p.id}
                className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs hover:shadow-md transition-all"
              >
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-rose-50 text-[#DE1B54] border border-rose-200">
                        {p.code}
                      </span>
                      <h3 className="font-bold text-base text-[#151B33]">
                        {p.name}
                      </h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                        v{p.version}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="text-slate-700 font-semibold">
                        {p.department}
                      </span>
                      <span>•</span>
                      <span>{p.category}</span>
                      <span>•</span>
                      <span className="text-[#DE1B54] font-semibold">
                        {p.step_count} {t('processes.steps')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <Link
                      to={`/analyses/new?process_id=${p.id}`}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#DE1B54] hover:bg-[#C21345] shadow-sm transition-all hover:scale-[1.02]"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{t('processes.runAudit')}</span>
                    </Link>

                    <button
                      onClick={() => handleToggleExpand(p.id)}
                      className="p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                      title={isExpanded ? 'Collapse' : 'Expand'}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded procedural details */}
                {isExpanded && selectedProcess && (
                  <div className="p-5 border-t border-slate-200 bg-slate-50/70 space-y-4">
                    <div className="text-xs text-slate-700 leading-relaxed bg-white p-3.5 rounded-lg border border-slate-200">
                      {selectedProcess.description}
                    </div>

                    {selectedProcess.applicable_laws && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-600 font-semibold">
                          Governing Legal Scope:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedProcess.applicable_laws.map((lawCode, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded text-[11px] font-mono bg-white text-slate-700 border border-slate-200 font-medium"
                            >
                              {lawCode}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Procedural Steps List */}
                    <div className="space-y-3 pt-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#151B33]">
                        Workflow Sequence & Controls
                      </h4>

                      <div className="space-y-2">
                        {selectedProcess.steps?.map((step) => (
                          <div
                            key={step.step_num}
                            className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs space-y-1.5 shadow-2xs"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-[#DE1B54]">
                                  Step {step.step_num}:
                                </span>
                                <span className="font-semibold text-[#151B33]">
                                  {step.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                                <UserCheck className="w-3.5 h-3.5 text-[#DE1B54]" />
                                <span>{step.responsible_role}</span>
                              </div>
                            </div>

                            <p className="text-slate-600 leading-relaxed">
                              {step.description}
                            </p>

                            {step.controls && step.controls.length > 0 && (
                              <div className="pt-1 flex items-start gap-1.5 text-[11px] text-emerald-700 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-600" />
                                <span>Controls: {step.controls.join(', ')}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
