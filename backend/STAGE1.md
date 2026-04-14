# Stage 1 — 後端資料擷取 + Zod 校驗

這個階段完成題目「資料蒐集」模組。給定 CWA 測站代號，回傳正規化後的 30 天觀測資料（含可信度旗標）。

## 架構

```
client ─HTTP→ NestJS (port 3001)
                ├─ WeatherController  (/api/weather)
                ├─ WeatherService     (合併溫度 + 雨量、補缺漏、產可信度旗標)
                └─ CwaClient          (fetch CWA + Zod 校驗)
                        │
                        ├─ C-B0024-001  30 天觀測統計（每日 Max/Min/Mean 氣溫）
                        └─ C-B0025-001  每日雨量
```

## 環境需求

- Node.js 22+
- pnpm 11+
- CWA 開放資料平台授權碼（`CWA-XXXXXXXX-...`）
  - 申請處：https://opendata.cwa.gov.tw/userLogin

## 啟動

```bash
cd backend

# 1. 複製環境變數範本並填入授權碼
cp .env.example .env
# 編輯 .env，填入真實 CWA_AUTH_KEY

# 2. 安裝依賴
pnpm install

# 3. 建置
pnpm build

# 4. 啟動（port 3001）
node dist/main.js
# 或開發模式
pnpm start:dev
```

啟動成功後會看到：

```
Backend listening on http://localhost:3001
```

## API

### `GET /api/weather?stationId=<ID>`

| 參數        | 必填 | 說明                                     |
| ----------- | ---- | ---------------------------------------- |
| `stationId` | ✅   | CWA 測站代號，例如 `466920`（臺北氣象站）|

測站代號清單：https://hdps.cwa.gov.tw/static/state.html

### 範例

```bash
curl "http://localhost:3001/api/weather?stationId=466920"
```

### 回應 Schema

```ts
{
  station: {
    id: string;          // "466920"
    name: string;        // "臺北"
  },
  range: {
    from: string;        // "2026-03-15" (YYYY-MM-DD, Asia/Taipei)
    to: string;          // "2026-04-13"
    expectedDays: 30;
  },
  days: Array<{
    date: string;        // "2026-03-15"
    maxTemp: number | null;
    minTemp: number | null;
    meanTemp: number | null;
    rainfallMm: number | null;   // null = 缺漏；0 = 無雨 or 微量
    rainfallTrace: boolean;      // true 代表原值為 "T"（<0.1mm）
  }>,
  credibility: {
    completeDays: number;        // 溫度+雨量皆齊全的天數
    missingDates: string[];      // 任一欄位缺漏的日期
    tempMissingDates: string[];
    rainMissingDates: string[];
    traceRainDays: number;       // "T" 微量降雨天數
    notes: string[];             // 中文摘要，可直接顯示給使用者
  }
}
```

## 關鍵決策與踩雷紀錄

### 1. 為什麼不用 CODiS 爬蟲

CWA 官方 REST API 在 swagger 的第 7099 行就有 **`C-B0024-001` 30 天觀測資料**，完全符合需求。一開始因為 Google 搜尋結果都指向 codis SPA，誤以為要爬 HTML。**結論**：別太快相信搜尋引擎摘要，直接打 swagger 原始檔（`/apidoc/v1`）才準。

### 2. `"T"` 雨量值 — Zod 救了一命

雨量欄位型別是 `string`，但值除了 `"0.0"`、`"3.5"` 這種數字外，還會出現 `"T"`（trace，微量 <0.1mm）。若直接 `parseFloat("T")` 得到 `NaN`，後面計算全炸。這種 edge case **swagger 文件完全沒寫**，只有打真實 API 才看得到。

處理方式（[cwa.schemas.ts:67](src/weather/cwa.schemas.ts#L67) `parseRainfall`）：
- `""` / `null` → `{ mm: null, trace: false }` 視為缺漏
- `"T"` → `{ mm: 0, trace: true }` 繪圖計為 0 但旗標保留
- 數字字串 → `{ mm: Number(raw), trace: false }`

這也是作答文件 (A).4 中寫到「不讓 AI 碰原始 API」的實例 — AI 看 swagger 寫 schema 一定會用 `z.number()`，就爛掉。

### 3. 每日雨量端點不支援時間篩選

`C-B0025-001` 收到 `timeFrom` / `timeTo` 會直接忽略，回傳全部歷史資料（可能超過一整年）。因此在 [weather.service.ts:82](src/weather/weather.service.ts#L82) 需要手動過濾到 30 天窗。這是 (E) 「來源不一致」的具體案例。

### 4. 「最近 30 天」定義

CWA 今日資料通常尚未發布（例：今天 04-14，最新資料只到 04-12）。定義：**以昨日為基準往前取 30 個完整日**（[weather.service.ts:10](src/weather/weather.service.ts#L10) `computeDateRange`）。

CWA 實際缺的日子會被自動列入 `credibility.missingDates` 並在 `notes` 中註明。

### 5. 時區

所有日期一律以 `Asia/Taipei` 處理。CWA 回傳的 `Date` 欄位已是本地日（無時區）；`DateTime` 欄位帶 `+08:00`。前端不再做時區轉換。

## 測試（手動）

後端啟動後：

```bash
# 臺北
curl -s "http://localhost:3001/api/weather?stationId=466920" | python -m json.tool

# 高雄
curl -s "http://localhost:3001/api/weather?stationId=467441" | python -m json.tool

# 臺中
curl -s "http://localhost:3001/api/weather?stationId=467490" | python -m json.tool
```

驗證方式：把 `days[0].date` 到 `days[29].date` 任一日對拍 CWA 官網 https://codis.cwa.gov.tw/ 的數字，應完全一致。

## 已知限制

- 單次查詢必須傳 `stationId`，尚未做「縣市名稱 → 測站」對應（下階段處理）
- 無快取（刻意不做，單用戶情境用不到，見規劃 A.2.6）
- 無自動化測試（刻意不做，見規劃 A.3 與 A.1 註記）

## 下一步

- Stage 2：指標計算（近 5 日 / 近 20 日平均最高溫）
- Stage 3：前端走勢圖 + 可信度提示 UI
- Stage 4：城市輸入（自由輸入 + AI 模糊匹配 + 白名單護欄）
- Stage 5：AI 分析受限版 + deterministic 規則檢查
