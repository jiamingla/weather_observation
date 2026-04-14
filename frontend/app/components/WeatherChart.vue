<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import type { WeatherPayload } from '~/types/weather'
import * as echarts from 'echarts/core'
import { LineChart, BarChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DataZoomComponent,
  MarkLineComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  LineChart,
  BarChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DataZoomComponent,
  MarkLineComponent,
  CanvasRenderer,
])

const props = defineProps<{ payload: WeatherPayload }>()

const el = ref<HTMLDivElement | null>(null)
const chart = shallowRef<echarts.ECharts | null>(null)

// ECharts 對 null 值原生支援，會自動斷線 — 這正是「缺漏不內插」的具體實作
const option = computed(() => {
  const dates = props.payload.days.map((d) => d.date)
  const maxTemp = props.payload.days.map((d) => d.maxTemp)
  const minTemp = props.payload.days.map((d) => d.minTemp)
  const rainfall = props.payload.days.map((d) => d.rainfallMm)
  const ma5 = props.payload.metrics.ma5MaxTemp.map((p) => p.value)
  const ma20 = props.payload.metrics.ma20MaxTemp.map((p) => p.value)

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      valueFormatter: (v: unknown) => (v == null ? '—' : String(v)),
    },
    legend: {
      data: ['最高溫', '最低溫', '近 5 日均高溫', '近 20 日均高溫', '降雨量'],
      top: 0,
    },
    grid: { top: 48, left: 48, right: 56, bottom: 56 },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: { rotate: 45, fontSize: 11 },
    },
    yAxis: [
      {
        type: 'value',
        name: '溫度 (°C)',
        position: 'left',
        axisLabel: { formatter: '{value}°' },
      },
      {
        type: 'value',
        name: '雨量 (mm)',
        position: 'right',
        axisLabel: { formatter: '{value}' },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '最高溫',
        type: 'line',
        data: maxTemp,
        smooth: false,
        connectNulls: false,
        itemStyle: { color: '#ef4444' },
        lineStyle: { width: 2 },
        symbolSize: 5,
      },
      {
        name: '最低溫',
        type: 'line',
        data: minTemp,
        connectNulls: false,
        itemStyle: { color: '#3b82f6' },
        lineStyle: { width: 2 },
        symbolSize: 5,
      },
      {
        name: '近 5 日均高溫',
        type: 'line',
        data: ma5,
        connectNulls: false,
        itemStyle: { color: '#f59e0b' },
        lineStyle: { width: 2, type: 'dashed' },
        symbol: 'none',
      },
      {
        name: '近 20 日均高溫',
        type: 'line',
        data: ma20,
        connectNulls: false,
        itemStyle: { color: '#8b5cf6' },
        lineStyle: { width: 2, type: 'dashed' },
        symbol: 'none',
      },
      {
        name: '降雨量',
        type: 'bar',
        yAxisIndex: 1,
        data: rainfall,
        itemStyle: { color: '#22d3ee', opacity: 0.6 },
      },
    ],
  }
})

function resize() {
  chart.value?.resize()
}

onMounted(() => {
  if (!el.value) return
  chart.value = echarts.init(el.value)
  chart.value.setOption(option.value)
  window.addEventListener('resize', resize)
})

watch(option, (o) => {
  chart.value?.setOption(o, { notMerge: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resize)
  chart.value?.dispose()
  chart.value = null
})
</script>

<template>
  <div ref="el" class="w-full h-[460px]" />
</template>
