export interface NormalizedDay {
  date: string
  maxTemp: number | null
  minTemp: number | null
  meanTemp: number | null
  rainfallMm: number | null
  rainfallTrace: boolean
}

export interface MaSeriesPoint {
  date: string
  value: number | null
}

export interface WeatherPayload {
  station: {
    id: string
    name: string
  }
  range: {
    from: string
    to: string
    expectedDays: number
  }
  days: NormalizedDay[]
  metrics: {
    ma5MaxTemp: MaSeriesPoint[]
    ma20MaxTemp: MaSeriesPoint[]
    latestMa5: MaSeriesPoint | null
    latestMa20: MaSeriesPoint | null
  }
  credibility: {
    completeDays: number
    missingDates: string[]
    tempMissingDates: string[]
    rainMissingDates: string[]
    traceRainDays: number
    ma5Computable: boolean
    ma20Computable: boolean
    notes: string[]
  }
}
