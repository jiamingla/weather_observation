氣象觀測資料系統 (Weather Monitoring System)
本專案旨在建立一個高效、穩定且具備自動化更新能力的氣象觀測數據平台。採用 NestJS 作為強型別後端核心，並結合 Nuxt.js 實現流暢的前端使用者體驗。

🏗 系統架構設計
系統分為三個主要層級：

資料獲取層 (Data Acquisition)：透過 NestJS Task Scheduling 定期對中央氣象署 (CWA) Open API 發送請求。

邏輯與持久層 (Processing & Persistence)：進行資料清洗（處理 null 值、格式化單位），並將歷史數據存儲於資料庫。

展示層 (Presentation)：Nuxt.js 透過 SSR 獲取最新數據，並利用 ECharts/Chart.js 進行視覺化展示。

🛠 技術棧 (Tech Stack)
後端 (Backend - NestJS)
Framework: NestJS (Node.js)

Task Scheduling: @nestjs/schedule (Cron Jobs)

Data Fetching: @nestjs/axios + rxjs

Validation: class-validator + Zod (用於 API 響應校驗)

Database: PostgreSQL (推薦) 或 MongoDB

前端 (Frontend - Nuxt.js)
Framework: Nuxt 3

State Management: Pinia

Styling: Tailwind CSS + Nuxt UI (或 Shadcn-vue)

Charts: ECharts / Vue-Chartjs

Data Fetching: useFetch / useAsyncData

📂 專案目錄結構預覽
Plaintext
weather-system/
├── backend/                # NestJS 應用
│   ├── src/
│   │   ├── crawler/        # 定時抓取模組
│   │   ├── weather/        # 氣象資料業務邏輯
│   │   │   ├── dto/        # Data Transfer Objects
│   │   │   └── schemas/    # 資料庫 Schema (Prisma/Mongoose)
│   │   └── common/         # 攔截器、過濾器、工具類
├── frontend/               # Nuxt.js 應用
│   ├── components/         # 儀表板組件、圖表組件
│   ├── pages/              # 路由 (主頁、測站詳情)
│   ├── server/             # Nuxt Server Engine (Nitro)
│   └── stores/             # Pinia 全域狀態
└── docker-compose.yml      # 環境容器化配置
🚀 核心功能實現想法
1. 智慧型資料抓取 (NestJS)
頻率控制：根據氣象局 API 更新頻率（如每 10 或 60 分鐘）設定 Cron Job。

錯誤重試機制：若氣象局 API 逾時，系統應具備 Exponential Backoff 重試策略。

資料清洗：

轉換 -999 或 9999 等異常值為 null 或標記。

將測站時間由 UTC 轉換為 Asia/Taipei。

2. 資料展現與互動 (Nuxt.js)
即時狀態卡片：顯示當前溫度、風向、時雨量。

歷史趨勢圖：展示過去 24 小時的氣溫與氣壓變化。

響應式地圖：點擊地圖上的測站圖示可即時跳轉至該站詳細數據。

3. 系統加分項 (Engineering Excellence)
Caching 層：針對頻繁讀取的最新觀測值，在 NestJS 實作 Redis 或內存快取，降低資料庫壓力。

Health Check：提供 /health API 監控系統與外部 API 的連線狀態。

Type Safety：前後端共享 TypeScript Interface，確保數據傳遞零誤差。

📝 後續開發計畫 (Roadmap)
[ ] 初始化 NestJS 專案並整合 Swagger 文件。

[ ] 實作 CWA API 認證與基礎數據抓取 Service。

[ ] 設計資料庫實體 (Entities) 並完成遷移。

[ ] 搭建 Nuxt 基礎架構與導航。

[ ] 實作首頁 Dashboard 圖表與測站列表。

[ ] 完成 Docker 化部署配置。

備註：本計畫書作為工程部考卷之開發藍圖，後續將依據具體題目需求調整業務邏輯。