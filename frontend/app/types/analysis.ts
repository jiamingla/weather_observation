export interface Fact {
  id: string
  label: string
  value: string | number | null
  date?: string | null
}

export interface AnalysisSentence {
  text: string
  factIds: string[]
}

export type AnalysisVerdict = 'pass' | 'block' | 'insufficient_data' | 'api_error'

export interface AnalysisResponse {
  station: { id: string; name: string }
  range: { from: string; to: string }
  factBundle: {
    stationName: string
    dateRange: { from: string; to: string }
    facts: Fact[]
    computable: boolean
  }
  verdict: AnalysisVerdict
  reasons: string[]
  sentences: AnalysisSentence[]
}
