<script setup lang="ts">
import type { AnalysisResponse, Fact } from '~/types/analysis'

const props = defineProps<{
  data: AnalysisResponse | null
  loading: boolean
  error: string | null
}>()

defineEmits<{ (e: 'regenerate'): void }>()

function findFact(facts: Fact[], id: string) {
  return facts.find((f) => f.id === id)
}

function factText(f: Fact | undefined) {
  if (!f) return ''
  if (f.value === null) return `${f.label}: —`
  const d = f.date ? ` (${f.date})` : ''
  return `${f.label}: ${f.value}${d}`
}
</script>

<template>
  <section class="rounded-md border border-slate-200 bg-white p-4 space-y-3">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">AI 分析（受限版）</h2>
      <button
        class="text-xs text-slate-600 underline hover:text-slate-900 disabled:opacity-40"
        :disabled="loading"
        @click="$emit('regenerate')"
      >
        {{ data ? '重新產生' : '產生分析' }}
      </button>
    </div>

    <div v-if="loading" class="text-sm text-slate-500">AI 分析產生中…（3-8 秒）</div>

    <div v-else-if="error" class="rounded border border-red-300 bg-red-50 text-red-900 px-3 py-2 text-sm">
      {{ error }}
    </div>

    <template v-else-if="data">
      <!-- pass：正常顯示 AI 敘述 + 引用事實 -->
      <template v-if="data.verdict === 'pass'">
        <ul class="space-y-2 text-sm leading-relaxed">
          <li v-for="(s, idx) in data.sentences" :key="idx" class="flex gap-2">
            <span class="text-slate-400 shrink-0">{{ idx + 1 }}.</span>
            <div class="flex-1">
              <div>{{ s.text }}</div>
              <div class="mt-0.5 flex flex-wrap gap-1">
                <span
                  v-for="id in s.factIds"
                  :key="id"
                  class="text-[10px] rounded-sm bg-slate-100 text-slate-600 px-1.5 py-0.5 border border-slate-200"
                  :title="factText(findFact(data.factBundle.facts, id))"
                >
                  {{ id }}
                </span>
              </div>
            </div>
          </li>
        </ul>
        <details class="text-xs text-slate-500">
          <summary class="cursor-pointer hover:text-slate-700">引用事實清單（hover ID 可看對應值）</summary>
          <ul class="mt-2 space-y-0.5 pl-4">
            <li v-for="f in data.factBundle.facts" :key="f.id">
              <code class="font-mono text-[11px]">{{ f.id }}</code>
              &nbsp;{{ f.label }}：
              <span :class="f.value === null ? 'text-slate-400' : 'text-slate-700'">
                {{ f.value === null ? '—' : f.value }}{{ f.date ? ` (${f.date})` : '' }}
              </span>
            </li>
          </ul>
        </details>
      </template>

      <!-- block / insufficient_data / api_error：關閉輸出並說明原因 -->
      <div
        v-else
        class="rounded border px-3 py-3 text-sm"
        :class="
          data.verdict === 'insufficient_data'
            ? 'border-amber-300 bg-amber-50 text-amber-900'
            : 'border-red-300 bg-red-50 text-red-900'
        "
      >
        <div class="font-semibold mb-1">
          <template v-if="data.verdict === 'insufficient_data'">資料不足，不輸出 AI 分析</template>
          <template v-else-if="data.verdict === 'block'">AI 分析未通過可信度檢查，不予顯示</template>
          <template v-else>AI 服務失敗，不輸出分析</template>
        </div>
        <ul class="list-disc pl-5 text-xs space-y-0.5">
          <li v-for="r in data.reasons" :key="r">{{ r }}</li>
        </ul>
      </div>
    </template>

    <div v-else class="text-sm text-slate-500">
      尚未產生。點右上角「產生分析」。
    </div>
  </section>
</template>
