// CWA 測站白名單 — 手動策展（全台主要署屬有人氣象站）
// 來源：https://hdps.cwa.gov.tw/static/state.html 及 CWA 官方清單
//
// 刻意不收全台 400+ 自動測站，理由：
//   1) 資料完整度 — 署屬有人站維護品質最穩，C-B0024-001 支援度好
//   2) 可驗證性 — 手動策展的清單我能自己複核每一筆
//   3) 地理覆蓋 — 30 個點足以涵蓋全台主要縣市與離島

export interface Station {
  id: string;       // CWA 測站站號
  name: string;     // 測站名稱（官方）
  city: string;     // 所在縣市
  aliases?: string[]; // 常見別名（包含簡繁互換、英文、舊稱、鄰近地名）
}

export const STATIONS: Station[] = [
  // 北部
  { id: '466920', name: '臺北', city: '臺北市', aliases: ['台北', 'Taipei', '臺北市', '台北市'] },
  { id: '466921', name: '鞍部', city: '臺北市', aliases: ['陽明山'] },
  { id: '466910', name: '竹子湖', city: '臺北市' },
  { id: '466930', name: '淡水', city: '新北市', aliases: ['Tamsui', '淡水區'] },
  { id: '466880', name: '板橋', city: '新北市', aliases: ['新北', '新北市', '三重', '中和', '永和', '板橋區'] },
  { id: '466900', name: '臺北信義', city: '臺北市', aliases: ['信義', '信義區'] },
  { id: '467050', name: '新屋', city: '桃園市', aliases: ['桃園', '桃園市', '中壢', '觀音'] },
  { id: '467571', name: '新竹', city: '新竹市', aliases: ['新竹市', '竹北', '竹東', '新竹縣'] },
  { id: '467550', name: '梧棲', city: '臺中市', aliases: ['臺中港', '清水', '沙鹿'] },
  { id: '467440', name: '鞍部氣象站', city: '臺北市' },

  // 中部
  { id: '467490', name: '臺中', city: '臺中市', aliases: ['台中', 'Taichung', '臺中市', '台中市', '北屯', '南屯'] },
  { id: '467650', name: '日月潭', city: '南投縣', aliases: ['南投', '南投縣', 'Sun Moon Lake'] },
  { id: '467660', name: '玉山', city: '南投縣', aliases: ['玉山國家公園', 'Yushan'] },
  { id: '467530', name: '阿里山', city: '嘉義縣', aliases: ['嘉義縣', 'Alishan'] },
  { id: '467480', name: '嘉義', city: '嘉義市', aliases: ['Chiayi', '嘉義市'] },

  // 南部
  { id: '467410', name: '臺南', city: '臺南市', aliases: ['台南', 'Tainan', '臺南市', '台南市', '永康', '安平'] },
  { id: '467441', name: '高雄', city: '高雄市', aliases: ['Kaohsiung', '高雄市', '鳳山', '左營', '岡山', '三民'] },
  { id: '467590', name: '恆春', city: '屏東縣', aliases: ['墾丁', '屏東縣', '屏東'] },
  { id: '467540', name: '大武', city: '臺東縣', aliases: ['臺東', '台東'] },
  { id: '467620', name: '成功', city: '臺東縣', aliases: ['東河'] },
  { id: '467610', name: '蘭嶼', city: '臺東縣', aliases: ['Orchid Island'] },

  // 東部
  { id: '466990', name: '花蓮', city: '花蓮縣', aliases: ['Hualien', '花蓮縣', '花蓮市'] },
  { id: '467060', name: '蘇澳', city: '宜蘭縣', aliases: ['宜蘭縣'] },
  { id: '467080', name: '宜蘭', city: '宜蘭縣', aliases: ['Yilan', '羅東', '礁溪', '冬山'] },

  // 離島
  { id: '467990', name: '馬祖', city: '連江縣', aliases: ['連江', 'Matsu'] },
  { id: '467350', name: '澎湖', city: '澎湖縣', aliases: ['Penghu', '馬公'] },
  { id: '467110', name: '金門', city: '金門縣', aliases: ['Kinmen'] },
];

// 繁簡常見字互換（僅針對縣市地名使用的字）
const NORM_MAP: Record<string, string> = {
  '台': '臺',
};

export function normalize(input: string): string {
  let s = input.trim();
  s = s.replace(/\s+/g, '');
  for (const [from, to] of Object.entries(NORM_MAP)) {
    s = s.split(from).join(to);
  }
  return s.toLowerCase();
}

// 用正規化後的字串比對
function matchText(station: Station, q: string): 'exact' | 'substring' | null {
  const candidates = [station.name, station.city, ...(station.aliases ?? [])].map(normalize);
  // exact match
  if (candidates.some((c) => c === q)) return 'exact';
  // substring: 使用者輸入是候選的子字串，或候選是使用者輸入的子字串
  if (candidates.some((c) => c.includes(q) || q.includes(c))) return 'substring';
  return null;
}

export interface MatchResult {
  stationId: string;
  stationName: string;
  city: string;
  method: 'exact' | 'substring' | 'ai' | 'none';
  confidence: 'high' | 'medium' | 'low';
  message: string; // 給使用者看的說明
}

export function matchStringOnly(input: string): MatchResult | null {
  const q = normalize(input);
  if (!q) return null;

  // 先找所有 exact match，若有多個取第一個但也列出候選
  const exacts: Station[] = [];
  const subs: Station[] = [];
  for (const s of STATIONS) {
    const hit = matchText(s, q);
    if (hit === 'exact') exacts.push(s);
    else if (hit === 'substring') subs.push(s);
  }

  if (exacts.length > 0) {
    const s = exacts[0];
    return {
      stationId: s.id,
      stationName: s.name,
      city: s.city,
      method: 'exact',
      confidence: 'high',
      message: `輸入「${input}」完全對應測站「${s.name}」（${s.city}）`,
    };
  }

  if (subs.length === 1) {
    const s = subs[0];
    return {
      stationId: s.id,
      stationName: s.name,
      city: s.city,
      method: 'substring',
      confidence: 'medium',
      message: `輸入「${input}」與測站「${s.name}」（${s.city}）部分相符`,
    };
  }

  // 多個 substring 候選 → 不直接回，讓 AI fallback 決定
  return null;
}
