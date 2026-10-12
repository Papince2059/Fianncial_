import type {
  LawSummary,
  LawDetail,
  ProcessSummary,
  ProcessDetail,
  AnalysisSummary,
  AnalysisDetail,
  DashboardMetrics,
  StreamEvent,
} from '../types/api'

const API_BASE = '/api/v1'

class ApiClient {
  async listLaws(): Promise<LawSummary[]> {
    const res = await fetch(`${API_BASE}/laws`)
    if (!res.ok) throw new Error(`Failed to fetch laws: ${res.statusText}`)
    return res.json()
  }

  async getLaw(id: string): Promise<LawDetail> {
    const res = await fetch(`${API_BASE}/laws/${id}`)
    if (!res.ok) throw new Error(`Failed to fetch law ${id}: ${res.statusText}`)
    return res.json()
  }

  async listProcesses(): Promise<ProcessSummary[]> {
    const res = await fetch(`${API_BASE}/processes`)
    if (!res.ok) throw new Error(`Failed to fetch processes: ${res.statusText}`)
    return res.json()
  }

  async getProcess(id: string): Promise<ProcessDetail> {
    const res = await fetch(`${API_BASE}/processes/${id}`)
    if (!res.ok) throw new Error(`Failed to fetch process ${id}: ${res.statusText}`)
    return res.json()
  }

  async listAnalyses(): Promise<AnalysisSummary[]> {
    const res = await fetch(`${API_BASE}/analyses`)
    if (!res.ok) throw new Error(`Failed to fetch analyses: ${res.statusText}`)
    return res.json()
  }

  async getAnalysis(id: string): Promise<AnalysisDetail> {
    const res = await fetch(`${API_BASE}/analyses/${id}`)
    if (!res.ok) throw new Error(`Failed to fetch analysis ${id}: ${res.statusText}`)
    return res.json()
  }

  async startAnalysis(params: {
    process_id: string
    law_id?: string
    target_depth?: string
  }): Promise<{ analysis_id: string; status: string }> {
    const res = await fetch(`${API_BASE}/analyses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }))
      throw new Error(err.detail || 'Failed to trigger analysis')
    }
    return res.json()
  }

  streamAnalysisEvents(
    analysisId: string,
    onEvent: (event: StreamEvent) => void,
    onError?: (err: any) => void,
    onComplete?: () => void
  ): () => void {
    const eventSource = new EventSource(`${API_BASE}/analyses/${analysisId}/events`)

    eventSource.onmessage = (msg) => {
      try {
        const parsed = JSON.parse(msg.data)
        onEvent({ event: 'message', data: parsed })
        if (parsed.status === 'COMPLETED' || parsed.status === 'FAILED') {
          eventSource.close()
          if (onComplete) onComplete()
        }
      } catch (e) {
        console.error('Failed to parse SSE event data', e)
      }
    }

    eventSource.addEventListener('agent_status', (e: any) => {
      try {
        const parsed = JSON.parse(e.data)
        onEvent({ event: 'agent_status', data: parsed })
      } catch (err) {
        console.error('Failed to parse agent_status event', err)
      }
    })

    eventSource.addEventListener('report_completed', (e: any) => {
      try {
        const parsed = JSON.parse(e.data)
        onEvent({ event: 'report_completed', data: parsed })
        eventSource.close()
        if (onComplete) onComplete()
      } catch (err) {
        console.error('Failed to parse report_completed event', err)
      }
    })

    eventSource.onerror = (err) => {
      if (onError) onError(err)
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }

  async submitFeedback(payload: {
    analysis_id: string
    target_type: string
    target_id?: string
    helpful: boolean
    comment?: string
    corrected_citation?: string
  }): Promise<{ status: string }> {
    const res = await fetch(`${API_BASE}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(`Failed to submit feedback: ${res.statusText}`)
    return res.json()
  }

  async getFeedback(analysisId: string): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE}/analyses/${analysisId}/feedback`)
      if (!res.ok) return []
      return await res.json()
    } catch {
      return []
    }
  }

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const res = await fetch(`${API_BASE}/dashboard/metrics`)
    if (!res.ok) throw new Error(`Failed to fetch dashboard metrics: ${res.statusText}`)
    return res.json()
  }
}

export const api = new ApiClient()
