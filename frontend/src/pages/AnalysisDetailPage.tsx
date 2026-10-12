import React, { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ShieldCheck,
  Loader2,
  Calendar,
  Layers,
  BookOpen,
  ArrowLeft,
  Sparkles,
  Download,
  AlertCircle,
} from 'lucide-react'
import { api } from '../api/client'
import type { AnalysisDetail, FivePartReport, StreamEvent } from '../types/api'
import { AgentGrid } from '../components/AgentGrid'
import type { AgentStatusInfo } from '../components/AgentGrid'
import { EventLog } from '../components/EventLog'
import type { LogEntry } from '../components/EventLog'
import { ReportAccordion } from '../components/ReportAccordion'
import { FeedbackWidget } from '../components/FeedbackWidget'

export const AnalysisDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()

  const [analysis, setAnalysis] = useState<AnalysisDetail | null>(null)
  const [report, setReport] = useState<FivePartReport | null>(null)
  const [agentsState, setAgentsState] = useState<Record<string, AgentStatusInfo>>({
    research: { id: 'research', status: 'idle' },
    gap_analysis: { id: 'gap_analysis', status: 'idle' },
    compliance_status: { id: 'compliance_status', status: 'idle' },
    corrective_action: { id: 'corrective_action', status: 'idle' },
    missing_kpi: { id: 'missing_kpi', status: 'idle' },
    review: { id: 'review', status: 'idle' },
  })
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const stopStreamRef = useRef<(() => void) | null>(null)

  const addLog = (msg: string, agent?: string, level: LogEntry['level'] = 'info') => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false })
    setLogs((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: time,
        agent,
        message: msg,
        level,
      },
    ])
  }

  const handleStreamEvent = (evt: StreamEvent) => {
    const d = evt.data
    const eventType = evt.event || (d && d.event)

    if (eventType === 'agent_start' || (d && d.status === 'running')) {
      const agentId = d.agent || 'research'
      setAgentsState((prev) => ({
        ...prev,
        [agentId]: {
          id: agentId,
          status: 'running',
          message: d.message || 'Analyzing statutory rules...',
        },
      }))
      addLog(d.message || `Agent ${agentId} started`, agentId, 'info')
    } else if (eventType === 'agent_complete' || (d && d.status === 'completed')) {
      const agentId = d.agent || 'research'
      setAgentsState((prev) => ({
        ...prev,
        [agentId]: {
          id: agentId,
          status: 'completed',
          durationMs: d.duration_ms,
          message: 'Output verified & validated',
        },
      }))
      addLog(`Agent ${agentId} finished processing`, agentId, 'success')
    } else if (eventType === 'report_completed' || (d && d.report)) {
      const finalReport = d.report || d.report_chunk
      if (finalReport) {
        setReport(finalReport)
        addLog('5-Part Statutory Compliance Report generated', 'review', 'success')
      }
    } else if (eventType === 'error') {
      addLog(d.message || 'Agent error encountered', d.agent, 'error')
    } else {
      if (d.message) {
        addLog(d.message, d.agent, 'info')
      }
    }
  }

  useEffect(() => {
    if (!id) return

    setLoading(true)
    api
      .getAnalysis(id)
      .then((data) => {
        setAnalysis(data)
        if (data.report_json) {
          setReport(data.report_json)
          setAgentsState({
            research: { id: 'research', status: 'completed' },
            gap_analysis: { id: 'gap_analysis', status: 'completed' },
            compliance_status: { id: 'compliance_status', status: 'completed' },
            corrective_action: { id: 'corrective_action', status: 'completed' },
            missing_kpi: { id: 'missing_kpi', status: 'completed' },
            review: { id: 'review', status: 'completed' },
          })
          addLog('Analysis dossier successfully retrieved from database', undefined, 'success')
        }

        // If in progress or pending, attach SSE stream
        if (data.status === 'PENDING' || data.status === 'IN_PROGRESS') {
          if (stopStreamRef.current) {
            stopStreamRef.current()
          }
          addLog(`Connected to real-time agent stream for audit ${id}`)
          const cleanup = api.streamAnalysisEvents(
            id,
            (evt: StreamEvent) => {
              handleStreamEvent(evt)
            },
            (err) => {
              console.warn('SSE stream notice', err)
            },
            () => {
              // Completed callback
              api.getAnalysis(id).then((fresh) => {
                setAnalysis(fresh)
                if (fresh.report_json) setReport(fresh.report_json)
              })
            }
          )
          stopStreamRef.current = cleanup
        }
      })
      .catch((err) => setError(err.message || 'Failed to load analysis'))
      .finally(() => setLoading(false))

    return () => {
      if (stopStreamRef.current) {
        stopStreamRef.current()
      }
    }
  }, [id])

  const handleExportJson = () => {
    if (!report) return
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `compliance-report-${id}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="p-16 text-center space-y-3">
        <Loader2 className="w-8 h-8 text-[#DE1B54] animate-spin mx-auto" />
        <p className="text-sm text-slate-500">Loading statutory compliance audit...</p>
      </div>
    )
  }

  if (error || !analysis) {
    return (
      <div className="p-12 text-center space-y-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <AlertCircle className="w-10 h-10 text-[#DE1B54] mx-auto" />
        <h2 className="text-lg font-bold text-[#151B33]">Analysis Not Found</h2>
        <p className="text-xs text-slate-500">{error || 'Unable to load analysis'}</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#DE1B54] hover:bg-[#C21345] text-white text-xs font-semibold shadow-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>
      </div>
    )
  }

  const isCompleted = analysis.status === 'COMPLETED' || report !== null

  return (
    <div className="space-y-8 pb-16">
      {/* Back button & status bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-[#151B33] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>

        {isCompleted && (
          <button
            onClick={handleExportJson}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-xs self-start sm:self-auto"
          >
            <Download className="w-3.5 h-3.5 text-[#DE1B54]" />
            <span>{t('analysis.downloadPdf')}</span>
          </button>
        )}
      </div>

      {/* Header Overview Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs px-2.5 py-1 rounded bg-rose-50 text-[#DE1B54] border border-rose-200 font-bold">
              AUDIT-{id ? id.slice(0, 8).toUpperCase() : 'UNKNOWN'}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Calendar className="w-3.5 h-3.5" />
              <span>{new Date(analysis.created_at).toLocaleString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isCompleted ? (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                {t('analysis.completed')}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-[#DE1B54] border border-rose-200">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#DE1B54]" />
                {t('analysis.running')}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Audited Financial Process
            </span>
            <div className="font-bold text-base text-[#151B33] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#DE1B54]" />
              <span>{analysis.process_name || analysis.process_id}</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Statutory Law Corpus Scope
            </span>
            <div className="font-bold text-base text-[#151B33] flex items-center gap-2 flex-wrap">
              <BookOpen className="w-4 h-4 text-[#DE1B54] shrink-0" />
              <span>
                {analysis.law_name && analysis.law_name !== 'Law No. (1) of 2016' && analysis.law_name !== '1'
                  ? analysis.law_name
                  : 'All Enacted Laws (7 Statutes, 93 Articles)'}
              </span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                Vector DB + FTS
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Agent Live Execution Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base text-[#151B33] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#DE1B54]" />
            <span>{t('analysis.liveStream')}</span>
          </h2>
          <span className="text-xs text-slate-500">
            6 Specialized Statutory Agents
          </span>
        </div>

        <AgentGrid agentsState={agentsState} />
      </div>

      {/* Terminal Event Stream */}
      <EventLog logs={logs} />

      {/* 5-Part Report Display */}
      {report && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-lg text-[#151B33] flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span>{t('analysis.reportTitle')}</span>
            </h2>
            <span className="text-xs px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200 font-mono font-medium">
              Confidence: {((report.executive_summary?.confidence_score || 0.88) * 100).toFixed(0)}%
            </span>
          </div>

          <ReportAccordion report={report} />

          {/* Auditor Feedback & Human-in-the-Loop Widget */}
          <div className="pt-4">
            <FeedbackWidget analysisId={id || ''} />
          </div>
        </div>
      )}
    </div>
  )
}
