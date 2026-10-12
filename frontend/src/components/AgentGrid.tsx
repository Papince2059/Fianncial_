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
  type LucideIcon,
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

interface AgentConfig {
  id: string
  nameKey: string
  descKey: string
  icon: LucideIcon
  color: string
}

const AGENTS_CONFIG: AgentConfig[] = [
  {
    id: 'research',
    nameKey: 'agents.research',
    descKey: 'agents.researchDesc',
    icon: Search,
    color: 'bg-blue-50 text-blue-600 border-blue-200',
  },
  {
    id: 'gap_analysis',
    nameKey: 'agents.gap_analysis',
    descKey: 'agents.gapAnalysisDesc',
    icon: GitBranch,
    color: 'bg-amber-50 text-amber-600 border-amber-200',
  },
  {
    id: 'compliance_status',
    nameKey: 'agents.compliance_status',
    descKey: 'agents.complianceStatusDesc',
    icon: ShieldAlert,
    color: 'bg-purple-50 text-purple-600 border-purple-200',
  },
  {
    id: 'corrective_action',
    nameKey: 'agents.corrective_action',
    descKey: 'agents.correctiveActionDesc',
    icon: Wrench,
    color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  },
  {
    id: 'missing_kpi',
    nameKey: 'agents.missing_kpi',
    descKey: 'agents.missingKpiDesc',
    icon: Gauge,
    color: 'bg-rose-50 text-[#DE1B54] border-rose-200',
  },
  {
    id: 'review',
    nameKey: 'agents.review',
    descKey: 'agents.reviewDesc',
    icon: CheckCheck,
    color: 'bg-slate-100 text-[#151B33] border-slate-200',
  },
]

export const AgentGrid = ({ agentsState }: AgentGridProps) => {
  const { t } = useTranslation()

  const getStatusBadge = (status: AgentStatusInfo['status']) => {
    switch (status) {
      case 'running':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-[#DE1B54] border border-rose-200">
            <Loader2 className="w-3 h-3 animate-spin text-[#DE1B54]" />
            {t('agents.statusRunning')}
          </span>
        )
      case 'completed':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            {t('agents.statusCompleted')}
          </span>
        )
      case 'error':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            {t('agents.statusError')}
          </span>
        )
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
            <Clock className="w-3 h-3 text-slate-400" />
            {t('agents.statusIdle')}
          </span>
        )
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {AGENTS_CONFIG.map((agent) => {
        const info = agentsState[agent.id] || { id: agent.id, status: 'idle' }
        const Icon = agent.icon
        const isRunning = info.status === 'running'
        const isCompleted = info.status === 'completed'

        return (
          <div
            key={agent.id}
            className={`relative rounded-xl p-4 transition-all duration-300 border shadow-xs ${
              isRunning
                ? 'agent-active border-[#DE1B54] bg-rose-50/30'
                : isCompleted
                ? 'border-emerald-200 bg-white hover:border-emerald-300'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-start justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-lg border ${agent.color}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <h4 className="font-semibold text-sm text-[#151B33]">
                  {t(agent.nameKey)}
                </h4>
              </div>
              {getStatusBadge(info.status)}
            </div>

            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">
              {t(agent.descKey)}
            </p>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <div className="truncate max-w-[180px]">
                {info.message || (isRunning ? 'Processing...' : 'Awaiting input')}
              </div>
              {info.durationMs !== undefined && (
                <div className="font-mono text-slate-500">
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
