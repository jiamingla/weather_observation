# 氣象觀測資料系統

給定台灣測站，顯示近 30 天氣象觀測資料、近 5/20 日平均最高溫指標、可信度提示，與受規則約束的 AI 敘述分析。

![demo](./demo.gif)

> 本專案為工程部 AI Coding 實戰任務 (平行考卷一) 的實作成果。完整決策紀錄見 [`平行考卷一：天氣觀測資料系統版.txt`](./平行考卷一：天氣觀測資料系統版.txt) 與 [`AI_USAGE_LOG.txt`](./AI_USAGE_LOG.txt)。

---

## ✨ 功能特點

- **近 30 天觀測資料**：每日最高/最低/平均溫、累積雨量。嚴格處理 CWA 官方未文件化的 `"T"`（trace 微量降雨）值。
- **指標計算**：近 5 日、近 20 日平均最高溫（移動平均），**視窗含任一缺漏日即輸出 null，絕不做部分平均**。
- **可信度旗標**：資料完整度、缺漏日期、指標是否可算 — 在 UI 以綠/黃/紅三級提示。
- **AI 分析受限版**：Gemini 只能引用後端預先算好的 8 個 facts，並經過 6 條 deterministic 規則檢查才顯示；任一不過則 fail-closed 不輸出。
- **地名模糊匹配**：三層策略（字串正規化 → 精確/子串比對 → AI fallback），支援「屈尺」「墾丁」等村里級或別名輸入；白名單強制 + 使用者確認。

---

## 🏗 架構

```
┌──────────────┐   HTTP  ┌─────────────────────────────┐
│ Nuxt 4 (前端) │ ──────▶ │ NestJS 11 (後端)            │
│              │         │                             │
│ ECharts      │         │ /api/weather                │
│ Pinia        │         │   ├─ WeatherService         │
│ Tailwind     │         │   ├─ Zod schema + "T" 處理   │
│              │         │   └─ MA5/MA20 + 可信度旗標   │
│              │         │                             │
│              │         │ /api/analyze                │
│              │         │   ├─ FactsBuilder           │
│              │         │   ├─ Gemini (受限)           │
│              │         │   └─ 6 條 deterministic 規則 │
│              │         │                             │
│              │         │ /api/station/match          │
│              │         │   ├─ 字串正規化 + 子串比對    │
│              │         │   └─ AI fallback + 白名單    │
└──────────────┘         └──────────┬──────────────────┘
                                    ▼
                         ┌─────────────────────────┐
                         │ CWA Open Data API       │
                         │ ├─ C-B0024-001 溫度統計  │
                         │ └─ C-B0025-001 每日雨量  │
                         └─────────────────────────┘
                         ┌─────────────────────────┐
                         │ Google Gemini API       │
                         │ gemini-2.5-flash-lite   │
                         └─────────────────────────┘
```

---

## 🛠 技術棧

**後端** NestJS 11 · Zod · `@google/genai` · Node 22 原生 `fetch`
**前端** Nuxt 4 · Pinia · Tailwind CSS · ECharts · vue-echarts
**AI** Google Gemini 2.5-flash-lite（structured output + schema 強制約束）

**刻意不使用**（詳見作答文件 A.3 / G）：
- PostgreSQL / MongoDB — 單用戶情境不需持久化
- `@nestjs/schedule` Cron Jobs — 無背景定期任務需求
- Redis / 訊息隊列 — 過度設計
- 自動化測試框架 — 改以手動對拍 CWA 官網數字（見 STAGE2.md）
- Nuxt UI / Shadcn-vue — Tailwind primitive 已足夠

---

## 📂 專案結構

```
weather_observation/
├── backend/                    NestJS
│   ├── src/weather/           CWA 資料擷取 + 指標計算
│   │   ├── cwa.schemas.ts      Zod schema + parseRainfall("T")
│   │   ├── cwa.client.ts       兩個 CWA endpoint 呼叫
│   │   ├── metrics.ts          rollingAverage 純函數
│   │   └── weather.service.ts  統一化 30 日 payload
│   ├── src/analysis/          AI 分析受限版
│   │   ├── facts.ts            從 payload 萃取 8 個 facts
│   │   ├── checker.ts          6 條 deterministic 規則
│   │   └── analysis.service.ts Gemini 整合
│   ├── src/station/           地名模糊匹配
│   │   ├── stations.ts         27 個測站白名單 + 別名
│   │   └── station.service.ts  字串 + AI fallback
│   └── STAGE{1,2,4,5}.md       各階段說明
└── frontend/                   Nuxt 4
    ├── app/pages/index.vue    主頁面
    ├── app/components/
    │   ├── WeatherChart.vue    ECharts 走勢圖 + 雙平均線
    │   ├── CredibilityPanel.vue 綠/黃/紅三級可信度
    │   ├── MetricCards.vue     MA5/MA20 數字卡
    │   └── AnalysisPanel.vue   AI 分析 + fact 標籤
    ├── app/composables/        useWeather / useAnalysis / useStationMatch
    └── STAGE3.md               前端說明
```

---

## 🚀 啟動指令

需要：Node.js ≥ 22、npm 或 pnpm，以及兩把 key：

| Key | 取得處 | 用途 |
| --- | --- | --- |
| `CWA_AUTH_KEY` | https://opendata.cwa.gov.tw/userLogin | CWA 氣象資料 |
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey | AI 分析 + 地名模糊匹配 |

### 後端（port 3001）

```bash
cd backend
cp .env.example .env          # 編輯填入兩把 key
npm install
npm run build
node dist/main.js
```

### 前端（port 3000）

```bash
cd frontend
npm install
npm run dev
```

打開 http://localhost:3000 即可使用。

---

## 🔑 關鍵設計決策

1. **指標放在後端算** — 單一事實來源，AI 分析與圖表用同一份數字。
2. **視窗含 null → MA = null** — 不做部分平均，不誤導使用者。
3. **AI 雙層防禦** — 受限生成 + deterministic regex 檢查，fail-closed 不輸出。
4. **不跨源補值** — 溫度（C-B0024-001）與雨量（C-B0025-001）各自判斷，不推論「雨量有所以溫度應該也有」。
5. **Fail-loud** — 任何異常都反映到 `credibility` 欄位，決策邏輯透明給使用者。

---

## 📝 完整文件

- [AI 使用紀錄](./AI_USAGE_LOG.txt) — 9 個具體踩雷與辨識方式
- [backend/STAGE1.md](./backend/STAGE1.md) — 資料擷取
- [backend/STAGE2.md](./backend/STAGE2.md) — 指標計算
- [frontend/STAGE3.md](./frontend/STAGE3.md) — 圖表與可信度 UI
- [backend/STAGE4.md](./backend/STAGE4.md) — 地名模糊匹配
- [backend/STAGE5.md](./backend/STAGE5.md) — AI 分析受限版
