import React, { useState } from 'react';
import {
  Sliders,
  Check,
  RotateCcw,
  Sparkles,
  BookmarkCheck,
  Camera,
  Eye,
  Shirt,
} from 'lucide-react';
import { OutfitItem, UserProfile, calculateOutfitFit } from '../types';

interface MannequinStudioProps {
  profile: UserProfile;
  selectedOutfit: OutfitItem;
  outfits: OutfitItem[];
  onSelectOutfit: (outfit: OutfitItem) => void;
  onUpdateMeasurements: (
    updated: Pick<
      UserProfile,
      'heightCm' | 'weightKg' | 'bustCm' | 'waistCm' | 'hipCm' | 'genderStyle'
    >
  ) => Promise<void>;
  onSaveTryOn: (outfit: OutfitItem, mode: 'mannequin_3d', notes: string) => Promise<void>;
  onSwitchToAr: (outfit: OutfitItem) => void;
}

const MATCHING_BOTTOMS_FOR_TOP = [
  { id: 'jeans_flare', name: 'Quần Jeans Ống Loe Cạp Cao', color: '#4B6B94' },
  { id: 'skirt_white', name: 'Chân Váy Xếp Ly Trắng Coquette', color: '#F5F5F4' },
  { id: 'trousers_black', name: 'Quần Tây Ống Suông Đen', color: '#27272A' },
  { id: 'skirt_denim', name: 'Chân Váy Denim Chữ A', color: '#3B5978' },
];

export const MannequinStudio: React.FC<MannequinStudioProps> = ({
  profile,
  selectedOutfit,
  outfits,
  onSelectOutfit,
  onUpdateMeasurements,
  onSaveTryOn,
  onSwitchToAr,
}) => {
  const [heightCm, setHeightCm] = useState(profile.heightCm);
  const [weightKg, setWeightKg] = useState(profile.weightKg);
  const [bustCm, setBustCm] = useState(profile.bustCm);
  const [waistCm, setWaistCm] = useState(profile.waistCm);
  const [hipCm, setHipCm] = useState(profile.hipCm);
  const [genderStyle, setGenderStyle] = useState<UserProfile['genderStyle']>(profile.genderStyle);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  // Controls for dressing the Mannequin with the exact garment/outfit photo
  const [wearRealPhotoOnMannequin, setWearRealPhotoOnMannequin] = useState<boolean>(true);
  const [garmentScaleAdjust, setGarmentScaleAdjust] = useState<number>(1.0);
  const [garmentOffsetY, setGarmentOffsetY] = useState<number>(0);
  const [selectedBottomColor, setSelectedBottomColor] = useState<string>(
    MATCHING_BOTTOMS_FOR_TOP[0].color
  );

  // Sync local sliders if profile changes from modal
  React.useEffect(() => {
    setHeightCm(profile.heightCm);
    setWeightKg(profile.weightKg);
    setBustCm(profile.bustCm);
    setWaistCm(profile.waistCm);
    setHipCm(profile.hipCm);
    setGenderStyle(profile.genderStyle);
  }, [profile]);

  const fitResult = calculateOutfitFit(selectedOutfit, {
    heightCm,
    weightKg,
    bustCm,
    waistCm,
    hipCm,
  });

  // Compute dynamic SVG body geometry based on real measurements
  // Normalizing around standard reference: Height 165, Bust 86, Waist 66, Hip 92, Weight 54
  const weightFactor = 1 + (weightKg - 54) * 0.0045;
  const bustHalfWidth = Math.max(24, Math.min(48, (bustCm / 2.6) * weightFactor));
  const waistHalfWidth = Math.max(18, Math.min(44, (waistCm / 2.6) * weightFactor));
  const hipHalfWidth = Math.max(26, Math.min(52, (hipCm / 2.55) * weightFactor));
  const shoulderHalfWidth = Math.max(
    30,
    Math.min(54, bustHalfWidth * (genderStyle === 'male' ? 1.24 : 1.12))
  );
  const verticalScale = Math.max(0.88, Math.min(1.14, heightCm / 165));

  // Parametric width ratio for the real garment image worn on the Mannequin
  const bodyWidthRatio = Math.max(0.82, Math.min(1.25, ((bustCm + hipCm) / 2 / 89) * weightFactor));

  const handleApplyAndSyncProfile = async () => {
    setIsSaving(true);
    try {
      await onUpdateMeasurements({
        heightCm,
        weightKg,
        bustCm,
        waistCm,
        hipCm,
        genderStyle,
      });
      setSaveFeedback('Đã cập nhật số đo cơ thể lên Cloud & Manocanh!');
      setTimeout(() => setSaveFeedback(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRecordMannequinTryOn = async () => {
    setIsSaving(true);
    try {
      await onSaveTryOn(
        selectedOutfit,
        'mannequin_3d',
        notes.trim() || fitResult.fitNotes
      );
      setSaveFeedback('Đã lưu bộ phối Manocanh vào Lịch sử cá nhân!');
      setNotes('');
      setTimeout(() => setSaveFeedback(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const bmi = (weightKg / Math.pow(heightCm / 100, 2)).toFixed(1);
  const isTopOnly = selectedOutfit.garmentCaptureMode === 'top_only';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Column: Interactive Parametric Body Mannequin Wearing the Exact Selected/Captured Outfit */}
      <div className="lg:col-span-7 bg-white border border-stone-200/90 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-stone-200">
          <div>
            <h2 className="font-serif-display text-2xl sm:text-3xl font-semibold text-stone-900">
              Manocanh Mặc Thử Trực Tiếp Theo Số Đo 3 Vòng
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              Manocanh tự động mặc y hệt bộ đồ bạn chọn hoặc chụp ảnh vào, co giãn theo Chiều cao, Cân nặng và 3 vòng của {profile.displayName}
            </p>
          </div>
          <div className="text-right font-mono-tabular text-xs text-stone-600">
            <span>Size khuyến nghị: </span>
            <strong className="text-sm text-stone-900 px-2 py-0.5 bg-stone-100 rounded">
              {fitResult.recommendedSize}
            </strong>
            <span className="mx-1.5">·</span>
            <span>Độ vừa vặn: </span>
            <strong className="text-emerald-800">{fitResult.fitScore}%</strong>
          </div>
        </div>

        {/* Top Quick Toolbar for Camera Garment Capture & Display Mode */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onSwitchToAr(selectedOutfit)}
            className="px-4 py-2 rounded-xl bg-theme-primary text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Camera className="w-4 h-4" />
            <span>Chụp / Tải Ảnh Áo Quần Mới Để Mặc Lên Manocanh</span>
          </button>

          <button
            type="button"
            onClick={() => setWearRealPhotoOnMannequin(!wearRealPhotoOnMannequin)}
            className="px-3 py-1.5 rounded-xl border border-stone-300 bg-[#FAF8F5] hover:bg-stone-200/70 text-xs font-medium text-stone-800 flex items-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-theme-primary" />
            <span>
              {wearRealPhotoOnMannequin
                ? 'Đang bật: Mặc ảnh thật lên Manocanh'
                : 'Đang bật: Khung phom vải cơ bản'}
            </span>
          </button>
        </div>

        {/* Mannequin Canvas Split: Parametric Silhouette Wearing Real Garment + Fit Details */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Interactive Parametric SVG Mannequin Wearing the Exact Outfit Image */}
          <div className="md:col-span-7 relative bg-[#FAF8F5] border border-stone-200/80 rounded-xl p-4 flex flex-col items-center justify-between min-h-[490px] overflow-hidden">
            {/* Measurement Callout Lines */}
            <div className="w-full flex items-center justify-between text-[11px] font-mono-tabular text-stone-500 mb-1 px-2">
              <span>CAO: {heightCm} cm</span>
              <span>NẶNG: {weightKg} kg</span>
              <span>BMI: {bmi}</span>
            </div>

            <div className="relative flex items-center justify-center w-full max-w-[260px] h-[380px]">
              <svg
                viewBox="0 0 240 420"
                className="w-full h-full overflow-visible transition-transform duration-300"
                style={{ transform: `scaleY(${verticalScale})` }}
              >
                <defs>
                  <linearGradient id="mannequinSkin" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#EADBC8" />
                    <stop offset="50%" stopColor="#D8C0A8" />
                    <stop offset="100%" stopColor="#C1A489" />
                  </linearGradient>
                </defs>

                {/* Studio Wooden/Metal Pedestal */}
                <ellipse cx="120" cy="396" rx="58" ry="10" fill="#E5E0D8" />
                <rect x="116" y="340" width="8" height="56" rx="3" fill="#A8A29E" />
                <line
                  x1="120"
                  y1="30"
                  x2="120"
                  y2="395"
                  stroke="#D6D1C7"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />

                {/* Mannequin Head & Neck */}
                <ellipse
                  cx="120"
                  cy="42"
                  rx="16"
                  ry="21"
                  fill="url(#mannequinSkin)"
                  stroke="#9C826B"
                  strokeWidth="1.2"
                />
                <rect x="113" y="61" width="14" height="17" rx="4" fill="url(#mannequinSkin)" />

                {/* Dynamic Parametric Torso, Arms & Legs Silhouette */}
                <path
                  d={`
                    M ${120 - shoulderHalfWidth} 80
                    Q 120 72 ${120 + shoulderHalfWidth} 80
                    L ${120 + bustHalfWidth} 128
                    Q ${120 + waistHalfWidth} 166 ${120 + waistHalfWidth} 176
                    Q ${120 + hipHalfWidth} 210 ${120 + hipHalfWidth} 230
                    L ${120 + hipHalfWidth * 0.48} 375
                    L ${120 + 8} 375
                    L 120 245
                    L ${120 - 8} 375
                    L ${120 - hipHalfWidth * 0.48} 375
                    L ${120 - hipHalfWidth} 230
                    Q ${120 - hipHalfWidth} 210 ${120 - waistHalfWidth} 176
                    Q ${120 - waistHalfWidth} 166 ${120 - bustHalfWidth} 128
                    Z
                  `}
                  fill="url(#mannequinSkin)"
                  stroke="#8C735B"
                  strokeWidth="1.2"
                />

                {/* If user captured a single shirt (top_only) or switched off real photo, draw lower garment */}
                {(isTopOnly || !wearRealPhotoOnMannequin) && (
                  <path
                    d={`
                      M ${120 - waistHalfWidth * 1.03} 174
                      L ${120 + waistHalfWidth * 1.03} 174
                      Q ${120 + hipHalfWidth * 1.08} 215 ${120 + hipHalfWidth * 1.06} 240
                      L ${120 + hipHalfWidth * 0.68} 372
                      L ${120 + 6} 372
                      L 120 242
                      L ${120 - 6} 372
                      L ${120 - hipHalfWidth * 0.68} 372
                      L ${120 - hipHalfWidth * 1.06} 240
                      Q ${120 - hipHalfWidth * 1.08} 215 ${120 - waistHalfWidth * 1.03} 174
                      Z
                    `}
                    fill={
                      isTopOnly
                        ? selectedBottomColor
                        : selectedOutfit.garmentSpecs.secondaryColor
                    }
                    fillOpacity="0.94"
                    stroke="#52525B"
                    strokeWidth="1.2"
                  />
                )}

                {!wearRealPhotoOnMannequin && (
                  <path
                    d={`
                      M ${120 - shoulderHalfWidth * selectedOutfit.garmentSpecs.shoulderScale} 78
                      Q 120 85 ${120 + shoulderHalfWidth * selectedOutfit.garmentSpecs.shoulderScale} 78
                      L ${120 + bustHalfWidth * 1.08} 130
                      L ${120 + waistHalfWidth * 1.05} 176
                      L ${120 + hipHalfWidth * 1.08} 224
                      L ${120 - hipHalfWidth * 1.08} 224
                      L ${120 - waistHalfWidth * 1.05} 176
                      L ${120 - bustHalfWidth * 1.08} 130
                      Z
                    `}
                    fill={selectedOutfit.garmentSpecs.primaryColor}
                    fillOpacity="0.9"
                    stroke={selectedOutfit.garmentSpecs.accentColor}
                    strokeWidth="1.5"
                  />
                )}

                {/* REAL OUTFIT / CAPTURED GARMENT IMAGE WORN DIRECTLY ON THE MANNEQUIN */}
                {wearRealPhotoOnMannequin && (
                  <foreignObject
                    x={120 - 82 * bodyWidthRatio * garmentScaleAdjust}
                    y={(isTopOnly ? 68 : 64) + garmentOffsetY}
                    width={164 * bodyWidthRatio * garmentScaleAdjust}
                    height={isTopOnly ? 155 * garmentScaleAdjust : 308 * garmentScaleAdjust}
                  >
                    <div className="w-full h-full flex items-start justify-center overflow-hidden pointer-events-none">
                      <img
                        src={selectedOutfit.imageUrl}
                        alt={selectedOutfit.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain rounded-xl drop-shadow-[0_10px_18px_rgba(0,0,0,0.22)]"
                        style={{
                          mixBlendMode: selectedOutfit.isCustomCaptured ? 'normal' : 'multiply',
                        }}
                      />
                    </div>
                  </foreignObject>
                )}

                {/* 3-Ring Measurement Guide Lines (Vòng 1, Vòng 2, Vòng 3) */}
                <line
                  x1={120 - bustHalfWidth - 18}
                  y1="128"
                  x2={120 + bustHalfWidth + 18}
                  y2="128"
                  stroke="#9A3412"
                  strokeWidth="1.2"
                  strokeDasharray="3 2"
                />
                <text
                  x="4"
                  y="124"
                  fill="#9A3412"
                  fontSize="10"
                  fontWeight="700"
                  fontFamily="monospace"
                >
                  V1: {bustCm}cm
                </text>

                <line
                  x1={120 - waistHalfWidth - 20}
                  y1="176"
                  x2={120 + waistHalfWidth + 20}
                  y2="176"
                  stroke="#0F5243"
                  strokeWidth="1.5"
                  strokeDasharray="3 2"
                />
                <text
                  x="4"
                  y="172"
                  fill="#0F5243"
                  fontSize="10"
                  fontWeight="700"
                  fontFamily="monospace"
                >
                  V2: {waistCm}cm
                </text>

                <line
                  x1={120 - hipHalfWidth - 18}
                  y1="226"
                  x2={120 + hipHalfWidth + 18}
                  y2="226"
                  stroke="#1E2F4D"
                  strokeWidth="1.2"
                  strokeDasharray="3 2"
                />
                <text
                  x="4"
                  y="222"
                  fill="#1E2F4D"
                  fontSize="10"
                  fontWeight="700"
                  fontFamily="monospace"
                >
                  V3: {hipCm}cm
                </text>
              </svg>
            </div>

            {/* Fine-tune Garment Position & Scale on Mannequin */}
            <div className="w-full pt-2 border-t border-stone-200/80 grid grid-cols-2 gap-3 text-[11px] text-stone-600">
              <div>
                <div className="flex justify-between mb-0.5">
                  <span>Độ ôm trang phục:</span>
                  <span className="font-mono-tabular">{Math.round(garmentScaleAdjust * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.8}
                  max={1.25}
                  step={0.03}
                  value={garmentScaleAdjust}
                  onChange={(e) => setGarmentScaleAdjust(Number(e.target.value))}
                  className="w-full accent-stone-900 cursor-pointer"
                />
              </div>
              <div>
                <div className="flex justify-between mb-0.5">
                  <span>Vị trí cổ áo / vai:</span>
                  <span className="font-mono-tabular">{garmentOffsetY}px</span>
                </div>
                <input
                  type="range"
                  min={-24}
                  max={24}
                  step={2}
                  value={garmentOffsetY}
                  onChange={(e) => setGarmentOffsetY(Number(e.target.value))}
                  className="w-full accent-stone-900 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Selected Outfit Visual Card, Fit Breakdown & Aura Styling Extras */}
          <div className="md:col-span-5 flex flex-col justify-between space-y-3.5">
            <div className="rounded-xl overflow-hidden border border-stone-200 bg-stone-100 aspect-[3/4] relative">
              <img
                src={selectedOutfit.imageUrl}
                alt={selectedOutfit.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain bg-white"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-3.5 text-white">
                <p className="text-[10px] text-amber-300 font-semibold">
                  {selectedOutfit.isCustomCaptured
                    ? 'Trang phục bạn vừa chụp / tải lên'
                    : selectedOutfit.category}
                </p>
                <p className="text-xs sm:text-sm font-bold leading-snug">{selectedOutfit.name}</p>
              </div>
            </div>

            {/* If Top-Only mode, allow choosing matching trousers/skirt on Mannequin */}
            {isTopOnly && (
              <div className="p-3 rounded-xl bg-white border border-stone-200 space-y-2">
                <p className="text-[11px] font-semibold text-stone-800 flex items-center gap-1">
                  <Shirt className="w-3.5 h-3.5 text-theme-primary" />
                  <span>Chọn quần/váy phối dưới áo vừa chụp:</span>
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {MATCHING_BOTTOMS_FOR_TOP.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelectedBottomColor(b.color)}
                      className={`px-2 py-1.5 rounded-lg border text-[10px] font-medium text-left truncate cursor-pointer ${
                        selectedBottomColor === b.color
                          ? 'border-stone-900 bg-stone-900 text-white'
                          : 'border-stone-200 bg-stone-50 text-stone-700'
                      }`}
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-stone-200/90 space-y-1.5 text-xs">
              <p className="font-semibold text-stone-900">Phân tích độ vừa vặn trên Manocanh:</p>
              <p className="text-stone-600 leading-relaxed">{fitResult.fitNotes}</p>
              {selectedOutfit.stylingExtras && (
                <div className="pt-2 mt-2 border-t border-stone-200 space-y-1 text-[11px] text-stone-700">
                  <p>
                    <strong className="text-stone-900">Phụ kiện:</strong>{' '}
                    {selectedOutfit.stylingExtras.accessories}
                  </p>
                  <p>
                    <strong className="text-stone-900">Makeup:</strong>{' '}
                    {selectedOutfit.stylingExtras.makeupTone}
                  </p>
                  <p>
                    <strong className="text-stone-900">Kiểu tóc & Màu tóc:</strong>{' '}
                    {selectedOutfit.stylingExtras.hairstyleAndColor}
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => onSwitchToAr(selectedOutfit)}
              className="w-full py-2.5 px-4 rounded-xl border border-stone-900 text-stone-900 hover:bg-stone-900 hover:text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Chụp / Nhập Ảnh Áo Khác Ướm Lên Manocanh</span>
            </button>
          </div>
        </div>

        {/* Quick Outfit Switcher Strip */}
        <div className="mt-6 pt-5 border-t border-stone-200">
          <p className="text-xs font-semibold text-stone-700 mb-3">
            Chọn trang phục khác để mặc lên Manocanh ({outfits.length} bộ):
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-60 overflow-y-auto pr-1">
            {outfits.map((item) => {
              const active = item.id === selectedOutfit.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectOutfit(item)}
                  className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                    active
                      ? 'border-stone-900 bg-stone-900/5 shadow-xs'
                      : 'border-stone-200 hover:border-stone-400 bg-white'
                  }`}
                >
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    referrerPolicy="no-referrer"
                    className="w-10 h-12 rounded-lg object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-stone-900 truncate">{item.name}</p>
                    <p className="text-[11px] text-stone-500 truncate">
                      {item.isCustomCaptured ? 'Ảnh chụp của bạn' : item.category}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Column: Real Body Measurement Sliders & Cloud Sync Controls */}
      <div className="lg:col-span-5 bg-white border border-stone-200/90 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-stone-200 pb-4">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-amber-800" />
            <h3 className="font-serif-display text-2xl font-semibold text-stone-900">
              Bảng Điều Chỉnh Số Đo Cơ Thể
            </h3>
          </div>
          <button
            type="button"
            onClick={() => {
              setHeightCm(165);
              setWeightKg(54);
              setBustCm(86);
              setWaistCm(66);
              setHipCm(92);
            }}
            className="text-xs text-stone-500 hover:text-stone-900 flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Mặc định</span>
          </button>
        </div>

        {saveFeedback && (
          <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2 font-medium">
            <Check className="w-4 h-4 shrink-0" />
            <span>{saveFeedback}</span>
          </div>
        )}

        {/* Sliders for Height, Weight, Bust, Waist, Hip */}
        <div className="space-y-4">
          {/* Height */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="font-medium text-stone-700">Chiều cao (Height)</span>
              <span className="font-mono-tabular font-semibold text-stone-900">{heightCm} cm</span>
            </div>
            <input
              type="range"
              min={145}
              max={195}
              value={heightCm}
              onChange={(e) => setHeightCm(Number(e.target.value))}
              className="w-full accent-stone-900 cursor-pointer"
            />
          </div>

          {/* Weight */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="font-medium text-stone-700">Cân nặng (Weight)</span>
              <span className="font-mono-tabular font-semibold text-stone-900">{weightKg} kg</span>
            </div>
            <input
              type="range"
              min={38}
              max={110}
              value={weightKg}
              onChange={(e) => setWeightKg(Number(e.target.value))}
              className="w-full accent-stone-900 cursor-pointer"
            />
          </div>

          {/* Vòng 1: Bust */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="font-medium text-amber-900">Vòng 1 · Vòng Ngực (Bust)</span>
              <span className="font-mono-tabular font-semibold text-amber-900">{bustCm} cm</span>
            </div>
            <input
              type="range"
              min={70}
              max={120}
              value={bustCm}
              onChange={(e) => setBustCm(Number(e.target.value))}
              className="w-full accent-amber-800 cursor-pointer"
            />
          </div>

          {/* Vòng 2: Waist */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="font-medium text-emerald-900">Vòng 2 · Vòng Eo (Waist)</span>
              <span className="font-mono-tabular font-semibold text-emerald-900">{waistCm} cm</span>
            </div>
            <input
              type="range"
              min={54}
              max={105}
              value={waistCm}
              onChange={(e) => setWaistCm(Number(e.target.value))}
              className="w-full accent-emerald-800 cursor-pointer"
            />
          </div>

          {/* Vòng 3: Hips */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="font-medium text-slate-900">Vòng 3 · Vòng Hông (Hips)</span>
              <span className="font-mono-tabular font-semibold text-slate-900">{hipCm} cm</span>
            </div>
            <input
              type="range"
              min={75}
              max={125}
              value={hipCm}
              onChange={(e) => setHipCm(Number(e.target.value))}
              className="w-full accent-slate-800 cursor-pointer"
            />
          </div>
        </div>

        {/* Save Body Measurements to Profile Button */}
        <button
          type="button"
          disabled={isSaving}
          onClick={handleApplyAndSyncProfile}
          className="w-full py-2.5 px-4 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-900 text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-amber-800" />
          <span>Lưu Số Đo Này Vào Hồ Sơ Của Bạn</span>
        </button>

        {/* Save Outfit Try-On Session to Personal History */}
        <div className="pt-4 border-t border-stone-200 space-y-3">
          <label className="block text-xs font-medium text-stone-700">
            Ghi chú cá nhân cho lần phối đồ này (tùy chọn):
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ví dụ: Áo vừa chụp mặc lên Manocanh rất vừa eo, hợp đi ăn tối..."
            className="w-full px-3.5 py-2 text-xs bg-[#FAF8F5] border border-stone-300 rounded-lg focus:outline-none focus:border-stone-900"
          />

          <button
            type="button"
            disabled={isSaving}
            onClick={handleRecordMannequinTryOn}
            className="w-full py-3 px-4 rounded-lg bg-theme-primary text-white text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <BookmarkCheck className="w-4 h-4" />
            <span>Lưu Bộ Phối Manocanh Vào Lịch Sử Cá Nhân</span>
          </button>
        </div>
      </div>
    </div>
  );
};
