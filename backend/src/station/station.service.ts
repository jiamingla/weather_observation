import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI, Type } from '@google/genai';
import {
  MatchResult,
  STATIONS,
  matchStringOnly,
  normalize,
} from './stations';

const SYSTEM_PROMPT = `你是一個地名對應器。使用者會輸入一個台灣地名或模糊的地區名（例如村里、風景區、舊稱），你的任務是從我提供的「合法測站清單」中，選出地理上最接近的一個測站。

嚴格規則：
1. 必須從清單中選一個 stationId（字串）；若使用者輸入明顯不是台灣地名或完全無法判斷，回傳空字串 "" 並在 reason 說明
2. 不得回傳清單中沒有的 stationId
3. 不得編造測站名稱或縣市
4. reason 必須是一句繁體中文，說明為什麼選這個測站（例如「屈尺屬於新北市新店區，最近的測站為板橋」）`;

const SCHEMA = {
  type: Type.OBJECT,
  properties: {
    stationId: { type: Type.STRING },
    reason: { type: Type.STRING },
  },
  required: ['stationId', 'reason'],
};

@Injectable()
export class StationService {
  private readonly logger = new Logger(StationService.name);
  private readonly client: GoogleGenAI | null;
  private readonly model: string;

  constructor() {
    const key = process.env.GEMINI_API_KEY;
    this.model = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
    this.client = key ? new GoogleGenAI({ apiKey: key }) : null;
  }

  listStations() {
    return STATIONS.map((s) => ({
      id: s.id,
      name: s.name,
      city: s.city,
    }));
  }

  async match(input: string): Promise<MatchResult> {
    const raw = input?.trim() ?? '';
    if (!raw) {
      return {
        stationId: '',
        stationName: '',
        city: '',
        method: 'none',
        confidence: 'low',
        message: '請輸入地名或測站名稱',
      };
    }

    // Step 1: 字串比對（快、無成本、可驗證）
    const stringHit = matchStringOnly(raw);
    if (stringHit) return stringHit;

    // Step 2: AI fallback（受限：回傳值必須在白名單內）
    if (!this.client) {
      return {
        stationId: '',
        stationName: '',
        city: '',
        method: 'none',
        confidence: 'low',
        message: `找不到「${raw}」對應的測站（AI 未啟用，無法模糊匹配）`,
      };
    }

    const whitelist = STATIONS.map(
      (s) =>
        `- id=${s.id}, name=${s.name}, city=${s.city}` +
        (s.aliases ? ` (別名: ${s.aliases.join(', ')})` : ''),
    ).join('\n');

    const userPrompt = `使用者輸入：「${raw}」

合法測站清單（只能從這些中選）：
${whitelist}

請選出地理上最接近的一個 stationId，並簡短說明理由。`;

    let stationId = '';
    let reason = '';
    try {
      const resp = await this.client.models.generateContent({
        model: this.model,
        contents: userPrompt,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          temperature: 0,
          responseMimeType: 'application/json',
          responseSchema: SCHEMA,
        },
      });
      const text = resp.text;
      if (!text) throw new Error('Empty response');
      const parsed = JSON.parse(text);
      stationId = String(parsed.stationId ?? '').trim();
      reason = String(parsed.reason ?? '').trim();
    } catch (e: any) {
      this.logger.error(`Gemini match failed: ${e?.message ?? e}`);
      return {
        stationId: '',
        stationName: '',
        city: '',
        method: 'none',
        confidence: 'low',
        message: `AI 匹配失敗：${e?.message ?? 'unknown'}`,
      };
    }

    // 白名單護欄：AI 可能幻覺 ID
    const station = STATIONS.find((s) => s.id === stationId);
    if (!station) {
      return {
        stationId: '',
        stationName: '',
        city: '',
        method: 'none',
        confidence: 'low',
        message: `AI 回傳的 stationId「${stationId}」不在白名單內，拒絕使用${reason ? `（AI 理由：${reason}）` : ''}`,
      };
    }

    return {
      stationId: station.id,
      stationName: station.name,
      city: station.city,
      method: 'ai',
      confidence: 'low',
      message: `AI 推測「${raw}」最接近測站「${station.name}」（${station.city}）。理由：${reason}。請確認是否採用。`,
    };
  }
}
