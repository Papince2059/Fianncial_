import React from 'react'
import { useTranslation } from 'react-i18next'
import {
  Search,
  GitBranch,
  ShieldAlert,
  Wrench,
  Gauge,
  CheckCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
} from 'lucide-react'

export interface AgentStatusInfo {
  id: string
  status: 'idle' | 'running' | 'completed' | 'error'
  durationMs?: number
  message?: string
  tokens?: number
}

interface AgentGridProps {
  agentsState: Record<string, AgentStatusInfo>
}

export const AgentGrid: React.FC<AgentGridProps> = ({ agentsState }) => {
  const { t } = useTranslation()

  const AGENTS_CONFIG = [
    {
      id: 'research',
      nameKey: 'agents.research',
      descKey: 'agents.researchDesc',
      icon: Search,
      color: 'from-blue-600/20 to-blue-500/5 text-blue-400 border-blue-500/30',
    },
    {
      id: 'gap_analysis',
      nameKey: 'agents.gap_analysis',
      descKey: 'agents.gapAnalysisDesc',
      icon: GitBranch,
      color: 'from-amber-600/20 to-amber-500/5 text-amber-400 border-amber-500/30',
    },
    {
      id: 'compliance_status',
      nameKey: 'agents.compliance_status',
      descKey: 'agents.complianceStatusDesc',
      icon: ShieldAlert,
      color: 'from-purple-600/20 to-purple-500/5 text-purple-400 border-purple-500/30',
    },
    {
      id: 'corrective_action',
      nameKey: 'agents.corrective_action',
      descKey: 'agents.correctiveActionDesc',
      icon: Wrench,
      color: 'from-emerald-600/20 to-emerald-500/5 text-emerald-400 border-emerald-500/30',
    },
    {
      id: 'missing_kpi',
      nameKey: 'agents.missing_kpi',
      descKey: 'agents.missingKpiDesc',
      icon: Gauge,
      color: 'from-cyan-600/20 to-cyan-500/5 text-cyan-400 border-cyan-500/30',
    },
    {
      id: 'review',
      nameKey: 'agents.review',
      descKey: 'agents.reviewDesc',
      icon: CheckCheck,
      color: 'from-indigo-600/20 to-indigo-500/5 text-indigo-400 border-indigo-500/30',
    },
  ]

  const getStatusBadge = (status: AgentStatusInfo['status']) => {
    switch (status) {
      case 'running':
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
            <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
            {t('agents.statusRunning')}
          </span>
        )
      case 'completed':
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            {t('agents.statusCompleted')}
          </span>
        )
      case 'error':
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40">
            <AlertCircle className="w-3 h-3 text-rose-400" />
            {t('agents.statusError')}
          </span>
        )
      default:
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            <Clock className="w-3 h-3 text-slate-500" />
            {t('agents.statusIdle')}
          </span>
        )
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {AGENTS_CONFIG.map((agent) => {
        const info = agentsState[agent.id] || { status: 'idle' }
        const Icon = agent.icon
        const isRunning = info.status === 'running'
        const isCompleted = info.status === 'completed'

        return (
          <div
            key={agent.id}
            className={`relative rounded-xl p-4 transition-all duration-300 border ${
              isRunning
                ? 'agent-active border-indigo-500/60 bg-gradient-to-b from-indigo-950/40 to-slate-900/90'
                : isCompleted
                ? 'border-emerald-500/30 bg-slate-900/70'
                : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
            }`}
          >
            <div className="flex items-start justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-lg bg-gradient-to-br border ${agent.color}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <h4 className="font-semibold text-sm text-white">
                  {t(agent.nameKey)}
                </h4>
              </div>
              {getStatusBadge(info.status)}
            </div>

            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-3">
              {t(agent.descKey)}
            </p>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <div className="truncate max-w-[180px]">
                {info.message || (isRunning ? 'Processing...' : 'Awaiting input')}
              </div>
              {info.durationMs !== undefined && (
                <div className="font-mono text-slate-400">
                  {(info.durationMs / 1000).toFixed(1)}s
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
