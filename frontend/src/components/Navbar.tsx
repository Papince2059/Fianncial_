import React, { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ShieldCheck,
  LayoutDashboard,
  Layers,
  BookOpen,
  Sparkles,
  Activity,
  Globe,
} from 'lucide-react'

export const Navbar: React.FC = () => {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const [isOnline, setIsOnline] = useState<boolean>(true)

  useEffect(() => {
    // Check backend health
    fetch('/health')
      .then((res) => setIsOnline(res.ok))
      .catch(() => setIsOnline(false))
  }, [])

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'en' ? 'ar' : 'en'
    i18n.changeLanguage(nextLang)
  }

  const navLinks = [
    { to: '/', label: t('nav.dashboard'), icon: LayoutDashboard },
    { to: '/processes', label: t('nav.processes'), icon: Layers },
    { to: '/laws', label: t('nav.laws'), icon: BookOpen },
    { to: '/analyses', label: t('nav.analyses'), icon: Activity },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-950/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight text-white group-hover:text-indigo-400 transition-colors">
                {t('nav.brand')}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                v1.0
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              {t('nav.subtitle')}
            </p>
          </div>
        </Link>

        {/* Navigation items */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((item) => {
            const Icon = item.icon
            const isActive =
              item.to === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.to)
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Right actions: CTA, Language toggle, Online indicator */}
        <div className="flex items-center gap-3">
          <Link
            to="/analyses/new"
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">{t('nav.newAnalysis')}</span>
          </Link>

          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            title="Toggle English / العربية"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
          >
            <Globe className="w-3.5 h-3.5 text-indigo-400" />
            <span>{i18n.language === 'en' ? 'العربية' : 'English'}</span>
          </button>

          {/* Online badge */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-xs text-slate-400"
            title={isOnline ? 'Backend service online' : 'Backend offline'}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isOnline ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-rose-500'
              }`}
            />
            <span className="hidden lg:inline">
              {isOnline ? t('nav.status') : 'Offline'}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
