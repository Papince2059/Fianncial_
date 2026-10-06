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
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {t('processes.title')}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
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
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white placeholder-slate-500 outline-none"
          />
        </div>
      </div>

      {/* Process list */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-400">
            Loading government financial processes...
          </div>
        ) : filteredProcesses.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400">
            No processes found matching "{search}".
          </div>
        ) : (
          filteredProcesses.map((p) => {
            const isExpanded = expandedId === p.id
            return (
              <div
                key={p.id}
                className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-lg transition-all"
              >
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {p.code}
                      </span>
                      <h3 className="font-bold text-base text-white">
                        {p.name}
                      </h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                        v{p.version}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span className="text-slate-300 font-medium">
                        {p.department}
                      </span>
                      <span>•</span>
                      <span>{p.category}</span>
                      <span>•</span>
                      <span className="text-indigo-400">
                        {p.step_count} {t('processes.steps')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <Link
                      to={`/analyses/new?process_id=${p.id}`}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow transition-all hover:scale-[1.02]"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{t('processes.runAudit')}</span>
                    </Link>

                    <button
                      onClick={() => handleToggleExpand(p.id)}
                      className="p-2 rounded-lg border border-slate-800 bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
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
                  <div className="p-5 border-t border-slate-800 bg-slate-950/60 space-y-4">
                    <div className="text-xs text-slate-300 leading-relaxed">
                      {selectedProcess.description}
                    </div>

                    {selectedProcess.applicable_laws && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-400 font-medium">
                          Governing Legal Scope:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedProcess.applicable_laws.map((lawCode, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-300 border border-slate-700"
                            >
                              {lawCode}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Procedural Steps List */}
                    <div className="space-y-3 pt-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Workflow Sequence & Controls
                      </h4>

                      <div className="space-y-2">
                        {selectedProcess.steps?.map((step) => (
                          <div
                            key={step.step_num}
                            className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-indigo-400">
                                  Step {step.step_num}:
                                </span>
                                <span className="font-semibold text-white">
                                  {step.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                                <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                                <span>{step.responsible_role}</span>
                              </div>
                            </div>

                            <p className="text-slate-400 leading-relaxed">
                              {step.description}
                            </p>

                            {step.controls && step.controls.length > 0 && (
                              <div className="pt-1 flex items-start gap-1 text-[11px] text-emerald-400/90">
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
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
