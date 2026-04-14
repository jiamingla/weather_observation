<script setup lang="ts">
const stationId = ref('466920')
const locationInput = ref('')
const { data, loading, error, fetchWeather } = useWeather()
const {
  data: analysis,
  loading: analysisLoading,
  error: analysisError,
  analyze,
  reset: resetAnalysis,
} = useAnalysis()
const {
  result: matchResult,
  loading: matchLoading,
  error: matchError,
  match,
  reset: resetMatch,
} = useStationMatch()

// 快捷鈕（不經 AI，直接用 stationId）
const presets = [
  { id: '466920', name: '臺北' },
  { id: '467490', name: '臺中' },
  { id: '467441', name: '高雄' },
  { id: '466990', name: '花蓮' },
  { id: '467480', name: '嘉義' },
]

async function submitStationId() {
  resetAnalysis()
  resetMatch()
  await fetchWeather(stationId.value)
}

function usePreset(id: string) {
  stationId.value = id
  submitStationId()
}

async function runAnalysis() {
  await analyze(stationId.value)
}

// 地名輸入 → 匹配（不直接查詢，讓使用者看到對應結果後再確認）
async function submitLocation() {
  await match(locationInput.value)
}

// 使用者按「採用此測站」才真正換 stationId 並查詢
function acceptMatch() {
  if (!matchResult.value || !matchResult.value.stationId) return
  stationId.value = matchResult.value.stationId
  submitStationId()
}

// 信心度顏色
const matchTone = computed(() => {
  if (!matchResult.value) return ''
  if (matchResult.value.method === 'none') return 'bg-red-50 border-red-300 text-red-900'
  if (matchResult.value.confidence === 'high') return 'bg-emerald-50 border-emerald-300 text-emerald-900'
  if (matchResult.value.confidence === 'medium') return 'bg-amber-50 border-amber-300 text-amber-900'
  return 'bg-amber-50 border-amber-300 text-amber-900'
})

// 首次載入
onMounted(() => {
  if (import.meta.client) submitStationId()
})
</script>

<template>
  <main class="min-h-screen bg-slate-50 text-slate-800">
    <div class="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <header>
        <h1 class="text-2xl font-bold">天氣觀測資料系統</h1>
        <p class="text-sm text-slate-500 mt-1">
          查詢台灣城市 / 地區最近 30 天氣象觀測資料與指標
        </p>
      </header>

      <section class="rounded-md border border-slate-200 bg-white p-4 space-y-4">
        <!-- 地名輸入（AI 模糊匹配） -->
        <div>
          <div class="flex flex-wrap gap-2 items-center">
            <label class="text-sm font-medium" for="locationInput">地名查詢</label>
            <input
              id="locationInput"
              v-model="locationInput"
              class="border border-slate-300 rounded px-3 py-1.5 text-sm w-60 focus:outline-none focus:ring-1 focus:ring-slate-400"
              placeholder="例：屈尺 / 墾丁 / 羅東 / 台北"
              @keydown.enter="submitLocation"
            />
            <button
              class="bg-indigo-600 text-white text-sm rounded px-4 py-1.5 hover:bg-indigo-500 disabled:opacity-50"
              :disabled="matchLoading"
              @click="submitLocation"
            >
              {{ matchLoading ? '對應中…' : '查詢對應測站' }}
            </button>
            <span class="text-xs text-slate-500">
              模糊匹配：先比對測站名 / 別名，找不到才請 AI 推測（需使用者確認）
            </span>
          </div>

          <!-- 匹配結果卡片 -->
          <div v-if="matchError" class="mt-3 rounded border border-red-300 bg-red-50 text-red-900 px-3 py-2 text-sm">
            {{ matchError }}
          </div>

          <div
            v-else-if="matchResult"
            class="mt-3 rounded border px-3 py-3 text-sm space-y-2"
            :class="matchTone"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <span class="text-xs rounded-sm bg-white/60 border border-current/20 px-2 py-0.5">
                    {{
                      matchResult.method === 'exact'
                        ? '精確對應'
                        : matchResult.method === 'substring'
                        ? '部分相符'
                        : matchResult.method === 'ai'
                        ? 'AI 推測'
                        : '無對應'
                    }}
                  </span>
                  <span class="text-xs rounded-sm bg-white/60 border border-current/20 px-2 py-0.5">
                    信心度：{{ matchResult.confidence === 'high' ? '高' : matchResult.confidence === 'medium' ? '中' : '低' }}
                  </span>
                </div>
                <div v-if="matchResult.stationId" class="font-semibold">
                  對應測站：{{ matchResult.stationName }}
                  <span class="text-xs font-normal opacity-70">({{ matchResult.stationId }} · {{ matchResult.city }})</span>
                </div>
                <div class="text-xs opacity-90">{{ matchResult.message }}</div>
              </div>
              <button
                v-if="matchResult.stationId"
                class="shrink-0 rounded bg-slate-800 text-white text-xs px-3 py-1.5 hover:bg-slate-700"
                @click="acceptMatch"
              >
                採用此測站 →
              </button>
            </div>
          </div>
        </div>

        <hr class="border-slate-200" />

        <!-- 測站代號直接輸入 / 快捷 -->
        <div class="space-y-3">
          <div class="flex flex-wrap gap-2 items-center">
            <label class="text-sm font-medium" for="stationId">測站代號</label>
            <input
              id="stationId"
              v-model="stationId"
              class="border border-slate-300 rounded px-3 py-1.5 text-sm w-40 focus:outline-none focus:ring-1 focus:ring-slate-400"
              placeholder="例：466920"
              @keydown.enter="submitStationId"
            />
            <button
              class="bg-slate-800 text-white text-sm rounded px-4 py-1.5 hover:bg-slate-700 disabled:opacity-50"
              :disabled="loading"
              @click="submitStationId"
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
