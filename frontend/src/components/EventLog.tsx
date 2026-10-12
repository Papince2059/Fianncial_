import React, { useEffect, useRef, useState } from 'react'
import { Terminal, ChevronDown, ChevronUp, Pause, Play, Trash2 } from 'lucide-react'

export interface LogEntry {
  id: string
  timestamp: string
  agent?: string
  message: string
  level?: 'info' | 'warn' | 'error' | 'success'
}

interface EventLogProps {
  logs: LogEntry[]
  onClear?: () => void
}

export const EventLog: React.FC<EventLogProps> = ({ logs, onClear }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true)
  const [autoScroll, setAutoScroll] = useState<boolean>(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  const getAgentColor = (agent?: string) => {
    switch (agent) {
      case 'research':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20'
      case 'gap_analysis':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20'
      case 'compliance_status':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/20'
      case 'corrective_action':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
      case 'missing_kpi':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
      case 'review':
        return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
      default:
        return 'text-slate-400 bg-slate-800 border-slate-700'
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-[#151B33] overflow-hidden shadow-xs">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0F1426] border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#DE1B54]" />
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-200">
            Agent Event Stream ({logs.length})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`p-1 rounded text-xs transition-colors ${
              autoScroll ? 'text-[#DE1B54] hover:text-rose-300' : 'text-slate-500'
            }`}
            title={autoScroll ? 'Auto-scroll enabled' : 'Auto-scroll paused'}
          >
            {autoScroll ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          {onClear && (
            <button
              onClick={onClear}
              className="p-1 rounded text-slate-400 hover:text-rose-400 transition-colors"
              title="Clear event logs"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded text-slate-400 hover:text-slate-200 transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Terminal log window */}
      {isExpanded && (
        <div
          ref={scrollRef}
          className="p-3 font-mono text-xs max-h-56 overflow-y-auto space-y-1.5 scrollbar-thin bg-[#151B33]"
        >
          {logs.length === 0 ? (
            <div className="text-slate-600 italic py-2 text-center">
              Awaiting execution events from multi-agent coordinator...
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-2.5 leading-relaxed hover:bg-slate-900/40 px-2 py-0.5 rounded transition-colors"
              >
                <span className="text-slate-500 shrink-0 select-none">
                  {log.timestamp}
                </span>

                {log.agent && (
                  <span
                    className={`text-[10px] uppercase font-semibold px-1.5 py-0.2 rounded border shrink-0 ${getAgentColor(
                      log.agent
                    )}`}
                  >
                    {log.agent}
                  </span>
                )}

                <span
                  className={`break-all ${
                    log.level === 'error'
                      ? 'text-rose-400'
                      : log.level === 'warn'
                      ? 'text-amber-300'
                      : log.level === 'success'
                      ? 'text-emerald-300'
                      : 'text-slate-300'
                  }`}
                >
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
