import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ThumbsUp, ThumbsDown, MessageSquare, Check, Send, AlertCircle, History, Clock } from 'lucide-react'
import { api } from '../api/client'

interface FeedbackWidgetProps {
  analysisId: string
}

interface FeedbackRecord {
  id: number
  finding_key: string
  rating: number
  helpful: boolean
  note: string
  resolution: string
  created_at: string
}

export const FeedbackWidget: React.FC<FeedbackWidgetProps> = ({ analysisId }) => {
  const { t } = useTranslation()
  const [helpful, setHelpful] = useState<boolean | null>(true) // Default to 'Accurate / Approve'
  const [comment, setComment] = useState<string>('')
  const [correctedCitation, setCorrectedCitation] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<FeedbackRecord[]>([])

  const loadFeedbackHistory = async () => {
    if (!analysisId) return
    try {
      const records = await api.getFeedback(analysisId)
      setHistory(records || [])
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadFeedbackHistory()
  }, [analysisId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (helpful === null) {
      setError('Please select whether the report is accurate or has discrepancies before submitting.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setSuccessMessage(null)

    try {
      await api.submitFeedback({
        analysis_id: analysisId,
        target_type: 'REPORT',
        helpful,
        comment: comment.trim() || undefined,
        corrected_citation: correctedCitation.trim() || undefined,
      })
      setSuccessMessage('Auditor review successfully recorded into the statutory audit trail.')
      setComment('')
      setCorrectedCitation('')
      await loadFeedbackHistory()
    } catch (err: any) {
      setError(err.message || 'Failed to submit feedback')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Active Submission Form */}
      <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-sm text-[#151B33] flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#DE1B54]" />
              {t('feedback.title')}
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              {t('feedback.description')}
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-rose-50 text-[#DE1B54] border border-rose-200 font-semibold">
            Human-in-the-Loop Sign-Off
          </span>
        </div>

        {successMessage && (
          <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50 flex items-center gap-3 text-emerald-800 text-xs">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Assessment Verdict Selection */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-2">
              Auditor Verdict:
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setHelpful(true)
                  setError(null)
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold border transition-all ${
                  helpful === true
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-xs ring-1 ring-emerald-300'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <ThumbsUp className="w-4 h-4 text-emerald-600" />
                <span>{t('feedback.helpful')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setHelpful(false)
                  setError(null)
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold border transition-all ${
                  helpful === false
                    ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-xs ring-1 ring-rose-300'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <ThumbsDown className="w-4 h-4 text-rose-600" />
                <span>{t('feedback.unhelpful')}</span>
              </button>
            </div>
          </div>

          {/* Comment / Observations Textarea */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Auditor Review Notes / Statutory Observations:
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t('feedback.feedbackPlaceholder')}
              rows={3}
              className="w-full px-3.5 py-2.5 text-xs rounded-lg bg-white border border-slate-200 focus:border-[#DE1B54] focus:ring-1 focus:ring-[#DE1B54] text-slate-900 placeholder-slate-400 outline-none transition-colors shadow-xs"
            />
          </div>

          {/* Citation Correction (shown when discrepancy flagged or available) */}
          {helpful === false && (
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">
                Statutory Citation Correction (Optional):
              </label>
              <input
                type="text"
                value={correctedCitation}
                onChange={(e) => setCorrectedCitation(e.target.value)}
                placeholder="e.g. Dubai Law No. 1/2016, Article 14 (should be Article 16)"
                className="w-full px-3 py-2 text-xs rounded-lg bg-white border border-slate-200 focus:border-[#DE1B54] text-slate-900 placeholder-slate-400 outline-none shadow-xs"
              />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-xs text-rose-700 p-2.5 rounded bg-rose-50 border border-rose-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-[#DE1B54] hover:bg-[#C21345] disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-xs transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Recording Decision...' : t('feedback.submit')}</span>
          </button>
        </form>
      </div>

      {/* Auditor Review History & Audit Trail */}
      {history.length > 0 && (
        <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="font-semibold text-xs text-[#151B33] flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-600" />
              <span>Recorded Human-in-the-Loop Reviews ({history.length})</span>
            </h5>
            <span className="text-[11px] text-slate-500">Statutory Audit Ledger</span>
          </div>

          <div className="space-y-2.5 pt-1">
            {history.map((record) => (
              <div
                key={record.id}
                className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded text-[11px] font-semibold ${
                        record.helpful
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {record.helpful ? 'Verified Accurate' : 'Discrepancy Flagged'}
                    </span>
                    <span className="text-slate-500 text-[11px] font-mono">
                      Ref #{record.id} • {record.finding_key}
                    </span>
                  </div>
                  {record.note && (
                    <p className="text-slate-700 text-xs pt-1 pl-0.5">
                      {record.note}
                    </p>
                  )}
                </div>

                {record.created_at && (
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 shrink-0 font-mono">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{new Date(record.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

