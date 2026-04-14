// 將作答文件 md 轉成乾淨可讀的 txt
// - 去除 **粗體** * 斜體 `inline code` [link](url) 語法
// - # / ## / ### 標題加上 ===== / ----- 底線強化視覺
// - 表格與程式碼區塊保留原樣（plaintext 也好讀）
// - 輸出加 UTF-8 BOM 讓 Windows Notepad 正確辨識編碼

import fs from 'node:fs'
import path from 'node:path'

const [, , inPath, outPath] = process.argv
if (!inPath || !outPath) {
  console.error('usage: node md-to-txt.mjs <input.md> <output.txt>')
  process.exit(1)
}

const src = fs.readFileSync(inPath, 'utf8')
const lines = src.split(/\r?\n/)
const out = []
let inCode = false

for (let i = 0; i < lines.length; i++) {
  let line = lines[i]

  // 程式碼圍欄保留原樣
  if (/^```/.test(line)) {
    inCode = !inCode
    out.push(line)
    continue
  }
  if (inCode) {
    out.push(line)
    continue
  }

  // 標題：# / ## / ### → 底線或保留
  const h1 = line.match(/^#\s+(.+)$/)
  const h2 = line.match(/^##\s+(.+)$/)
  const h3 = line.match(/^###\s+(.+)$/)
  const h4 = line.match(/^####\s+(.+)$/)
  if (h1) {
    const t = clean(h1[1])
    out.push('')
    out.push('='.repeat(Math.max(10, stringWidth(t))))
    out.push(t)
    out.push('='.repeat(Math.max(10, stringWidth(t))))
    continue
  }
  if (h2) {
    const t = clean(h2[1])
    out.push('')
    out.push(t)
    out.push('-'.repeat(Math.max(8, stringWidth(t))))
    continue
  }
  if (h3) {
    out.push('')
    out.push('【' + clean(h3[1]) + '】')
    continue
  }
  if (h4) {
    out.push('')
    out.push('◆ ' + clean(h4[1]))
    continue
  }

  // 水平分隔線
  if (/^---+\s*$/.test(line)) {
    out.push('')
    out.push('─'.repeat(60))
    continue
  }

  out.push(clean(line))
}

function clean(s) {
  return s
    // link [text](url) → text (url)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, u) => `${t} (${u})`)
    // bold **x** / __x__
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    // italic *x* / _x_ （小心不要吃到表格分隔線前的空白）
    .replace(/(^|[\s（(])\*([^*\s][^*]*)\*/g, '$1$2')
    .replace(/(^|[\s（(])_([^_\s][^_]*)_/g, '$1$2')
    // inline code `x`
    .replace(/`([^`]+)`/g, '$1')
    // strikethrough ~~x~~
    .replace(/~~([^~]+)~~/g, '$1')
}

// 粗略估中英混合寬度（中文算 2）
function stringWidth(s) {
  let w = 0
  for (const ch of s) {
    w += /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(ch) ? 2 : 1
  }
  return w
}

// 加 UTF-8 BOM（Windows Notepad / Word 打開才會正確顯示中文）
fs.writeFileSync(outPath, '\uFEFF' + out.join('\r\n'), 'utf8')
console.log(`wrote ${outPath}: ${out.length} lines`)
