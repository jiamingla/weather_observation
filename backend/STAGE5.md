# Stage 5 — AI 分析（受限版）+ Deterministic 規則檢查

把題目要求「AI 分析」做成**雙層防禦**的架構：AI 產生結果後，必須通過後端的 deterministic 規則檢查層才會顯示給使用者。不通過 = 不輸出（fail-closed）。

## 架構

```
POST /api/analyze { stationId }
          │
          ▼
┌──────────────────┐
│ WeatherService   │  取得 30 日 payload（與 /api/weather 同口徑）
└────────┬─────────┘
         ▼
┌──────────────────┐
│ FactsBuilder     │  從 payload 萃取 8 個帶 ID 的事實
└────────┬─────────┘
         │ facts.computable < 3 → 直接 return verdict: 'insufficient_data'
         ▼
┌──────────────────┐
│ Gemini (受限)     │  System prompt + responseSchema + temperature=0
└────────┬─────────┘
         │ 失敗 → verdict: 'api_error'
         ▼
┌──────────────────┐
│ AnalysisChecker  │  Deterministic 規則 R1~R5
└────────┬─────────┘
         │ 任一規則失敗 → verdict: 'block'
         ▼
  verdict: 'pass' + sentences
```

## Facts JSON（受 AI 可用的唯一資訊源）

8 個 fact，每個帶穩定 ID，AI 必須用 ID 回填引用：

| ID | 內容                        | 來源                              |
| --- | --------------------------- | --------------------------------- |
| F1 | 完整資料天數                | `credibility.completeDays`        |
| F2 | 預期天數                    | `range.expectedDays` (= 30)       |
| F3 | 區間內最高溫（日期 + 值）    | `days.maxTemp` 最大值              |
| F4 | 區間內最低溫（日期 + 值）    | `days.minTemp` 最小值              |
| F5 | 近 5 日平均最高溫（最新）    | `metrics.latestMa5`               |
| F6 | 近 20 日平均最高溫（最新）   | `metrics.latestMa20`              |
| F7 | 降雨日數（不含 `"T"` 微量）  | `days.rainfallMm > 0 && !trace` |
| F8 | 單日最大雨量                 | `days.rainfallMm` 最大值           |

**為何只 8 個**：少即是多。事實太多 AI 容易拼湊無意義敘述，也給 deterministic checker 更大的對拍空間。

## System Prompt 的 7 條紀律

詳細在 [analysis.service.ts:11](src/analysis/analysis.service.ts#L11)：

1. 每句必須引用 ≥ 1 個 fact ID
2. 整體必須引用 ≥ 2 個不同 fact
3. 僅能描述資料，不推論、不預測、不建議
4. 禁用詞：趨勢 / 持續 / 預期 / 預測 / 顯著 / 建議 / 應該 / 未來 / 將會 / 可能 / 可能會
5. 數字必須與 facts value 完全一致，需加單位（°C / mm）
6. 不可編造 facts 外資訊
7. `text` 必須是純繁中，不得塞 `factIds` 或 JSON 語法（實測 AI 曾把 `(factIds: ["F1"])` 硬塞進 text，被 checker R4b 擋下）

## Deterministic Checker（[checker.ts](src/analysis/checker.ts)）

| 規則  | 內容                                                      |
| ----- | -------------------------------------------------------- |
| R1    | 每句的 `factIds` 必須非空                                 |
| R2    | 整體至少引用 2 個**不同** fact ID                         |
| R3    | 所有引用的 ID 必須存在於 FactBundle                       |
| R4    | 不得包含禁用詞（11 個推論類詞彙）                          |
| R4b   | 不得包含 `factIds` / `["F` 等 JSON 語法（防 prompt 破口）|
| R5    | 句中「數字+單位」必須在 facts value 中找到（±0.1 容忍）   |

**任一規則失敗** → `verdict: 'block'`，`reasons` 列出所有不過關項目，`sentences` 清空。

**為何要 R5**：題目擔心 AI 幻覺數字。就算 AI 成功引用 F3（33.3°C），也可能在文字裡寫成 33.5°C。R5 用 regex 抓所有「數字+單位」出現並對拍 facts，確保數字與事實一致。

## 四種 Verdict

| verdict              | 觸發條件                                              | UI 行為                                       |
| -------------------- | ---------------------------------------------------- | -------------------------------------------- |
| `pass`               | facts 足夠 + AI 回應 + 規則全過                       | 顯示句子 + 引用 fact 標籤                     |
| `insufficient_data`  | `FactBundle.computable === false`（非 null facts < 3）| 黃色提示「資料不足，不輸出分析」               |
| `api_error`          | Gemini API 失敗 / 超時 / JSON parse 失敗              | 紅色提示「AI 服務失敗」                        |
| `block`              | Gemini 回了但 checker 不過關                          | 紅色提示「未通過可信度檢查」+ 列出 `reasons`   |

**三個非 pass 的狀態都不輸出內容**，使用者看到的是明確的「這次沒有 AI 分析，原因如下」，而不是降級用模板或類似策略。這是題目 (F) 情境題的實作化：**寧可關掉，不要誤導**。

## 真實測試結果（臺北 466920, 2026-04-14）

```
POST /api/analyze { stationId: "466920" }
→ verdict: "pass"
→ sentences:
  1. 區間內最高溫為 33.3°C，出現在 2026-04-12。            [F3]
  2. 區間內最低溫為 14.5°C，出現在 2026-03-15。            [F4]
  3. 此區間共有 10 日有降雨。                                [F7]
  4. 單日最大雨量為 50mm，發生在 2026-04-03。               [F8]
```

檢查：
- 4 個不同 factId 引用（R2 ≥ 2 ✓）
- 33.3 → F3.value = 33.3 ✓（R5 通過）
- 14.5 → F4.value = 14.5 ✓
- 50 → F8.value = 50 ✓
- 10 → 非數字+單位，R5 不檢查（這裡是 F7 的 count）
- 無禁用詞 ✓

## Free tier 選型紀錄

- `gemini-2.5-flash`：第一次呼叫 503 過載
- `gemini-2.0-flash`：回 429 free tier quota = 0（可能是專案未啟用免費額度）
- `gemma-4-31b-it`：**不支援 responseSchema**，回傳含雜訊 → JSON parse fail
- ✅ **`gemini-2.5-flash-lite`**：穩定、免費額度充足、結構化輸出支援完整

教訓：Gemma 系列走 Gemini API 時**不支援 structured output**，必須選 gemini 前綴的 model。

## 對應題目段落

- (A).1 模組 3「AI 分析層（受限版）」→ 對應本 Stage 的全部內容
- (B) AI 分析段 → `AnalysisService` 的 7 條紀律 + 4 verdict = 答案素材
- (D).4「AI 不嚴謹處 + 降低方法」→ 趨勢推論 / 幻覺數字 / text 污染三類攻擊與對應規則
- (D).5「何時不輸出」→ 四個 verdict 有三個不輸出的實作化
- (F) 情境題「AI 仍過度推論」→ 不輸出比輸出錯的少被扣分，與 `block` verdict 吻合

## 下一步（若仍有時間）

- Stage 4：城市輸入自由匹配（對應 A.1 模組 4）
- 前端把 `factBundle.facts` 以表格直接展示，讓使用者對照每一句 AI 引用的事實（已實作於 [AnalysisPanel.vue](../frontend/app/components/AnalysisPanel.vue) 的 `<details>` 區塊）
