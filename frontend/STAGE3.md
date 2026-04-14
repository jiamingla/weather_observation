# Stage 3 — 前端圖表 + 可信度提示 UI

Nuxt 3 + Pinia + Tailwind + ECharts。顯示 Stage 2 後端產出的 30 天資料與指標，並在 UI 把「可信度」做成視覺優先級最高的元素。

## 啟動

前提：後端已在 3001 啟動（見 [backend/STAGE1.md](../backend/STAGE1.md)）。

```bash
cd frontend
npm install     # 或 pnpm install
npm run dev     # http://localhost:3000
```

Nuxt devProxy 把 `/api/*` 轉到 `http://localhost:3001/api/*`（設定於 [nuxt.config.ts](nuxt.config.ts)），前端都用相對路徑呼叫，不需處理 CORS。

## 頁面結構

```
┌──────────────────────────────────────────────┐
│ 天氣觀測資料系統  (說明)                      │
├──────────────────────────────────────────────┤
│ [測站代號] [查詢]   快捷：臺北 臺中 高雄 …     │
├──────────────────────────────────────────────┤
│ ⚠ CredibilityPanel （視顏色優先級最高）       │
│   - 綠：完整 / 黃：部分缺漏 / 紅：指標不可計算 │
├──────────────────────────────────────────────┤
│ MetricCards （測站 / MA5 / MA20 三張卡）      │
├──────────────────────────────────────────────┤
│ WeatherChart（雙 Y 軸）                        │
│   - 紅線：最高溫、藍線：最低溫                │
│   - 橘虛：近 5 日均高溫                        │
│   - 紫虛：近 20 日均高溫                       │
│   - 青色長條：降雨量（右 Y 軸 mm）             │
└──────────────────────────────────────────────┘
```

## 關鍵設計決策

### 1. 缺漏不內插 — 讓 `null` 自然斷線

ECharts 對 `null` 原生支援：series 資料中的 `null` 會讓線在該點斷開、長條不畫。我刻意設 `connectNulls: false` 關掉自動連接（ECharts 預設會跨 null 連線），確保「資料缺漏」在圖上**視覺上就是缺的**，不會被美化。

👉 對應題目 (D) 「異常值 / 缺漏如何處理」：**後端不補、前端不連**。

### 2. 可信度提示放在圖表**上方**，不是角落小字

使用者在看圖表時如果看不到「這張圖不該被完全相信」的提示，就很可能被誤導。所以 [CredibilityPanel.vue](app/components/CredibilityPanel.vue) 的顏色跟著嚴重程度變：

- 綠底 = 30 天全齊
- 黃底 = 有缺漏但 MA 還能算
- 紅底 = MA 不可計算（視窗含 null）

這是題目 「當發生 X 時，系統應明確提示」的具體落地。

### 3. MA 的數字卡片獨立於圖表

[MetricCards.vue](app/components/MetricCards.vue) 顯示 `latestMa5` / `latestMa20` 的數字 + 「截至哪一天」。當 CWA 昨日資料尚未發布時，這張卡會顯示「截至 2026-04-12」（而非區間末日 04-13），讓使用者知道**指標的新鮮度**。

若指標不可計算，卡片顯示 `—` 與理由字串，絕不顯示 0 或空白。

### 4. 不用 Nuxt UI / Shadcn-vue

原本規畫寫的。最後砍掉，只用 Tailwind primitive。理由：
- 3 小時內多裝一個 UI 套件至少吃 15-20 分鐘（安裝 + 設定 + 看文件）
- 題目沒有要求 UI 精美度
- 原生 Tailwind 已能做出清楚有優先級的排版

## devProxy 的細節

```ts
nitro: {
  devProxy: {
    '/api': {
      target: 'http://localhost:3001/api',
      changeOrigin: true,
    },
  },
}
```

注意 target 結尾**要有** `/api`，且在 composable 中用 `/api/weather` 作為路徑。這樣 `/api/weather` 會被 proxy 成 `http://localhost:3001/api/weather`。

若只寫 `target: 'http://localhost:3001'` 則路徑會變成 `http://localhost:3001/api/weather`（看起來一樣，但 nitro 的 pattern 處理會重複 `/api`，實測時請自行驗證行為）。

## SSR 注意事項

`onMounted(submit)` 會在 SSR 階段執行，但那時 devProxy 尚未介入（Nitro 內部 fetch 不走代理），會失敗。所以改為：

```ts
onMounted(() => {
  if (import.meta.client) submit()
})
```

這個踩雷點可寫進作答文件 (B) 開發紀錄。

## 手動測試 checklist

在瀏覽器打開 http://localhost:3000 ：

- [ ] 首次載入 → 自動查詢臺北（466920）→ 3 秒內看到圖表
- [ ] 可信度面板顯示黃底（04-13 缺漏）
- [ ] MA5 / MA20 卡片顯示有數字，且「截至」日期 ≠ 區間末日
- [ ] 圖表最後一根（04-13）所有系列都有斷線（紅、藍、橘虛、紫虛、雨量長條）
- [ ] 點 「高雄」 快捷按鈕 → 圖表刷新
- [ ] 輸入不存在測站（如 `999999`）→ 紅色錯誤提示，不會白屏

## 下一步

- Stage 4：城市輸入（自由輸入 + AI 模糊匹配 + 白名單護欄）
- Stage 5：AI 分析受限版 + deterministic 規則檢查
