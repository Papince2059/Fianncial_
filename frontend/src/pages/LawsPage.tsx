import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Search,
  Calendar,
  MapPin,
} from 'lucide-react'
import { api } from '../api/client'
import type { LawSummary, LawDetail } from '../types/api'

export const LawsPage: React.FC = () => {
  const { t } = useTranslation()
  const [laws, setLaws] = useState<LawSummary[]>([])
  const [selectedLaw, setSelectedLaw] = useState<LawDetail | null>(null)
  const [activeTab, setActiveTab] = useState<'articles' | 'definitions'>('articles')
  const [search, setSearch] = useState<string>('')

  useEffect(() => {
    api
      .listLaws()
      .then(async (data) => {
        setLaws(data)
        if (data.length > 0) {
          const detail = await api.getLaw(data[0].id)
          setSelectedLaw(detail)
        }
      })
      .catch((err) => console.error('Failed to load laws', err))
  }, [])

  const handleSelectLaw = async (id: string) => {
    try {
      const detail = await api.getLaw(id)
      setSelectedLaw(detail)
    } catch (err) {
      console.error('Failed to get law detail', err)
    }
  }

  // Filtered articles
  const allArticles = selectedLaw?.chapters?.flatMap((ch) =>
    ch.articles.map((art) => ({
      ...art,
      chapterTitle: ch.title,
      chapterNum: ch.number,
    }))
  ) || []

  const filteredArticles = allArticles.filter(
    (a) =>
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.content.toLowerCase().includes(search.toLowerCase()) ||
      a.article_number.toLowerCase().includes(search.toLowerCase())
  )

  const filteredDefinitions = selectedLaw?.definitions?.filter(
    (d) =>
      d.term.toLowerCase().includes(search.toLowerCase()) ||
      d.definition.toLowerCase().includes(search.toLowerCase())
  ) || []

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#151B33] tracking-tight">
          {t('laws.title')}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {t('laws.description')}
        </p>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left column: Laws selector list */}
        <div className="lg:col-span-1 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
            Enacted Statutes ({laws.length})
          </span>

          <div className="space-y-2">
            {laws.map((law) => {
              const isSelected = selectedLaw?.id === law.id
              return (
                <button
                  key={law.id}
                  onClick={() => handleSelectLaw(law.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-rose-50/70 border-[#DE1B54] shadow-xs text-[#151B33]'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/80'
                  }`}
                >
                  <div className="font-mono text-xs font-bold text-[#DE1B54] mb-1">
                    {law.code}
                  </div>
                  <h4 className="font-bold text-xs leading-snug line-clamp-2 text-[#151B33]">
                    {law.title}
                  </h4>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {law.jurisdiction}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {law.effective_date}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Right column: Statute detail, articles & definitions */}
        <div className="lg:col-span-3 space-y-4">
          {selectedLaw ? (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              {/* Statute metadata banner */}
              <div className="p-5 border-b border-slate-200 bg-slate-50/70 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-rose-50 text-[#DE1B54] border border-rose-200">
                    {selectedLaw.code}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    Jurisdiction: {selectedLaw.jurisdiction}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-[#151B33]">
                  {selectedLaw.title}
                </h2>
                {selectedLaw.title_ar && (
                  <p className="text-sm text-slate-500 font-arabic" dir="rtl">
                    {selectedLaw.title_ar}
                  </p>
                )}
              </div>

              {/* Navigation tabs & search */}
              <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('articles')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === 'articles'
                        ? 'bg-[#DE1B54] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t('laws.articles')} ({allArticles.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('definitions')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === 'definitions'
                        ? 'bg-[#DE1B54] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t('laws.definitions')} ({selectedLaw.definitions?.length || 0})
                  </button>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t('laws.searchArticles')}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-white border border-slate-200 focus:border-[#DE1B54] focus:ring-2 focus:ring-[#DE1B54]/15 text-slate-900 placeholder-slate-400 outline-none"
                  />
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-5 max-h-[600px] overflow-y-auto space-y-4">
                {activeTab === 'articles' ? (
                  filteredArticles.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500">
                      No statutory articles match your search.
                    </div>
                  ) : (
                    filteredArticles.map((art) => (
                      <div
                        key={art.id}
                        className="p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-all space-y-2 shadow-2xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-[#DE1B54]">
                              Article {art.article_number}:
                            </span>
                            <span className="font-bold text-sm text-[#151B33]">
                              {art.title}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {art.breadcrumb_path}
                          </span>
                        </div>

                        {art.title_ar && (
                          <div className="text-xs text-slate-500 font-arabic" dir="rtl">
                            {art.title_ar}
                          </div>
                        )}

                        <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                          {art.content}
                        </p>
                      </div>
                    ))
                  )
                ) : (
                  filteredDefinitions.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500">
                      No definitions match your search.
                    </div>
                  ) : (
                    filteredDefinitions.map((def, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-bold text-xs text-[#151B33]">
                            {def.term}
                          </h4>
                          {def.source_article_num && (
                            <span className="text-[10px] font-mono text-[#DE1B54] font-semibold">
                              Article {def.source_article_num}
                            </span>
                          )}
                        </div>

                        {def.term_ar && (
                          <div className="text-xs text-slate-500 font-arabic" dir="rtl">
                            {def.term_ar}: {def.definition_ar}
                          </div>
                        )}

                        <p className="text-xs text-slate-600 leading-relaxed">
                          {def.definition}
                        </p>
                      </div>
                    ))
                  )
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-sm text-slate-500 bg-white rounded-2xl border border-slate-200">
              Select a statutory law to browse articles.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
