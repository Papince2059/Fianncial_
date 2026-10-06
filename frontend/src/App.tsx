import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { DashboardPage } from './pages/DashboardPage'
import { ProcessesPage } from './pages/ProcessesPage'
import { LawsPage } from './pages/LawsPage'
import { AnalysesListPage } from './pages/AnalysesListPage'
import { NewAnalysisPage } from './pages/NewAnalysisPage'
import { AnalysisDetailPage } from './pages/AnalysisDetailPage'

export const App: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/processes" element={<ProcessesPage />} />
          <Route path="/laws" element={<LawsPage />} />
          <Route path="/analyses" element={<AnalysesListPage />} />
          <Route path="/analyses/new" element={<NewAnalysisPage />} />
          <Route path="/analyses/:id" element={<AnalysisDetailPage />} />
        </Routes>
      </main>

      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            ASCEND Financial Compliance Platform — Hierarchical Multi-Agent RAG
          </div>
          <div className="flex items-center gap-4 text-slate-400">
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
