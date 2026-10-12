import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { DashboardPage } from './pages/DashboardPage'
import { ProcessesPage } from './pages/ProcessesPage'
import { LawsPage } from './pages/LawsPage'
import { AnalysesListPage } from './pages/AnalysesListPage'
import { NewAnalysisPage } from './pages/NewAnalysisPage'
import { AnalysisDetailPage } from './pages/AnalysisDetailPage'
import { ProposalUploadPage } from './pages/ProposalUploadPage'

export const App: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50/60 text-slate-800 antialiased selection:bg-[#DE1B54]/20 selection:text-[#DE1B54]">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/processes" element={<ProcessesPage />} />
          <Route path="/laws" element={<LawsPage />} />
          <Route path="/analyses" element={<AnalysesListPage />} />
          <Route path="/analyses/new" element={<NewAnalysisPage />} />
          <Route path="/analyses/:id" element={<AnalysisDetailPage />} />
          <Route path="/proposals/upload" element={<ProposalUploadPage />} />
        </Routes>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-medium text-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-[#DE1B54]"></span>
            <span>ASCEND — Sutherland Statutory Compliance & RegTech Platform</span>
          </div>
          <div className="flex items-center gap-4 text-slate-500">
            <span>Jurisdiction: Dubai Public Financial Laws</span>
            <span>•</span>
            <span>Zero-Cloud Switchable Architecture</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
