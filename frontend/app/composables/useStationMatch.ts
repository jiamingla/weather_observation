import type { StationMatchResult } from '~/types/station'

export function useStationMatch() {
  const result = ref<StationMatchResult | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function match(input: string) {
    const q = input.trim()
    if (!q) {
      error.value = '請輸入地名'
      result.value = null
      return null
    }
    loading.value = true
    error.value = null
    try {
      const res = await $fetch<StationMatchResult>('/api/station/match', {
        method: 'POST',
        body: { input: q },
      })
      result.value = res
      return res
    } catch (e: any) {
      error.value = e?.data?.message || e?.message || '未知錯誤'
      result.value = null
      return null
    } finally {
      loading.value = false
    }
  }

  function reset() {
    result.value = null
    error.value = null
  }

  return { result, loading, error, match, reset }
}
