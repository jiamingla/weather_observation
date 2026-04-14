import type { WeatherPayload } from '~/types/weather'

export function useWeather() {
  const data = ref<WeatherPayload | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchWeather(stationId: string) {
    const id = stationId.trim()
    if (!id) {
      error.value = '請輸入測站代號'
      return
    }
    loading.value = true
    error.value = null
    try {
      data.value = await $fetch<WeatherPayload>('/api/weather', {
        params: { stationId: id },
      })
    } catch (e: any) {
      error.value = e?.data?.message || e?.message || '未知錯誤'
      data.value = null
    } finally {
      loading.value = false
    }
  }

  return { data, loading, error, fetchWeather }
}
