<script setup lang="ts">
import type { WeatherPayload } from '~/types/weather'

const props = defineProps<{ payload: WeatherPayload }>()

const severity = computed(() => {
  const c = props.payload.credibility
  if (!c.ma5Computable || !c.ma20Computable) return 'danger'
  if (c.missingDates.length > 0) return 'warn'
  return 'ok'
})

const tone = computed(() => {
  switch (severity.value) {
    case 'danger':
      return 'bg-red-50 border-red-300 text-red-900'
    case 'warn':
      return 'bg-amber-50 border-amber-300 text-amber-900'
    default:
      return 'bg-emerald-50 border-emerald-300 text-emerald-900'
  }
})
</script>

<template>
  <div class="rounded-md border px-4 py-3 text-sm" :class="tone">
    <div class="font-semibold mb-1">
      資料可信度：
      <span v-if="severity === 'ok'">資料完整</span>
      <span v-else-if="severity === 'warn'">部分缺漏（指標仍可計算）</span>
      <span v-else>指標不可計算</span>
    </div>
    <ul class="list-disc pl-5 space-y-0.5">
      <li>
        預期 {{ payload.range.expectedDays }} 天，實際完整 {{ payload.credibility.completeDays }} 天
      </li>
      <li v-if="payload.credibility.missingDates.length > 0">
        缺漏日期：{{ payload.credibility.missingDates.join('、') }}
      </li>
      <li v-for="note in payload.credibility.notes" :key="note">
        {{ note }}
      </li>
    </ul>
  </div>
</template>
