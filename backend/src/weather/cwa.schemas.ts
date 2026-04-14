import { z } from 'zod';

// CWA 所有數值欄位都是字串，且雨量可能為 "T"（trace，< 0.1mm）
// 遇到 "T" 轉 { mm: 0, isTrace: true }；遇到 "" / "X" / null 視為缺漏（null）

export const dailyTempStatSchema = z.object({
  Date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  Maximum: z.number(),
  Minimum: z.number(),
  Mean: z.number(),
});

export const tempStationSchema = z.object({
  station: z.object({
    StationID: z.string(),
    StationName: z.string(),
    StationNameEN: z.string().optional(),
    StationAttribute: z.string().optional(),
  }),
  stationObsStatistics: z.object({
    AirTemperature: z.object({
      daily: z.array(dailyTempStatSchema),
    }),
  }),
});

export const cwaTempResponseSchema = z.object({
  success: z.string(),
  records: z.object({
    location: z.array(tempStationSchema),
  }),
});

// ---- 雨量 (C-B0025-001) ----

export const dailyRainSchema = z.object({
  Date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weatherElements: z.object({
    Precipitation: z.string(), // 可能為 "0.0" / "3.5" / "T" / ""
  }),
});

export const rainStationSchema = z.object({
  station: z.object({
    StationID: z.string(),
    StationName: z.string(),
  }),
  stationObsTimes: z.object({
    stationObsTime: z.array(dailyRainSchema),
  }),
});

export const cwaRainResponseSchema = z.object({
  success: z.string(),
  records: z.object({
    location: z.array(rainStationSchema),
  }),
});

// ---- 統一輸出型別 ----

export interface NormalizedDay {
  date: string; // YYYY-MM-DD (Asia/Taipei)
  maxTemp: number | null;
  minTemp: number | null;
  meanTemp: number | null;
  rainfallMm: number | null; // null = 缺漏，0 = 無雨或 trace
  rainfallTrace: boolean; // true 若原值為 "T"（微量 <0.1mm）
}

export interface MaSeriesPoint {
  date: string;
  value: number | null;
}

export interface WeatherPayload {
  station: {
    id: string;
    name: string;
  };
  range: {
    from: string; // YYYY-MM-DD inclusive
    to: string;   // YYYY-MM-DD inclusive
    expectedDays: number;
  };
  days: NormalizedDay[];
  metrics: {
    ma5MaxTemp: MaSeriesPoint[];       // 近 5 日平均最高溫（逐日）
    ma20MaxTemp: MaSeriesPoint[];      // 近 20 日平均最高溫（逐日）
    latestMa5: MaSeriesPoint | null;   // 最新可計算的 5 日 MA（供前端數字卡片顯示）
    latestMa20: MaSeriesPoint | null;  // 最新可計算的 20 日 MA
  };
  credibility: {
    completeDays: number;
    missingDates: string[];
    tempMissingDates: string[];
    rainMissingDates: string[];
    traceRainDays: number;
    ma5Computable: boolean;
    ma20Computable: boolean;
    notes: string[];
  };
}

// 解析雨量字串 -> { mm, trace }
export function parseRainfall(raw: string): { mm: number | null; trace: boolean } {
  if (raw === '' || raw == null) return { mm: null, trace: false };
  if (raw === 'T') return { mm: 0, trace: true };
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return { mm: null, trace: false };
  return { mm: n, trace: false };
}
