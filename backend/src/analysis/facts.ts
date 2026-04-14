import { WeatherPayload } from '../weather/cwa.schemas';

// 受 AI 引用的「事實」集合。每個 fact 有穩定 ID，方便 AI 回填引用與 checker 對拍。
// 原則：
//   - 只從 WeatherPayload 衍生，不引入外部資訊
//   - 數值都已經是最終值（AI 不能再運算）
//   - 若資料不足即產生 null，且會反映在 `computable` 旗標

export interface Fact {
  id: string;
  label: string;
  value: string | number | null;
  date?: string | null;
}

export interface FactBundle {
  stationName: string;
  dateRange: { from: string; to: string };
  facts: Fact[];
  computable: boolean; // 是否有足夠 fact 產 AI 敘述（至少 3 項非 null）
}

function validDays(payload: WeatherPayload) {
  return payload.days.filter(
    (d) => d.maxTemp !== null && d.minTemp !== null,
  );
}

export function buildFacts(payload: WeatherPayload): FactBundle {
  const vd = validDays(payload);
  const facts: Fact[] = [];

  // F1 / F2：資料涵蓋
  facts.push({
    id: 'F1',
    label: '完整資料天數',
    value: payload.credibility.completeDays,
  });
  facts.push({
    id: 'F2',
    label: '預期天數',
    value: payload.range.expectedDays,
  });

  // F3 / F4：最熱 / 最冷的一天（以最高溫評估）
  if (vd.length > 0) {
    const hottest = vd.reduce((a, b) =>
      (b.maxTemp as number) > (a.maxTemp as number) ? b : a,
    );
    const coldest = vd.reduce((a, b) =>
      (b.minTemp as number) < (a.minTemp as number) ? b : a,
    );
    facts.push({
      id: 'F3',
      label: '區間內最高溫',
      value: hottest.maxTemp,
      date: hottest.date,
    });
    facts.push({
      id: 'F4',
      label: '區間內最低溫',
      value: coldest.minTemp,
      date: coldest.date,
    });
  }

  // F5 / F6：MA5 / MA20 最新值
  if (payload.metrics.latestMa5) {
    facts.push({
      id: 'F5',
      label: '近 5 日平均最高溫',
      value: payload.metrics.latestMa5.value,
      date: payload.metrics.latestMa5.date,
    });
  }
  if (payload.metrics.latestMa20) {
    facts.push({
      id: 'F6',
      label: '近 20 日平均最高溫',
      value: payload.metrics.latestMa20.value,
      date: payload.metrics.latestMa20.date,
    });
  }

  // F7 / F8：降雨概況（只算有真實雨量資料的日子）
  const rainDays = payload.days.filter(
    (d) => d.rainfallMm !== null && d.rainfallMm > 0 && !d.rainfallTrace,
  );
  facts.push({
    id: 'F7',
    label: '降雨日數（不含微量 "T"）',
    value: rainDays.length,
  });

  const maxRainDay = payload.days
    .filter((d) => d.rainfallMm !== null)
    .reduce<typeof payload.days[0] | null>(
      (a, b) =>
        a === null || (b.rainfallMm as number) > (a.rainfallMm as number)
          ? b
          : a,
      null,
    );
  if (maxRainDay && maxRainDay.rainfallMm !== null && maxRainDay.rainfallMm > 0) {
    facts.push({
      id: 'F8',
      label: '單日最大雨量 (mm)',
      value: maxRainDay.rainfallMm,
      date: maxRainDay.date,
    });
  }

  const nonNull = facts.filter((f) => f.value !== null);
  const computable = nonNull.length >= 3;

  return {
    stationName: payload.station.name,
    dateRange: { from: payload.range.from, to: payload.range.to },
    facts,
    computable,
  };
}
