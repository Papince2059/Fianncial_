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
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {t('laws.title')}
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          {t('laws.description')}
        </p>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left column: Laws selector list */}
        <div className="lg:col-span-1 space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
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
                      ? 'bg-indigo-600/10 border-indigo-500/50 shadow-md text-white'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="font-mono text-xs font-bold text-indigo-400 mb-1">
                    {law.code}
                  </div>
                  <h4 className="font-semibold text-xs leading-snug line-clamp-2">
                    {law.title}
                  </h4>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      {law.jurisdiction}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-500" />
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
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 shadow-xl overflow-hidden">
              {/* Statute metadata banner */}
              <div className="p-5 border-b border-slate-800 bg-slate-950/40 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {selectedLaw.code}
                  </span>
                  <span className="text-xs text-slate-400">
                    Jurisdiction: {selectedLaw.jurisdiction}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white">
                  {selectedLaw.title}
                </h2>
                {selectedLaw.title_ar && (
                  <p className="text-sm text-slate-400 font-arabic" dir="rtl">
                    {selectedLaw.title_ar}
                  </p>
                )}
              </div>

              {/* Navigation tabs & search */}
              <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('articles')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      activeTab === 'articles'
                        ? 'bg-indigo-600 text-white shadow'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {t('laws.articles')} ({allArticles.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('definitions')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      activeTab === 'definitions'
                        ? 'bg-indigo-600 text-white shadow'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
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
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white placeholder-slate-500 outline-none"
                  />
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-5 max-h-[600px] overflow-y-auto space-y-4">
                {activeTab === 'articles' ? (
                  filteredArticles.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      No statutory articles match your search.
                    </div>
                  ) : (
                    filteredArticles.map((art) => (
                      <div
                        key={art.id}
                        className="p-4 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-indigo-400">
                              Article {art.article_number}:
                            </span>
                            <span className="font-semibold text-sm text-white">
                              {art.title}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {art.breadcrumb_path}
                          </span>
                        </div>

                        {art.title_ar && (
                          <div className="text-xs text-slate-400 font-arabic" dir="rtl">
                            {art.title_ar}
                          </div>
                        )}

                        <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                          {art.content}
                        </p>
                      </div>
                    ))
                  )
                ) : (
                  filteredDefinitions.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      No definitions match your search.
                    </div>
                  ) : (
                    filteredDefinitions.map((def, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-bold text-xs text-indigo-300">
                            {def.term}
                          </h4>
                          {def.source_article_num && (
                            <span className="text-[10px] font-mono text-slate-500">
                              Article {def.source_article_num}
                            </span>
                          )}
                        </div>

                        {def.term_ar && (
                          <div className="text-xs text-slate-400 font-arabic" dir="rtl">
                            {def.term_ar}: {def.definition_ar}
                          </div>
                        )}

                        <p className="text-xs text-slate-300 leading-relaxed">
                          {def.definition}
                        </p>
                      </div>
                    ))
                  )
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-sm text-slate-400">
              Select a statutory law to browse articles.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
