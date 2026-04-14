<script setup lang="ts">
import type { WeatherPayload } from '~/types/weather'

defineProps<{ payload: WeatherPayload }>()
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
    <div class="rounded-md border border-slate-200 bg-white p-4">
      <div class="text-xs text-slate-500">測站</div>
      <div class="text-xl font-semibold mt-1">
        {{ payload.station.name }}
        <span class="text-sm text-slate-400 ml-1">{{ payload.station.id }}</span>
      </div>
      <div class="text-xs text-slate-500 mt-1">
        {{ payload.range.from }} ~ {{ payload.range.to }}
      </div>
    </div>

    <div class="rounded-md border border-slate-200 bg-white p-4">
      <div class="text-xs text-slate-500">近 5 日平均最高溫</div>
      <div v-if="payload.metrics.latestMa5" class="text-2xl font-semibold mt-1 text-amber-600">
        {{ payload.metrics.latestMa5.value.toFixed(2) }}°C
      </div>
      <div v-else class="text-2xl font-semibold mt-1 text-slate-400">—</div>
      <div class="text-xs text-slate-500 mt-1">
        <template v-if="payload.metrics.latestMa5">
          截至 {{ payload.metrics.latestMa5.date }}
        </template>
        <template v-else>無法計算（視窗含缺漏日）</template>
      </div>
    </div>

    <div class="rounded-md border border-slate-200 bg-white p-4">
      <div class="text-xs text-slate-500">近 20 日平均最高溫</div>
      <div v-if="payload.metrics.latestMa20" class="text-2xl font-semibold mt-1 text-violet-600">
        {{ payload.metrics.latestMa20.value.toFixed(2) }}°C
      </div>
      <div v-else class="text-2xl font-semibold mt-1 text-slate-400">—</div>
      <div class="text-xs text-slate-500 mt-1">
        <template v-if="payload.metrics.latestMa20">
          截至 {{ payload.metrics.latestMa20.date }}
        </template>
        <template v-else>無法計算（資料不足 20 日或含缺漏）</template>
      </div>
    </div>
  </div>
</template>
