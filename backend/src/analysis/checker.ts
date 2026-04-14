import { FactBundle } from './facts';

// Deterministic 規則檢查層：AI 回應必須通過這層才會展示給使用者
//
// 檢查項目：
//   R1  每一句至少引用 1 個 fact（factIds 非空）
//   R2  整體至少引用 2 個不同 fact（ ≥ 2 unique IDs）
//   R3  所有引用的 fact ID 必須存在於 FactBundle
//   R4  不得包含禁用詞（趨勢類 / 預測類 / 建議類）
//   R5  句中出現的數字若帶單位（°C / mm）應能對到某個 fact 的 value
//        （容忍 ±0.1 誤差；抓不到就扣分 → 不過關）

export interface AnalysisSentence {
  text: string;
  factIds: string[];
}

export interface AnalysisInput {
  sentences: AnalysisSentence[];
}

export type CheckVerdict = 'pass' | 'block';

export interface CheckReport {
  verdict: CheckVerdict;
  reasons: string[];
  passedSentences: AnalysisSentence[]; // pass 時等於 input.sentences
}

const BANNED_WORDS = [
  '趨勢',
  '持續',
  '預期',
  '預測',
  '顯著',
  '建議',
  '應該',
  '未來',
  '可能會',
  '將會',
  '可能',
];

// 匹配句中出現的「數字 + 單位」
// 支援：23.4°C、23°C、38mm、3.5mm
const NUMBER_UNIT_RE = /(-?\d+(?:\.\d+)?)\s*(°C|mm|℃)/gi;

function normalizeUnit(u: string): 'c' | 'mm' {
  const x = u.toLowerCase();
  if (x === '°c' || x === '℃') return 'c';
  return 'mm';
}

function factsByUnit(bundle: FactBundle): Record<'c' | 'mm', number[]> {
  const out: Record<'c' | 'mm', number[]> = { c: [], mm: [] };
  for (const f of bundle.facts) {
    if (f.value === null) continue;
    if (typeof f.value !== 'number') continue;
    if (f.label.includes('溫') || f.label.includes('°C')) out.c.push(f.value);
    if (f.label.includes('雨量')) out.mm.push(f.value);
  }
  return out;
}

export function checkAnalysis(
  input: AnalysisInput,
  bundle: FactBundle,
): CheckReport {
  const reasons: string[] = [];

  // R1
  if (input.sentences.length === 0) {
    return {
      verdict: 'block',
      reasons: ['AI 未回傳任何句子'],
      passedSentences: [],
    };
  }
  for (const s of input.sentences) {
    if (!s.factIds || s.factIds.length === 0) {
      reasons.push(`句子「${s.text}」未引用任何事實`);
    }
  }

  // R2
  const uniqueIds = new Set(input.sentences.flatMap((s) => s.factIds));
  if (uniqueIds.size < 2) {
    reasons.push(`整體引用事實數 ${uniqueIds.size} < 2`);
  }

  // R3
  const validIds = new Set(bundle.facts.map((f) => f.id));
  const unknownIds: string[] = [];
  for (const id of uniqueIds) {
    if (!validIds.has(id)) unknownIds.push(id);
  }
  if (unknownIds.length > 0) {
    reasons.push(`引用未知事實 ID：${unknownIds.join('、')}`);
  }

  // R4
  for (const s of input.sentences) {
    for (const w of BANNED_WORDS) {
      if (s.text.includes(w)) {
        reasons.push(`句子「${s.text}」含禁用詞：${w}`);
      }
    }
    // R4b：AI 有時會把 factIds 語法寫進 text，要擋
    if (/factIds|factId|\[\s*"F\d+"/.test(s.text)) {
      reasons.push(`句子「${s.text}」包含不該出現的 JSON/factIds 語法`);
    }
  }

  // R5：數字 + 單位要能對到某個 fact（容忍 ±0.1）
  const unitFacts = factsByUnit(bundle);
  for (const s of input.sentences) {
    NUMBER_UNIT_RE.lastIndex = 0;
    const matches = Array.from(s.text.matchAll(NUMBER_UNIT_RE));
    for (const m of matches) {
      const num = parseFloat(m[1]);
      const unit = normalizeUnit(m[2]);
      const pool = unitFacts[unit];
      const matched = pool.some((v) => Math.abs(v - num) <= 0.1);
      if (!matched) {
        reasons.push(
          `句子「${s.text}」出現的 ${num}${m[2]} 在事實中找不到對應值`,
        );
      }
    }
  }

  return reasons.length > 0
    ? { verdict: 'block', reasons, passedSentences: [] }
    : { verdict: 'pass', reasons: [], passedSentences: input.sentences };
}
