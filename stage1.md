後端：資料擷取 + Zod 校驗 這一塊完成。

完成清單：

backend/src/weather/cwa.schemas.ts — Zod schemas + parseRainfall 處理 "T" 值
backend/src/weather/cwa.client.ts — CWA API 呼叫器（native fetch）
backend/src/weather/weather.service.ts — 30 天統一化 + 可信度旗標
backend/src/weather/weather.controller.ts — GET /api/weather?stationId=xxx
題目相關的決策亮點（可寫進 (B) 開發紀錄）：

先對 CWA 真實回應再推 schema，發現 "T" 微量雨量這個陷阱 — 如果只看 swagger 寫 z.number() 會整個爛掉
雨量端點忽略 timeFrom/timeTo，需在後端切窗 — 這是 (E) 「來源不一致」的具體案例
今天 04-14，CWA 只有到 04-12 資料，04-13 自動標為缺漏，credibility.missingDates 觸發 — 正是題目要求的「資料筆數不足的提示」