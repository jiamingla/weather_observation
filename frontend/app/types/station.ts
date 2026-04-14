export interface StationMatchResult {
  stationId: string
  stationName: string
  city: string
  method: 'exact' | 'substring' | 'ai' | 'none'
  confidence: 'high' | 'medium' | 'low'
  message: string
}
