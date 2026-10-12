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
  Upload,
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
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-[#151B33] flex items-center justify-center shadow-md shadow-slate-900/10 group-hover:scale-105 transition-transform relative overflow-hidden">
            <div className="absolute top-0 right-0 w-3 h-3 bg-[#DE1B54] rounded-bl-md" />
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight text-[#151B33] group-hover:text-[#DE1B54] transition-colors">
                {t('nav.brand')}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-50 text-[#DE1B54] border border-rose-200">
                Sutherland
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
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
                    ? 'bg-rose-50 text-[#DE1B54] border border-rose-200 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#DE1B54]' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Right actions: CTA, Language toggle, Online indicator */}
        <div className="flex items-center gap-3">
          <Link
            to="/proposals/upload"
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Upload className="w-4 h-4 text-slate-600" />
            <span className="hidden sm:inline">Upload Proposal</span>
          </Link>

          <Link
            to="/analyses/new"
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold text-white bg-[#DE1B54] hover:bg-[#C21345] shadow-md shadow-rose-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">{t('nav.newAnalysis')}</span>
          </Link>

          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            title="Toggle English / العربية"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-xs"
          >
            <Globe className="w-3.5 h-3.5 text-[#DE1B54]" />
            <span>{i18n.language === 'en' ? 'العربية' : 'English'}</span>
          </button>

          {/* Online badge */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-600"
            title={isOnline ? 'Backend service online' : 'Backend offline'}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isOnline ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50' : 'bg-rose-500'
              }`}
            />
            <span className="hidden lg:inline font-medium">
              {isOnline ? t('nav.status') : 'Offline'}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
