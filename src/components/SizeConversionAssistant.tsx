import React, { useState, useMemo } from 'react';
import {
  Globe,
  Ruler,
  Shirt,
  Sparkles,
  CheckCircle2,
  Footprints,
} from 'lucide-react';
import { UserProfile } from '../types';

interface SizeConversionAssistantProps {
  heightCm: number;
  weightKg: number;
  bustCm: number;
  waistCm: number;
  hipCm: number;
  genderStyle: UserProfile['genderStyle'];
}

type FitPreference = 'slim' | 'regular' | 'oversized';

interface InternationalSizeRow {
  alpha: 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL';
  asiaVnKr: string;
  us: string;
  eu: string;
  uk: string;
  jeansInch: string;
  bustRange: [number, number];
  waistRange: [number, number];
  hipRange: [number, number];
  heightRange: [number, number];
  weightRange: [number, number];
}

const FEMALE_SIZE_CHART: InternationalSizeRow[] = [
  {
    alpha: 'XS',
    asiaVnKr: 'S nhỏ (KR 44 / JP 5-7)',
    us: 'US 0 - 2',
    eu: 'EU 32 - 34',
    uk: 'UK 4 - 6',
    jeansInch: '23" - 24"',
    bustRange: [74, 81],
    waistRange: [56, 61],
    hipRange: [80, 86],
    heightRange: [145, 158],
    weightRange: [38, 45],
  },
  {
    alpha: 'S',
    asiaVnKr: 'S chuẩn (KR 55 / JP 7-9)',
    us: 'US 2 - 4',
    eu: 'EU 34 - 36',
    uk: 'UK 6 - 8',
    jeansInch: '25" - 26"',
    bustRange: [81, 86],
    waistRange: [61, 66],
    hipRange: [86, 91],
    heightRange: [150, 164],
    weightRange: [44, 51],
  },
  {
    alpha: 'M',
    asiaVnKr: 'M chuẩn (KR 55-66 / JP 9-11)',
    us: 'US 6 - 8',
    eu: 'EU 38',
    uk: 'UK 10',
    jeansInch: '27" - 28"',
    bustRange: [86, 91],
    waistRange: [66, 72],
    hipRange: [91, 96],
    heightRange: [156, 170],
    weightRange: [50, 58],
  },
  {
    alpha: 'L',
    asiaVnKr: 'L (KR 66-77 / JP 11-13)',
    us: 'US 10 - 12',
    eu: 'EU 40 - 42',
    uk: 'UK 12 - 14',
    jeansInch: '29" - 30"',
    bustRange: [91, 97],
    waistRange: [72, 79],
    hipRange: [96, 103],
    heightRange: [160, 175],
    weightRange: [57, 66],
  },
  {
    alpha: 'XL',
    asiaVnKr: 'XL (KR 77-88 / JP 13-15)',
    us: 'US 14',
    eu: 'EU 44',
    uk: 'UK 16',
    jeansInch: '31" - 32"',
    bustRange: [97, 104],
    waistRange: [79, 87],
    hipRange: [103, 110],
    heightRange: [162, 180],
    weightRange: [65, 75],
  },
  {
    alpha: 'XXL',
    asiaVnKr: 'XXL (KR 88+ / JP 15+)',
    us: 'US 16 - 18',
    eu: 'EU 46',
    uk: 'UK 18',
    jeansInch: '33" - 35"',
    bustRange: [104, 115],
    waistRange: [87, 98],
    hipRange: [110, 120],
    heightRange: [164, 185],
    weightRange: [74, 92],
  },
];

const MALE_SIZE_CHART: InternationalSizeRow[] = [
  {
    alpha: 'XS',
    asiaVnKr: 'Asia S (KR 90)',
    us: 'US 32 - 34',
    eu: 'EU 42 - 44',
    uk: 'UK 32 - 34',
    jeansInch: '27" - 28"',
    bustRange: [80, 87],
    waistRange: [66, 72],
    hipRange: [84, 90],
    heightRange: [158, 167],
    weightRange: [48, 56],
  },
  {
    alpha: 'S',
    asiaVnKr: 'Asia M (KR 95)',
    us: 'US 34 - 36',
    eu: 'EU 44 - 46',
    uk: 'UK 34 - 36',
    jeansInch: '29" - 30"',
    bustRange: [87, 93],
    waistRange: [72, 77],
    hipRange: [90, 95],
    heightRange: [164, 173],
    weightRange: [55, 64],
  },
  {
    alpha: 'M',
    asiaVnKr: 'Asia L (KR 100)',
    us: 'US 38',
    eu: 'EU 48',
    uk: 'UK 38',
    jeansInch: '31" - 32"',
    bustRange: [93, 99],
    waistRange: [77, 83],
    hipRange: [95, 101],
    heightRange: [168, 178],
    weightRange: [63, 73],
  },
  {
    alpha: 'L',
    asiaVnKr: 'Asia XL (KR 105)',
    us: 'US 40 - 42',
    eu: 'EU 50 - 52',
    uk: 'UK 40 - 42',
    jeansInch: '33" - 34"',
    bustRange: [99, 106],
    waistRange: [83, 90],
    hipRange: [101, 107],
    heightRange: [173, 184],
    weightRange: [72, 83],
  },
  {
    alpha: 'XL',
    asiaVnKr: 'Asia 2XL (KR 110)',
    us: 'US 44',
    eu: 'EU 54',
    uk: 'UK 44',
    jeansInch: '35" - 36"',
    bustRange: [106, 114],
    waistRange: [90, 98],
    hipRange: [107, 114],
    heightRange: [176, 190],
    weightRange: [82, 95],
  },
  {
    alpha: 'XXL',
    asiaVnKr: 'Asia 3XL (KR 115)',
    us: 'US 46 - 48',
    eu: 'EU 56',
    uk: 'UK 46',
    jeansInch: '38" - 40"',
    bustRange: [114, 124],
    waistRange: [98, 108],
    hipRange: [114, 122],
    heightRange: [178, 196],
    weightRange: [94, 115],
  },
];

const SHOE_SIZE_CHART = [
  { footCm: '22.5 cm', vnEu: '35', usWomen: 'US 5', usMen: 'US 3.5', uk: 'UK 2.5', jpKr: '225 mm' },
  { footCm: '23.0 cm', vnEu: '36', usWomen: 'US 6', usMen: 'US 4.5', uk: 'UK 3.5', jpKr: '230 mm' },
  { footCm: '23.5 cm', vnEu: '37', usWomen: 'US 6.5', usMen: 'US 5', uk: 'UK 4', jpKr: '235 mm' },
  { footCm: '24.0 cm', vnEu: '38', usWomen: 'US 7.5', usMen: 'US 6', uk: 'UK 5', jpKr: '240 mm' },
  { footCm: '24.5 cm', vnEu: '39', usWomen: 'US 8.5', usMen: 'US 6.5', uk: 'UK 6', jpKr: '245 mm' },
  { footCm: '25.0 cm', vnEu: '40', usWomen: 'US 9', usMen: 'US 7', uk: 'UK 6.5', jpKr: '250 mm' },
  { footCm: '25.5 cm', vnEu: '41', usWomen: 'US 9.5', usMen: 'US 8', uk: 'UK 7', jpKr: '255 mm' },
  { footCm: '26.0 cm', vnEu: '42', usWomen: 'US 10', usMen: 'US 8.5', uk: 'UK 8', jpKr: '260 mm' },
];

export const SizeConversionAssistant: React.FC<SizeConversionAssistantProps> = ({
  heightCm,
  weightKg,
  bustCm,
  waistCm,
  hipCm,
  genderStyle,
}) => {
  const [fitPref, setFitPref] = useState<FitPreference>('regular');
  const [selectedFootIndex, setSelectedFootIndex] = useState<number>(2); // Default 23.5cm / Size 37

  const chart = genderStyle === 'male' ? MALE_SIZE_CHART : FEMALE_SIZE_CHART;

  const calculation = useMemo(() => {
    const safeBust = Number(bustCm) || 86;
    const safeWaist = Number(waistCm) || 66;
    const safeHip = Number(hipCm) || 92;
    const safeHeight = Number(heightCm) || 165;
    const safeWeight = Number(weightKg) || 54;

    const findBestRowIndex = (
      bustWeight: number,
      waistWeight: number,
      hipWeight: number
    ) => {
      let bestIdx = 1;
      let minDist = Infinity;

      chart.forEach((row, idx) => {
        const bMid = (row.bustRange[0] + row.bustRange[1]) / 2;
        const wMid = (row.waistRange[0] + row.waistRange[1]) / 2;
        const hMid = (row.hipRange[0] + row.hipRange[1]) / 2;
        const htMid = (row.heightRange[0] + row.heightRange[1]) / 2;
        const wtMid = (row.weightRange[0] + row.weightRange[1]) / 2;

        const dist =
          Math.abs(safeBust - bMid) * bustWeight +
          Math.abs(safeWaist - wMid) * waistWeight +
          Math.abs(safeHip - hMid) * hipWeight +
          Math.abs(safeHeight - htMid) * 0.25 +
          Math.abs(safeWeight - wtMid) * 0.35;

        if (dist < minDist) {
          minDist = dist;
          bestIdx = idx;
        }
      });

      // Apply fit preference shift
      if (fitPref === 'slim' && bestIdx > 0) {
        // Only shift down if not exceeding upper range too much
        const prevRow = chart[bestIdx - 1];
        if (safeWaist <= prevRow.waistRange[1] + 3) {
          bestIdx = bestIdx - 1;
        }
      } else if (fitPref === 'oversized' && bestIdx < chart.length - 1) {
        bestIdx = bestIdx + 1;
      }

      return bestIdx;
    };

    const topIdx = findBestRowIndex(1.8, 0.9, 0.2);
    const bottomIdx = findBestRowIndex(0.1, 1.6, 1.7);
    const dressIdx = findBestRowIndex(1.3, 1.4, 1.3);

    const topRow = chart[topIdx];
    const bottomRow = chart[bottomIdx];
    const dressRow = chart[dressIdx];

    let tailoringTip = `Số đo 3 vòng (${safeBust}-${safeWaist}-${safeHip}cm) của bạn rất cân đối với chuẩn Size ${dressRow.alpha} (${dressRow.us} / ${dressRow.eu}).`;
    if (topIdx !== bottomIdx) {
      tailoringTip = `Lưu ý từ Stylist Aura: Phần thân trên của bạn khớp chuẩn Size ${topRow.alpha} (${topRow.us}), trong khi phần hông/eo khớp Size ${bottomRow.alpha} (${bottomRow.us}). Khi mua Áo & Chân váy rời, bạn nên chọn lệch size như bảng dưới; khi mua Đầm liền, hãy ưu tiên chọn Size ${
        chart[Math.max(topIdx, bottomIdx)].alpha
      } để thoải mái nhất!`;
    }

    return {
      topRow,
      bottomRow,
      dressRow,
      tailoringTip,
    };
  }, [bustCm, waistCm, hipCm, heightCm, weightKg, fitPref, chart]);

  const activeShoe = SHOE_SIZE_CHART[selectedFootIndex] || SHOE_SIZE_CHART[2];

  return (
    <div className="p-4 rounded-xl bg-gradient-to-br from-stone-50 via-white to-amber-50/40 border border-stone-200 space-y-4 shadow-2xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200/80 pb-3">
        <div>
          <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-theme-primary" />
            <span>Trợ Lý Quy Đổi Size Quốc Tế (Size Conversion Assistant)</span>
          </span>
          <p className="text-[11px] text-stone-500 mt-0.5">
            Tự động tính size US, EU, UK, Châu Á (VN/Hàn/Nhật) từ số đo {heightCm}cm · {weightKg}kg · 3 vòng {bustCm}-{waistCm}-{hipCm}cm
          </p>
        </div>

        {/* Fit Preference Selector */}
        <div className="flex items-center gap-1 bg-stone-200/70 p-1 rounded-lg">
          {[
            { id: 'slim', label: 'Ôm sát' },
            { id: 'regular', label: 'Vừa vặn' },
            { id: 'oversized', label: 'Rộng thoải mái' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFitPref(item.id as FitPreference)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                fitPref === item.id
                  ? 'bg-stone-900 text-white shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3 Garment Category Cards (Tops, Bottoms, Dresses) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            title: 'Áo / Sơ Mi / Blazer',
            subtitle: `Theo V1 (${bustCm}cm) & Vai`,
            row: calculation.topRow,
            badgeColor: 'bg-theme-primary text-white',
          },
          {
            title: 'Quần / Chân Váy',
            subtitle: `Theo V2 (${waistCm}cm) & V3 (${hipCm}cm)`,
            row: calculation.bottomRow,
            badgeColor: 'bg-emerald-700 text-white',
          },
          {
            title: 'Đầm / Váy Liền',
            subtitle: 'Cân bằng cả 3 vòng',
            row: calculation.dressRow,
            badgeColor: 'bg-amber-600 text-white',
          },
        ].map((card) => (
          <div
            key={card.title}
            className="p-3 rounded-xl bg-white border border-stone-200/90 space-y-2 shadow-2xs"
          >
            <div className="flex items-center justify-between gap-1">
              <div>
                <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1">
                  <Shirt className="w-3.5 h-3.5 text-theme-primary" />
                  <span>{card.title}</span>
                </h4>
                <p className="text-[10px] text-stone-500">{card.subtitle}</p>
              </div>
              <span
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${card.badgeColor}`}
              >
                {card.row.alpha}
              </span>
            </div>

            <div className="pt-1.5 border-t border-stone-100 space-y-1 text-[11px] font-mono-tabular">
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Châu Á (VN/KR):</span>
                <strong className="text-stone-900">{card.row.asiaVnKr}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Mỹ (US):</span>
                <strong className="text-theme-primary">{card.row.us}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Châu Âu (EU):</span>
                <strong className="text-stone-900">{card.row.eu}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Anh (UK):</span>
                <strong className="text-stone-900">{card.row.uk}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Quần Jeans:</span>
                <strong className="text-emerald-800">{card.row.jeansInch}</strong>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Aura Smart Fit Note */}
      <div className="p-3 rounded-xl bg-amber-50/90 border border-amber-200/80 text-[11px] text-amber-950 flex items-start gap-2">
        <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <span className="leading-relaxed">{calculation.tailoringTip}</span>
      </div>

      {/* Full International Reference Table with Active Highlight */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-bold text-stone-700 flex items-center gap-1">
          <Ruler className="w-3.5 h-3.5 text-theme-primary" />
          <span>Bảng đối chiếu chuẩn quốc tế (Đánh dấu dòng khớp với bạn):</span>
        </span>
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table className="w-full text-left border-collapse text-[11px] font-mono-tabular">
            <thead>
              <tr className="bg-stone-100 text-stone-700 border-b border-stone-200">
                <th className="py-2 px-2.5 font-bold">Size</th>
                <th className="py-2 px-2.5 font-bold">US</th>
                <th className="py-2 px-2.5 font-bold">EU</th>
                <th className="py-2 px-2.5 font-bold">UK</th>
                <th className="py-2 px-2.5 font-bold">Châu Á (VN/KR)</th>
                <th className="py-2 px-2.5 font-bold">Ngực - Eo - Hông (cm)</th>
              </tr>
            </thead>
            <tbody>
              {chart.map((r) => {
                const isMatched = r.alpha === calculation.dressRow.alpha;
                return (
                  <tr
                    key={r.alpha}
                    className={`border-b border-stone-100 last:border-0 ${
                      isMatched
                        ? 'bg-theme-primary/10 font-semibold text-stone-900'
                        : 'text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <td className="py-1.5 px-2.5 font-bold flex items-center gap-1">
                      {isMatched && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-theme-primary shrink-0" />
                      )}
                      <span>{r.alpha}</span>
                    </td>
                    <td className="py-1.5 px-2.5">{r.us}</td>
                    <td className="py-1.5 px-2.5">{r.eu}</td>
                    <td className="py-1.5 px-2.5">{r.uk}</td>
                    <td className="py-1.5 px-2.5">{r.asiaVnKr}</td>
                    <td className="py-1.5 px-2.5">
                      {r.bustRange[0]}-{r.bustRange[1]} · {r.waistRange[0]}-{r.waistRange[1]} ·{' '}
                      {r.hipRange[0]}-{r.hipRange[1]}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bonus: International Shoe Size Converter for Mary Jane & Boots */}
      <div className="pt-2 border-t border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-stone-800">
          <Footprints className="w-3.5 h-3.5 text-theme-primary shrink-0" />
          <span>Quy đổi Size Giày Quốc Tế (Mary Jane / Boots):</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedFootIndex}
            onChange={(e) => setSelectedFootIndex(Number(e.target.value))}
            className="px-2.5 py-1 rounded-lg bg-white border border-stone-300 text-xs font-medium cursor-pointer"
          >
            {SHOE_SIZE_CHART.map((s, idx) => (
              <option key={s.vnEu} value={idx}>
                Chân {s.footCm} (Size VN/EU {s.vnEu})
              </option>
            ))}
          </select>
          <span className="px-2.5 py-1 rounded-lg bg-stone-900 text-white text-[11px] font-mono-tabular">
            VN/EU {activeShoe.vnEu} = {activeShoe.usWomen} = {activeShoe.uk} = KR {activeShoe.jpKr}
          </span>
        </div>
      </div>
    </div>
  );
};
