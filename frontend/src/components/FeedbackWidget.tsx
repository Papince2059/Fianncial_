import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ThumbsUp, ThumbsDown, MessageSquare, Check, Send, AlertCircle } from 'lucide-react'
import { api } from '../api/client'

interface FeedbackWidgetProps {
  analysisId: string
}

export const FeedbackWidget: React.FC<FeedbackWidgetProps> = ({ analysisId }) => {
  const { t } = useTranslation()
  const [helpful, setHelpful] = useState<boolean | null>(null)
  const [comment, setComment] = useState<string>('')
  const [correctedCitation, setCorrectedCitation] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (helpful === null) return

    setIsSubmitting(true)
    setError(null)

    try {
      await api.submitFeedback({
        analysis_id: analysisId,
        target_type: 'REPORT',
        helpful,
        comment: comment.trim() || undefined,
        corrected_citation: correctedCitation.trim() || undefined,
      })
      setIsSubmitted(true)
    } catch (err: any) {
      setError(err.message || 'Failed to submit feedback')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 flex items-center gap-3 text-emerald-300">
        <div className="p-2 rounded-full bg-emerald-500/20 text-emerald-400">
          <Check className="w-5 h-5" />
        </div>
        <div>
          <div className="font-semibold text-sm">{t('feedback.submitted')}</div>
          <p className="text-xs text-emerald-400/80">
            Your expert review feedback was recorded and will guide system calibration.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 shadow-lg space-y-4">
      <div>
        <h4 className="font-semibold text-sm text-white flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-400" />
          {t('feedback.title')}
        </h4>
        <p className="text-xs text-slate-400 mt-1">
          {t('feedback.description')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Thumbs up / down selection */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setHelpful(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border transition-all ${
              helpful === true
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-500/20'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
            }`}
          >
            <ThumbsUp className="w-4 h-4" />
            <span>{t('feedback.helpful')}</span>
          </button>

          <button
            type="button"
            onClick={() => setHelpful(false)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border transition-all ${
              helpful === false
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-sm shadow-rose-500/20'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
            }`}
          >
            <ThumbsDown className="w-4 h-4" />
            <span>{t('feedback.unhelpful')}</span>
          </button>
        </div>

        {/* Comment textarea */}
        <div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t('feedback.feedbackPlaceholder')}
            rows={2}
            className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-200 placeholder-slate-500 outline-none"
          />
        </div>

        {/* Optional citation correction field */}
        {helpful === false && (
          <div>
            <label className="text-[11px] font-medium text-slate-400 block mb-1">
              Statutory Citation Correction (Optional)
            </label>
            <input
              type="text"
              value={correctedCitation}
              onChange={(e) => setCorrectedCitation(e.target.value)}
              placeholder="e.g. Dubai Law No. 1/2016, Article 14 (should be Article 16)"
              className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-800 focus:border-indigo-500 text-slate-200 placeholder-slate-500 outline-none"
            />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-xs text-rose-400">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={helpful === null || isSubmitting}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow transition-all"
        >
          <Send className="w-3.5 h-3.5" />
          <span>{isSubmitting ? 'Submitting...' : t('feedback.submit')}</span>
        </button>
      </form>
    </div>
  )
}
