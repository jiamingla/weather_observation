<script setup lang="ts">
const stationId = ref('466920')
const { data, loading, error, fetchWeather } = useWeather()
const {
  data: analysis,
  loading: analysisLoading,
  error: analysisError,
  analyze,
  reset: resetAnalysis,
} = useAnalysis()

// 常見測站快捷鍵（非「城市 AI 模糊匹配」— 那是 Stage 4 的事）
const presets = [
  { id: '466920', name: '臺北' },
  { id: '467490', name: '臺中' },
  { id: '467441', name: '高雄' },
  { id: '466990', name: '花蓮' },
  { id: '467480', name: '嘉義' },
]

async function submit() {
  resetAnalysis()
  await fetchWeather(stationId.value)
}

function usePreset(id: string) {
  stationId.value = id
  submit()
}

async function runAnalysis() {
  await analyze(stationId.value)
}

// 首次載入先抓一次（僅客戶端，避免 SSR 打 devProxy 失敗）
onMounted(() => {
  if (import.meta.client) submit()
})
</script>

<template>
  <main class="min-h-screen bg-slate-50 text-slate-800">
    <div class="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <header>
        <h1 class="text-2xl font-bold">天氣觀測資料系統</h1>
        <p class="text-sm text-slate-500 mt-1">
          輸入中央氣象署測站代號，顯示最近 30 天氣象觀測資料與指標
        </p>
      </header>

      <section class="rounded-md border border-slate-200 bg-white p-4 space-y-3">
        <div class="flex flex-wrap gap-2 items-center">
          <label class="text-sm font-medium" for="stationId">測站代號</label>
          <input
            id="stationId"
            v-model="stationId"
            class="border border-slate-300 rounded px-3 py-1.5 text-sm w-40 focus:outline-none focus:ring-1 focus:ring-slate-400"
            placeholder="例：466920"
            @keydown.enter="submit"
          />
          <button
            class="bg-slate-800 text-white text-sm rounded px-4 py-1.5 hover:bg-slate-700 disabled:opacity-50"
            :disabled="loading"
            @click="submit"
          >
            {{ loading ? '查詢中…' : '查詢' }}
          </button>
        </div>

        <div class="flex flex-wrap gap-2 items-center text-xs">
          <span class="text-slate-500">快捷：</span>
          <button
            v-for="p in presets"
            :key="p.id"
            class="rounded-full border border-slate-300 px-3 py-0.5 hover:bg-slate-100"
            @click="usePreset(p.id)"
          >
            {{ p.name }} ({{ p.id }})
          </button>
        </div>
      </section>

      <div v-if="error" class="rounded-md border border-red-300 bg-red-50 text-red-900 px-4 py-3 text-sm">
        查詢失敗：{{ error }}
      </div>

      <template v-if="data">
        <CredibilityPanel :payload="data" />
        <MetricCards :payload="data" />
        <section class="rounded-md border border-slate-200 bg-white p-4">
          <WeatherChart :payload="data" />
        </section>
        <AnalysisPanel
          :data="analysis"
          :loading="analysisLoading"
          :error="analysisError"
          @regenerate="runAnalysis"
        />
      </template>

      <footer class="text-xs text-slate-400 text-center pt-8">
        資料來源：中央氣象署開放資料平台（C-B0024-001 / C-B0025-001）
      </footer>
    </div>
  </main>
</template>
