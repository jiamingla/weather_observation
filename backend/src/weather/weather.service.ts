import { Injectable, NotFoundException } from '@nestjs/common';
import { CwaClient } from './cwa.client';
import {
  NormalizedDay,
  WeatherPayload,
  parseRainfall,
} from './cwa.schemas';
import { latestValid, rollingAverage } from './metrics';

// 「最近 30 天」定義：以昨日為基準往前取 30 個完整日（含昨日）
// 時區：一律 Asia/Taipei；CWA 回傳的 Date 已是 YYYY-MM-DD 本地日
function computeDateRange(now = new Date()): {
  from: string;
  to: string;
  expectedDays: 30;
} {
  const tz = 'Asia/Taipei';
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const todayLocal = fmt.format(now); // YYYY-MM-DD in Asia/Taipei
  const [y, m, d] = todayLocal.split('-').map(Number);
  const toDate = new Date(Date.UTC(y, m - 1, d - 1)); // 昨日
  const fromDate = new Date(Date.UTC(y, m - 1, d - 30)); // 昨日往前 29 天
  const iso = (x: Date) =>
    `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}-${String(
      x.getUTCDate(),
    ).padStart(2, '0')}`;
  return { from: iso(fromDate), to: iso(toDate), expectedDays: 30 };
}

function enumerateDates(from: string, to: string): string[] {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  const start = Date.UTC(fy, fm - 1, fd);
  const end = Date.UTC(ty, tm - 1, td);
  const out: string[] = [];
  for (let t = start; t <= end; t += 86400000) {
    const dt = new Date(t);
    out.push(
      `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(
        dt.getUTCDate(),
      ).padStart(2, '0')}`,
    );
  }
  return out;
}

@Injectable()
export class WeatherService {
  constructor(private readonly cwa: CwaClient) {}

  async get30DayWeather(stationId: string): Promise<WeatherPayload> {
    const { from, to, expectedDays } = computeDateRange();

    // 並發抓兩個端點
    const [tempRes, rainRes] = await Promise.all([
      this.cwa.fetchTempStats({ stationId, from, to }),
      this.cwa.fetchRainAll({ stationId }),
    ]);

    const tempLoc = tempRes.records.location[0];
    const rainLoc = rainRes.records.location[0];
    if (!tempLoc) {
      throw new NotFoundException(`No temperature data for station ${stationId}`);
    }

    // 建 date -> temp stat 對照
    const tempByDate = new Map<
      string,
      { max: number; min: number; mean: number }
    >();
    for (const d of tempLoc.stationObsStatistics.AirTemperature.daily) {
      tempByDate.set(d.Date, {
        max: d.Maximum,
        min: d.Minimum,
        mean: d.Mean,
      });
    }

    // 雨量：過濾到 from-to 範圍
    const rainByDate = new Map<string, { mm: number | null; trace: boolean }>();
    if (rainLoc) {
      for (const r of rainLoc.stationObsTimes.stationObsTime) {
        if (r.Date < from || r.Date > to) continue;
        rainByDate.set(r.Date, parseRainfall(r.weatherElements.Precipitation));
      }
    }

    // 以預期日期序列為骨架，缺漏記為 null
    const dates = enumerateDates(from, to);
    const tempMissing: string[] = [];
    const rainMissing: string[] = [];
    let traceRainDays = 0;

    const days: NormalizedDay[] = dates.map((date) => {
      const t = tempByDate.get(date);
      const r = rainByDate.get(date);
      if (!t) tempMissing.push(date);
      if (!r) rainMissing.push(date);
      if (r?.trace) traceRainDays += 1;
      return {
        date,
        maxTemp: t?.max ?? null,
        minTemp: t?.min ?? null,
        meanTemp: t?.mean ?? null,
        rainfallMm: r?.mm ?? null,
        rainfallTrace: r?.trace ?? false,
      };
    });

    const missingDates = Array.from(
      new Set([...tempMissing, ...rainMissing]),
    ).sort();
    const completeDays = days.filter(
      (d) => d.maxTemp !== null && d.minTemp !== null && d.rainfallMm !== null,
    ).length;

    // ---- 指標計算（近 5 日 / 近 20 日平均最高溫）----
    const maxTempSeries = days.map((d) => ({
      date: d.date,
      value: d.maxTemp,
    }));
    const ma5MaxTemp = rollingAverage(maxTempSeries, 5);
    const ma20MaxTemp = rollingAverage(maxTempSeries, 20);
    const latestMa5 = latestValid(ma5MaxTemp);
    const latestMa20 = latestValid(ma20MaxTemp);
    const ma5Computable = latestMa5 !== null;
    const ma20Computable = latestMa20 !== null;

    const notes: string[] = [];
    if (tempMissing.length > 0)
      notes.push(`溫度缺漏 ${tempMissing.length} 日`);
    if (rainMissing.length > 0)
      notes.push(`雨量缺漏 ${rainMissing.length} 日`);
    if (traceRainDays > 0)
      notes.push(`其中 ${traceRainDays} 日為微量降雨（"T"，<0.1mm，已計為 0mm）`);
    if (!ma5Computable)
      notes.push('近 5 日平均最高溫無法計算（視窗內有缺漏日）');
    else if (latestMa5 && latestMa5.date !== to)
      notes.push(
        `近 5 日平均最高溫最新可信日為 ${latestMa5.date}（較區間末日 ${to} 延遲）`,
      );
    if (!ma20Computable)
      notes.push('近 20 日平均最高溫無法計算（視窗內有缺漏日或資料不足 20 日）');

    return {
      station: {
        id: tempLoc.station.StationID,
        name: tempLoc.station.StationName,
      },
      range: { from, to, expectedDays },
      days,
      metrics: {
        ma5MaxTemp,
        ma20MaxTemp,
        latestMa5,
        latestMa20,
      },
      credibility: {
        completeDays,
        missingDates,
        tempMissingDates: tempMissing,
        rainMissingDates: rainMissing,
        traceRainDays,
        ma5Computable,
        ma20Computable,
        notes,
      },
    };
  }
}
