import { Injectable, Logger } from '@nestjs/common';
import {
  cwaRainResponseSchema,
  cwaTempResponseSchema,
} from './cwa.schemas';

const BASE = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore';

@Injectable()
export class CwaClient {
  private readonly logger = new Logger(CwaClient.name);
  private readonly authKey = process.env.CWA_AUTH_KEY ?? '';

  constructor() {
    if (!this.authKey) {
      this.logger.error('CWA_AUTH_KEY not set in environment');
    }
  }

  // 30 天溫度統計（stationObsStatistics.AirTemperature.daily[]）
  async fetchTempStats(params: {
    stationId: string;
    from: string; // YYYY-MM-DD
    to: string;   // YYYY-MM-DD
  }) {
    const url = new URL(`${BASE}/C-B0024-001`);
    url.searchParams.set('Authorization', this.authKey);
    url.searchParams.set('StationID', params.stationId);
    url.searchParams.set('DataType', 'stationObsStatistics');
    url.searchParams.set('WeatherElement', 'AirTemperature');
    url.searchParams.set('format', 'JSON');
    url.searchParams.set('timeFrom', `${params.from}T00:00:00`);
    url.searchParams.set('timeTo', `${params.to}T23:59:59`);

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`CWA temp fetch failed: ${res.status} ${res.statusText}`);
    }
    const json = await res.json();
    const parsed = cwaTempResponseSchema.safeParse(json);
    if (!parsed.success) {
      this.logger.error(
        `CWA temp schema mismatch: ${parsed.error.message.slice(0, 400)}`,
      );
      throw new Error('CWA response schema mismatch (temperature)');
    }
    return parsed.data;
  }

  // 每日雨量（注意：此 endpoint 會忽略 timeFrom/timeTo，需在呼叫端自行過濾）
  async fetchRainAll(params: { stationId: string }) {
    const url = new URL(`${BASE}/C-B0025-001`);
    url.searchParams.set('Authorization', this.authKey);
    url.searchParams.set('StationID', params.stationId);
    url.searchParams.set('format', 'JSON');

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`CWA rain fetch failed: ${res.status} ${res.statusText}`);
    }
    const json = await res.json();
    const parsed = cwaRainResponseSchema.safeParse(json);
    if (!parsed.success) {
      this.logger.error(
        `CWA rain schema mismatch: ${parsed.error.message.slice(0, 400)}`,
      );
      throw new Error('CWA response schema mismatch (rainfall)');
    }
    return parsed.data;
  }
}
