import type { AnalysisResponse } from '~/types/analysis'

export function useAnalysis() {
  const data = ref<AnalysisResponse | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function analyze(stationId: string) {
    const id = stationId.trim()
    if (!id) return
    loading.value = true
    error.value = null
    try {
      data.value = await $fetch<AnalysisResponse>('/api/analyze', {
        method: 'POST',
        body: { stationId: id },
      })
    } catch (e: any) {
      error.value = e?.data?.message || e?.message || '未知錯誤'
      data.value = null
    } finally {
      loading.value = false
    }
  }

  function reset() {
    data.value = null
    error.value = null
  }

  return { data, loading, error, analyze, reset }
}
