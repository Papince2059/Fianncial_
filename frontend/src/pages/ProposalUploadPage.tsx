import React, { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Upload,
  FileText,
  FileCheck2,
  X,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building2,
  CheckCircle2,
  Info,
  Loader2,
} from 'lucide-react'

interface UploadState {
  file: File | null
  title: string
  description: string
  department: string
  submitting: boolean
  error: string | null
  dragOver: boolean
}

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.txt', '.md']
const MAX_MB = 20

const AGENT_STEPS = [
  { label: 'Research Agent', desc: 'Retrieves matching articles from all Dubai laws' },
  { label: 'Gap Analysis', desc: 'Identifies missing statutory requirements' },
  { label: 'Compliance Status', desc: 'Rates each clause as Compliant / Non-Compliant / Partial' },
  { label: 'Corrective Actions', desc: 'Suggests amendments and required steps' },
  { label: 'KPI Check', desc: 'Verifies performance indicators against statutory benchmarks' },
  { label: 'Review & Cite', desc: 'Cross-references every finding with official article citations' },
]

const LAWS_CHECKED = [
  'Law No. (1) of 2016 — Financial Regulations',
  'EC Resolution No. (5) of 2021 — Implementing Bylaw',
  'Law No. (12) of 2020 — Contracts & Warehouses',
  'Law No. (4) of 2018 — Financial Audit Authority',
  'Law No. (8) of 2022 — Public Debt',
  'Law No. (5) of 1995 — Department of Finance',
  'Law No. (15) of 2025 — General Budget 2026–2028',
]

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileEmoji(name: string) {
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return '📄'
  if (ext === 'docx' || ext === 'doc') return '📝'
  return '📃'
}

export const ProposalUploadPage: React.FC = () => {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<UploadState>({
    file: null,
    title: '',
    description: '',
    department: '',
    submitting: false,
    error: null,
    dragOver: false,
  })

  const set = (patch: Partial<UploadState>) =>
    setState((prev) => ({ ...prev, ...patch }))

  const validateFile = (file: File): string | null => {
    const ext = '.' + (file.name.split('.').pop()?.toLowerCase() || '')
    if (!ALLOWED_EXTENSIONS.includes(ext))
      return `"${ext}" is not supported. Use: PDF, DOCX, TXT, or MD`
    if (file.size > MAX_MB * 1024 * 1024)
      return `File is too large (${formatBytes(file.size)}). Max: ${MAX_MB}MB`
    return null
  }

  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    set({ dragOver: false })
    const file = e.dataTransfer.files[0]
    if (!file) return
    const err = validateFile(file)
    err ? set({ error: err }) : set({ file, error: null })
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const err = validateFile(file)
    err ? set({ error: err, file: null }) : set({ file, error: null })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!state.file) { set({ error: 'Please upload a proposal document first.' }); return }

    set({ submitting: true, error: null })
    const form = new FormData()
    form.append('file', state.file)
    form.append('title', state.title)
    form.append('description', state.description)
    form.append('department', state.department)

    try {
      const res = await fetch('/api/v1/proposals', { method: 'POST', body: form })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail || 'Submission failed')
      }
      const data = await res.json()
      navigate(`/analyses/${data.analysis_id}`)
    } catch (err: any) {
      set({ error: err.message || 'Submission failed. Please try again.', submitting: false })
    }
  }

  return (
    <div className="max-w-4xl mx-auto pb-20 space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#DE1B54] bg-rose-50 border border-rose-200 px-3 py-1 rounded-full">
            <Upload className="w-3.5 h-3.5" />
            Proposal Compliance Review
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#151B33] tracking-tight">
          Submit a Budget or Policy Proposal
        </h1>
        <p className="text-sm text-slate-500 mt-1.5 max-w-2xl">
          Upload any government proposal, budget request, or policy document. The system
          dynamically extracts every clause and checks <strong className="text-[#151B33]">each one</strong> against all enacted
          Dubai financial statutes using a 6-stage AI audit pipeline.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Form ───────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-5">

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); set({ dragOver: true }) }}
            onDragLeave={() => set({ dragOver: false })}
            onDrop={handleFileDrop}
            onClick={() => !state.submitting && fileInputRef.current?.click()}
            className={`
              relative cursor-pointer select-none rounded-2xl border-2 border-dashed p-10 text-center
              transition-all duration-200 shadow-2xs
              ${state.dragOver
                ? 'border-[#DE1B54] bg-rose-50/60 scale-[1.01]'
                : state.file
                  ? 'border-emerald-500 bg-emerald-50/40'
                  : 'border-slate-300 bg-white hover:border-[#DE1B54]/50 hover:bg-slate-50/60'
              }
              ${state.submitting ? 'pointer-events-none opacity-60' : ''}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc,.txt,.md"
              className="hidden"
              onChange={handleFileChange}
              disabled={state.submitting}
            />

            {state.file ? (
              <div className="flex flex-col items-center gap-3">
                <div className="text-5xl">{getFileEmoji(state.file.name)}</div>
                <div>
                  <p className="font-bold text-[#151B33] text-base">{state.file.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{formatBytes(state.file.size)}</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Ready for compliance audit
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); set({ file: null }) }}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-[#DE1B54] transition-colors mt-1 font-medium"
                >
                  <X className="w-3.5 h-3.5" /> Remove file
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-slate-500">
                <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center">
                  <Upload className="w-7 h-7 text-[#DE1B54]" />
                </div>
                <div>
                  <p className="font-bold text-[#151B33] text-base">Drop your proposal here</p>
                  <p className="text-sm mt-0.5 text-slate-500">or click to browse files</p>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  PDF · DOCX · DOC · TXT · MD &nbsp;•&nbsp; Max {MAX_MB}MB
                </p>
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-xs">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#151B33]">
              Proposal Metadata <span className="text-slate-400 font-normal normal-case">(optional but recommended)</span>
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#151B33] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#DE1B54]" />
                  Proposal Title
                </label>
                <input
                  type="text"
                  value={state.title}
                  onChange={(e) => set({ title: e.target.value })}
                  placeholder="Q4 2026 Capital Expenditure Request"
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-[#DE1B54] focus:ring-2 focus:ring-[#DE1B54]/15 text-slate-900 text-sm outline-none placeholder:text-slate-400 transition-all shadow-2xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#151B33] flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#DE1B54]" />
                  Submitting Department
                </label>
                <input
                  type="text"
                  value={state.department}
                  onChange={(e) => set({ department: e.target.value })}
                  placeholder="Roads and Transport Authority"
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-[#DE1B54] focus:ring-2 focus:ring-[#DE1B54]/15 text-slate-900 text-sm outline-none placeholder:text-slate-400 transition-all shadow-2xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#151B33] flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5 text-[#DE1B54]" />
                Brief Description
              </label>
              <textarea
                rows={2}
                value={state.description}
                onChange={(e) => set({ description: e.target.value })}
                placeholder="Describe the purpose of this proposal..."
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-[#DE1B54] focus:ring-2 focus:ring-[#DE1B54]/15 text-slate-900 text-sm outline-none placeholder:text-slate-400 transition-all resize-none shadow-2xs"
              />
            </div>
          </div>

          {/* Error */}
          {state.error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-[#DE1B54] text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{state.error}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={state.submitting || !state.file}
            className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-bold text-sm text-white
              bg-[#DE1B54] hover:bg-[#C21345]
              shadow-lg shadow-[#DE1B54]/20 transition-all hover:scale-[1.01]
              disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {state.submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Uploading & Starting Audit...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Submit for Full Statutory Compliance Audit</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* ── Right: Info sidebar ───────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Agent pipeline */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#DE1B54]" />
              <p className="text-xs font-bold uppercase tracking-widest text-[#151B33]">
                6-Agent Pipeline
              </p>
            </div>
            <div className="space-y-2.5">
              {AGENT_STEPS.map((step, i) => (
                <div key={step.label} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-rose-50 border border-rose-200 text-[#DE1B54] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#151B33]">{step.label}</p>
                    <p className="text-[11px] text-slate-500">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Laws checked */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <p className="text-xs font-bold uppercase tracking-widest text-[#151B33]">
                Laws Checked
              </p>
            </div>
            <div className="space-y-1.5">
              {LAWS_CHECKED.map((law) => (
                <div key={law} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-slate-600 leading-tight">{law}</p>
                </div>
              ))}
            </div>
          </div>

          {/* What gets extracted */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2.5 shadow-xs">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600" />
              <p className="text-xs font-bold uppercase tracking-widest text-[#151B33]">
                Dynamic Extraction
              </p>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              The system auto-detects document structure:
            </p>
            <ul className="space-y-1">
              {[
                'Numbered clauses (1. / a) / (i))',
                'Articles and sections',
                'Heading-delimited blocks',
                'Bullet / list items',
                'Free-form prose sentences',
              ].map((item) => (
                <li key={item} className="text-[11px] text-slate-600 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-slate-500 pt-1">
              Up to <strong className="text-slate-800">50 clauses</strong> per document are checked against all statutory articles.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProposalUploadPage
