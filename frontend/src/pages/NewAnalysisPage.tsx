import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Sparkles, Shield, Layers, ArrowRight, AlertCircle } from 'lucide-react'
import { api } from '../api/client'
import type { ProcessSummary, LawSummary } from '../types/api'

export const NewAnalysisPage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [processes, setProcesses] = useState<ProcessSummary[]>([])
  const [laws, setLaws] = useState<LawSummary[]>([])
  const [selectedProcessId, setSelectedProcessId] = useState<string>('')
  const [selectedLawId, setSelectedLawId] = useState<string>('')
  const [targetDepth, setTargetDepth] = useState<string>('standard')
  const [loading, setLoading] = useState<boolean>(true)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([api.listProcesses(), api.listLaws()])
      .then(([procData, lawData]) => {
        setProcesses(procData)
        setLaws(lawData)

        // Pre-select if URL has param
        const urlProcessId = searchParams.get('process_id')
        if (urlProcessId && procData.some((p) => p.id === urlProcessId)) {
          setSelectedProcessId(urlProcessId)
        } else if (procData.length > 0) {
          setSelectedProcessId(procData[0].id)
        }

        if (lawData.length > 0) {
          setSelectedLawId(lawData[0].id)
        }
      })
      .catch((err) => console.error('Failed to load options', err))
      .finally(() => setLoading(false))
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProcessId) {
      setError('Please select a financial process to audit')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const res = await api.startAnalysis({
        process_id: selectedProcessId,
        law_id: selectedLawId || undefined,
        target_depth: targetDepth,
      })
      navigate(`/analyses/${res.analysis_id}`)
    } catch (err: any) {
      setError(err.message || 'Failed to start multi-agent analysis')
      setSubmitting(false)
    }
  }

  const selectedProcess = processes.find((p) => p.id === selectedProcessId)

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#151B33] tracking-tight">
          {t('analysis.runAuditTitle')}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure multi-agent parameters and initiate statutory compliance cross-referencing.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6"
      >
        {/* Process Selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-[#151B33] flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-[#DE1B54]" />
            <span>{t('analysis.selectProcess')} *</span>
          </label>
          <select
            value={selectedProcessId}
            onChange={(e) => setSelectedProcessId(e.target.value)}
            disabled={loading || submitting}
            className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-[#DE1B54] focus:ring-2 focus:ring-[#DE1B54]/15 text-slate-900 text-sm outline-none shadow-2xs"
          >
            {processes.map((proc) => (
              <option key={proc.id} value={proc.id}>
                {proc.code} — {proc.name} ({proc.department})
              </option>
            ))}
          </select>
          {selectedProcess && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
              <span>Department: <strong className="text-slate-900">{selectedProcess.department}</strong></span>
              <span>Workflow Steps: <strong className="text-[#DE1B54]">{selectedProcess.step_count}</strong></span>
              <span>Category: <strong className="text-slate-900">{selectedProcess.category}</strong></span>
            </div>
          )}
        </div>

        {/* Target Law Corpus Selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-[#151B33] flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-[#DE1B54]" />
            <span>{t('analysis.selectLaw')}</span>
          </label>
          <select
            value={selectedLawId}
            onChange={(e) => setSelectedLawId(e.target.value)}
            disabled={loading || submitting}
            className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-[#DE1B54] focus:ring-2 focus:ring-[#DE1B54]/15 text-slate-900 text-sm outline-none shadow-2xs"
          >
            <option value="">{t('analysis.allLaws')}</option>
            {laws.map((law) => (
              <option key={law.id} value={law.id}>
                {law.code} — {law.title} ({law.jurisdiction})
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500">
            Selecting a specific statute scopes the legal research to that law's articles and chapters.
          </p>
        </div>

        {/* Audit Depth */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-[#151B33] flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#DE1B54]" />
            <span>{t('analysis.auditDepth')}</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label
              className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                targetDepth === 'standard'
                  ? 'border-[#DE1B54] bg-rose-50/40 shadow-xs ring-1 ring-[#DE1B54]/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="depth"
                value="standard"
                checked={targetDepth === 'standard'}
                onChange={() => setTargetDepth('standard')}
                className="mt-1 accent-[#DE1B54]"
              />
              <div>
                <div className="font-bold text-xs text-[#151B33]">
                  {t('analysis.standard')}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Full 6-agent execution with standard hierarchical RAG retrieval and consensus scoring.
                </div>
              </div>
            </label>

            <label
              className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                targetDepth === 'deep'
                  ? 'border-[#DE1B54] bg-rose-50/40 shadow-xs ring-1 ring-[#DE1B54]/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="depth"
                value="deep"
                checked={targetDepth === 'deep'}
                onChange={() => setTargetDepth('deep')}
                className="mt-1 accent-[#DE1B54]"
              />
              <div>
                <div className="font-bold text-xs text-[#151B33]">
                  {t('analysis.deep')}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Exhaustive cross-referencing with broader context expansion and supervisory review rubric.
                </div>
              </div>
            </label>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-[#DE1B54] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Submit button */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-end">
          <button
            type="submit"
            disabled={submitting || loading}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white bg-[#DE1B54] hover:bg-[#C21345] shadow-md shadow-[#DE1B54]/20 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {submitting ? t('analysis.running') : t('analysis.launch')}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  )
}
