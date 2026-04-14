import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI, Type } from '@google/genai';
import { WeatherService } from '../weather/weather.service';
import { FactBundle, buildFacts } from './facts';
import { AnalysisInput, checkAnalysis, CheckReport } from './checker';

export interface AnalysisResponse {
  station: { id: string; name: string };
  range: { from: string; to: string };
  factBundle: FactBundle;
  verdict: 'pass' | 'block' | 'insufficient_data' | 'api_error';
  reasons: string[];
  sentences: Array<{ text: string; factIds: string[] }>;
  raw?: unknown;
}

const SYSTEM_PROMPT = `你是「天氣觀測資料系統」的資料敘述器。根據提供的 facts JSON，產出 3 到 5 句繁體中文敘述。

嚴格規則：
1. 每一句必須引用 facts 中至少一個 fact 的 id（以 factIds 陣列回填）
2. 整體必須引用至少 2 個不同的 fact
3. 僅能描述資料本身（最高溫、最低溫、平均值、降雨日數、日期），不可做任何推論、趨勢判斷、建議、預測、主觀評價
4. 禁用詞彙：趨勢 / 持續 / 預期 / 預測 / 顯著 / 建議 / 應該 / 未來 / 將會 / 可能 / 可能會
5. 引用數字時必須與 facts 的 value 完全一致（最多保留小數點兩位），並加上單位（°C 或 mm）
6. 不可編造 facts 中不存在的資訊
7. text 欄位必須是純粹的繁體中文句子，不得包含括號、factIds、JSON 語法、英文標籤
   - 錯誤範例：「區間內最高溫為 33.3°C (factIds: [\"F3\"])」
   - 正確範例：「區間內最高溫為 33.3°C，出現在 2026-04-12」
   - factIds 只填在 JSON 的 factIds 欄位，不要出現在 text 裡`;

const SCHEMA = {
  type: Type.OBJECT,
  properties: {
    sentences: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
          factIds: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['text', 'factIds'],
      },
    },
  },
  required: ['sentences'],
};

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);
  private readonly client: GoogleGenAI | null;
  private readonly model: string;

  constructor(private readonly weather: WeatherService) {
    const key = process.env.GEMINI_API_KEY;
    this.model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    if (key) {
      this.client = new GoogleGenAI({ apiKey: key });
    } else {
      this.client = null;
      this.logger.warn(
        'GEMINI_API_KEY 未設定；/api/analyze 會回 verdict=api_error',
      );
    }
  }

  async analyze(stationId: string): Promise<AnalysisResponse> {
    const payload = await this.weather.get30DayWeather(stationId);
    const bundle = buildFacts(payload);

    if (!bundle.computable) {
      return {
        station: payload.station,
        range: payload.range,
        factBundle: bundle,
        verdict: 'insufficient_data',
        reasons: ['有效事實數少於 3，不足以產出可信敘述'],
        sentences: [],
      };
    }

    if (!this.client) {
      return {
        station: payload.station,
        range: payload.range,
        factBundle: bundle,
        verdict: 'api_error',
        reasons: ['GEMINI_API_KEY 未設定'],
        sentences: [],
      };
    }

    const userPrompt = `facts:
${JSON.stringify(bundle.facts, null, 2)}

測站：${bundle.stationName}
區間：${bundle.dateRange.from} ~ ${bundle.dateRange.to}

請依規則產出敘述，並以 JSON 回傳。`;

    let raw: unknown;
    let parsed: AnalysisInput;
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
      raw = resp;
      const text = resp.text;
      if (!text) throw new Error('Empty response from Gemini');
      parsed = JSON.parse(text);
    } catch (e: any) {
      this.logger.error(`Gemini call failed: ${e?.message ?? e}`);
      return {
        station: payload.station,
        range: payload.range,
        factBundle: bundle,
        verdict: 'api_error',
        reasons: [`Gemini API 失敗：${e?.message ?? 'unknown'}`],
        sentences: [],
      };
    }

    const report: CheckReport = checkAnalysis(parsed, bundle);

    return {
      station: payload.station,
      range: payload.range,
      factBundle: bundle,
      verdict: report.verdict,
      reasons: report.reasons,
      sentences: report.verdict === 'pass' ? parsed.sentences : [],
      raw,
    };
  }
}
