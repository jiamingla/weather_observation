// 指標計算 — 純函數，無副作用，方便手動驗證
//
// 規則（依題目「可信度要求」）：
//  - 任一天資料缺漏（null），該窗的 MA 一律視為無法計算（輸出 null）
//  - 不做「部分平均」以避免誤導
//  - 視窗大小 N 對應「近 N 日」：位置 i 的 MA = avg(values[i-N+1 .. i])
//  - 資料尚不足 N 日（i < N-1）時輸出 null

export interface MaPoint {
  date: string;
  value: number | null;
}

export function rollingAverage(
  series: Array<{ date: string; value: number | null }>,
  window: number,
): MaPoint[] {
  if (window <= 0) throw new Error('window must be > 0');
  const out: MaPoint[] = [];
  for (let i = 0; i < series.length; i++) {
    if (i < window - 1) {
      out.push({ date: series[i].date, value: null });
      continue;
    }
    let sum = 0;
    let ok = true;
    for (let j = i - window + 1; j <= i; j++) {
      const v = series[j].value;
      if (v === null || !Number.isFinite(v)) {
        ok = false;
        break;
      }
      sum += v;
    }
    out.push({
      date: series[i].date,
      value: ok ? Number((sum / window).toFixed(2)) : null,
    });
  }
  return out;
}

// 取最後一個非 null 的值（代表「目前可用的最新指標」）
export function latestValid(points: MaPoint[]): MaPoint | null {
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i].value !== null) return points[i];
  }
  return null;
}
