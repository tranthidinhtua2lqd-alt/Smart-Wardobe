import React from 'react';
import {
  Sparkles,
  Check,
  X,
  ArrowLeftRight,
  Award,
  Camera,
  Sliders,
  Ruler,
  Palette,
  Layers,
  Tag,
} from 'lucide-react';
import {
  OutfitItem,
  UserProfile,
  FASHION_STYLE_OPTIONS,
  calculateOutfitFit,
} from '../types';

interface OutfitComparisonViewProps {
  compareOutfits: OutfitItem[];
  profile: UserProfile;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onRemoveOutfit: (outfitId: string) => void;
  onClearAll: () => void;
  onSwapOrder: () => void;
  getOutfitAuraReason: (outfit: OutfitItem) => string;
  onTryOnMannequin: (outfit: OutfitItem) => void;
  onTryOnAr: (outfit: OutfitItem) => void;
}

export const OutfitComparisonView: React.FC<OutfitComparisonViewProps> = ({
  compareOutfits,
  profile,
  isOpen,
  onOpenChange,
  onRemoveOutfit,
  onClearAll,
  onSwapOrder,
  getOutfitAuraReason,
  onTryOnMannequin,
  onTryOnAr,
}) => {
  if (compareOutfits.length === 0) return null;

  const outfitA = compareOutfits[0];
  const outfitB = compareOutfits[1];

  const fitA = outfitA ? calculateOutfitFit(outfitA, profile) : null;
  const fitB = outfitB ? calculateOutfitFit(outfitB, profile) : null;

  const userFavStyles = profile.favoriteStyles || [];

  const getStyleInfo = (outfit: OutfitItem) => {
    const allTags = FASHION_STYLE_OPTIONS.filter((opt) =>
      outfit.styleTags.includes(opt.id)
    );
    const matchedFavs = allTags.filter((opt) => userFavStyles.includes(opt.id));
    return { allTags, matchedFavs };
  };

  const styleA = outfitA ? getStyleInfo(outfitA) : null;
  const styleB = outfitB ? getStyleInfo(outfitB) : null;

  // Determine Aura's overall comparison summary when both outfits are selected
  const getAuraComparisonSummary = () => {
    if (!outfitA || !outfitB || !fitA || !fitB || !styleA || !styleB) return '';

    const scoreDiff = Math.abs(fitA.fitScore - fitB.fitScore);
    const higherFitOutfit =
      fitA.fitScore >= fitB.fitScore ? outfitA : outfitB;
    const higherFitScore = Math.max(fitA.fitScore, fitB.fitScore);

    const moreStyleMatchOutfit =
      styleA.matchedFavs.length >= styleB.matchedFavs.length ? outfitA : outfitB;

    if (fitA.fitScore === fitB.fitScore) {
      return `Cả hai bộ "${outfitA.name}" và "${outfitB.name}" đều đạt độ khớp số đo ngang nhau (${fitA.fitScore}%) với chiều cao ${profile.heightCm}cm và số đo 3 vòng ${profile.bustCm}-${profile.waistCm}-${profile.hipCm}cm của bạn. "${outfitA.name}" thiên về ${outfitA.category.toLowerCase()}, trong khi "${outfitB.name}" nổi bật với chất liệu ${outfitB.fabric.toLowerCase()}.`;
    }

    return `Dựa trên số đo 3 vòng (${profile.bustCm}-${profile.waistCm}-${profile.hipCm}cm), Aura đánh giá "${higherFitOutfit.name}" nhỉnh hơn +${scoreDiff}% về độ ôm phom chuẩn tỷ lệ (${higherFitScore}% hợp dáng). Trong khi đó, "${moreStyleMatchOutfit.name}" đồng điệu cao với phong cách cá nhân bạn yêu thích và rất lý tưởng cho ${moreStyleMatchOutfit.category.toLowerCase()}.`;
  };

  return (
    <>
      {/* Sticky Bottom Comparison Tray (Always visible when 1 or 2 outfits are selected) */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[94vw] max-w-3xl bg-stone-900/95 text-white backdrop-blur-md border border-stone-700 rounded-2xl shadow-2xl px-3.5 py-3 sm:px-5 sm:py-3.5 transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-theme-primary/25 border border-theme-primary flex items-center justify-center shrink-0">
              <ArrowLeftRight className="w-4 h-4 text-amber-300" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-white">
                  So Sánh Trang Phục ({compareOutfits.length}/2)
                </span>
                {compareOutfits.length < 2 && (
                  <span className="text-[11px] text-amber-300 font-medium hidden sm:inline">
                    · Hãy chọn thêm 1 bộ đồ nữa để so sánh song song
                  </span>
                )}
              </div>

              {/* Selected outfit mini slots */}
              <div className="flex items-center gap-2 mt-1.5 overflow-x-auto no-scrollbar">
                {/* Slot 1 */}
                {outfitA && fitA && (
                  <div className="flex items-center gap-2 bg-stone-800 border border-stone-700 rounded-lg px-2 py-1 shrink-0">
                    <img
                      src={outfitA.imageUrl}
                      alt={outfitA.name}
                      referrerPolicy="no-referrer"
                      className="w-6 h-8 rounded object-cover"
                    />
                    <div className="max-w-[115px] sm:max-w-[150px]">
                      <p className="text-[11px] font-semibold text-white truncate">
                        1. {outfitA.name}
                      </p>
                      <p className="text-[10px] text-amber-300 font-mono-tabular">
                        {fitA.fitScore}% hợp dáng · Size {fitA.recommendedSize}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveOutfit(outfitA.id)}
                      className="p-0.5 text-stone-400 hover:text-white cursor-pointer"
                      title="Bỏ chọn bộ này"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <span className="text-xs font-bold text-stone-500">VS</span>

                {/* Slot 2 */}
                {outfitB && fitB ? (
                  <div className="flex items-center gap-2 bg-stone-800 border border-stone-700 rounded-lg px-2 py-1 shrink-0">
                    <img
                      src={outfitB.imageUrl}
                      alt={outfitB.name}
                      referrerPolicy="no-referrer"
                      className="w-6 h-8 rounded object-cover"
                    />
                    <div className="max-w-[115px] sm:max-w-[150px]">
                      <p className="text-[11px] font-semibold text-white truncate">
                        2. {outfitB.name}
                      </p>
                      <p className="text-[10px] text-amber-300 font-mono-tabular">
                        {fitB.fitScore}% hợp dáng · Size {fitB.recommendedSize}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveOutfit(outfitB.id)}
                      className="p-0.5 text-stone-400 hover:text-white cursor-pointer"
                      title="Bỏ chọn bộ này"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="px-3 py-2 rounded-lg border border-dashed border-stone-600 text-[11px] text-stone-400 shrink-0">
                    + Chọn bộ thứ 2 từ danh sách
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClearAll}
              className="px-2.5 py-2 rounded-xl border border-stone-700 hover:bg-stone-800 text-stone-300 text-xs font-medium cursor-pointer transition-colors"
            >
              Xóa chọn
            </button>
            <button
              type="button"
              disabled={compareOutfits.length < 2}
              onClick={() => onOpenChange(true)}
              className="px-4 py-2 rounded-xl bg-theme-primary hover:opacity-95 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-md"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>
                {compareOutfits.length === 2
                  ? 'So Sánh Chi Tiết 2 Bộ'
                  : 'Chọn thêm 1 bộ (1/2)'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Full Side-by-Side Comparison Modal */}
      {isOpen && outfitA && outfitB && fitA && fitB && styleA && styleB && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 md:p-6 overflow-y-auto">
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-5xl max-h-[92dvh] flex flex-col overflow-hidden shadow-2xl my-auto">
            {/* Modal Header */}
            <div className="px-4 sm:px-6 py-4 bg-stone-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-theme-primary flex items-center justify-center shrink-0">
                  <ArrowLeftRight className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="font-serif-display text-lg sm:text-xl font-bold leading-tight">
                    So Sánh Chi Tiết 2 Trang Phục Cùng Aura AI
                  </h2>
                  <p className="text-[11px] text-stone-300 font-mono-tabular">
                    Chuẩn hóa theo số đo của {profile.displayName}: {profile.heightCm}cm · {profile.weightKg}kg · 3 vòng {profile.bustCm}-{profile.waistCm}-{profile.hipCm}cm
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onSwapOrder}
                  className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-xs font-medium text-stone-200 flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Đổi vị trí 2 bộ trang phục"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 text-amber-300" />
                  <span>Đổi cột</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white cursor-pointer transition-colors"
                  title="Đóng bảng so sánh"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Comparison Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-theme-canvas">
              {/* Aura Overall Verdict Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 via-white to-amber-50/80 border border-amber-200/90 shadow-2xs flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4 text-amber-700" />
                </div>
                <div className="space-y-1 text-xs sm:text-sm text-stone-800 leading-relaxed">
                  <p className="font-bold text-stone-900 flex items-center gap-1.5">
                    <span>✨ Tổng kết so sánh từ Stylist Aura:</span>
                  </p>
                  <p>{getAuraComparisonSummary()}</p>
                </div>
              </div>

              {/* Side-by-Side 2 Columns Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {[
                  {
                    outfit: outfitA,
                    fit: fitA,
                    otherFit: fitB,
                    styleInfo: styleA,
                    slotLabel: 'TRANG PHỤC 01',
                  },
                  {
                    outfit: outfitB,
                    fit: fitB,
                    otherFit: fitA,
                    styleInfo: styleB,
                    slotLabel: 'TRANG PHỤC 02',
                  },
                ].map(({ outfit, fit, otherFit, styleInfo, slotLabel }) => {
                  const isFitWinner = fit.fitScore >= otherFit.fitScore;
                  const scoreDiff = fit.fitScore - otherFit.fitScore;

                  return (
                    <div
                      key={outfit.id}
                      className={`bg-white rounded-2xl border-2 overflow-hidden flex flex-col justify-between shadow-sm transition-all ${
                        isFitWinner
                          ? 'border-theme-primary ring-2 ring-theme-primary/15'
                          : 'border-stone-200/90'
                      }`}
                    >
                      <div>
                        {/* Header & Image Section */}
                        <div className="relative aspect-[4/4] sm:aspect-[4/4.2] bg-stone-100 overflow-hidden">
                          <img
                            src={outfit.imageUrl}
                            alt={outfit.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
                            <span className="px-2.5 py-1 rounded-lg bg-stone-900/85 backdrop-blur-xs text-white text-[10px] font-mono font-bold tracking-wider">
                              {slotLabel}
                            </span>
                            {isFitWinner && (
                              <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-stone-950 text-[11px] font-bold flex items-center gap-1 shadow-sm">
                                <Award className="w-3.5 h-3.5" />
                                <span>
                                  {scoreDiff > 0
                                    ? `Hợp dáng nhất (+${scoreDiff}%)`
                                    : 'Độ hợp dáng dẫn đầu'}
                                </span>
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => onRemoveOutfit(outfit.id)}
                            className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors cursor-pointer"
                            title="Đổi bộ trang phục khác"
                          >
                            <X className="w-4 h-4" />
                          </button>

                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-4 text-white">
                            <span className="text-[11px] text-amber-300 font-medium">
                              {outfit.category} · Mùa {outfit.season}
                            </span>
                            <h3 className="font-serif-display text-lg sm:text-xl font-bold leading-snug mt-0.5">
                              {outfit.name}
                            </h3>
                          </div>
                        </div>

                        {/* Comparison Metrics Body */}
                        <div className="p-4 sm:p-5 space-y-4">
                          {/* 1. Fit Score & Recommended Size */}
                          <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                                <Ruler className="w-3.5 h-3.5 text-theme-primary" />
                                <span>Điểm Hợp Dáng & Size Đề Xuất</span>
                              </span>
                              <span className="px-2.5 py-0.5 rounded-full bg-theme-primary/10 text-theme-primary text-xs font-bold font-mono-tabular">
                                Size {fit.recommendedSize} · {fit.fitScore}%
                              </span>
                            </div>

                            {/* Fit Score Progress Bar */}
                            <div className="w-full h-2.5 bg-stone-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-theme-primary rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, Math.max(50, fit.fitScore))}%` }}
                              />
                            </div>

                            <p className="text-xs text-stone-600 leading-relaxed">
                              {fit.fitNotes}
                            </p>
                          </div>

                          {/* 2. Style Tags Comparison */}
                          <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                                <Tag className="w-3.5 h-3.5 text-theme-primary" />
                                <span>Nhãn Phong Cách (Style Tags)</span>
                              </span>
                              <span className="text-[11px] font-semibold text-emerald-700">
                                {styleInfo.matchedFavs.length > 0
                                  ? `Khớp ${styleInfo.matchedFavs.length} gu đã chọn`
                                  : 'Phong cách mở rộng'}
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                              {styleInfo.allTags.map((st) => {
                                const isUserFav = userFavStyles.includes(st.id);
                                return (
                                  <span
                                    key={st.id}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 border ${
                                      isUserFav
                                        ? 'bg-theme-primary/10 text-stone-900 border-theme-primary/40 font-semibold'
                                        : 'bg-white text-stone-700 border-stone-200'
                                    }`}
                                  >
                                    {isUserFav && (
                                      <Check className="w-3 h-3 text-theme-primary shrink-0" />
                                    )}
                                    <span>{st.title}</span>
                                  </span>
                                );
                              })}
                            </div>
                          </div>

                          {/* 3. Aura's Recommendation Notes */}
                          <div className="p-3.5 rounded-xl bg-amber-50/85 border border-amber-200/80 space-y-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                              <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>Ghi Chú Tư Vấn Từ Stylist Aura</span>
                            </div>
                            <p className="text-xs text-amber-950 leading-relaxed font-medium">
                              {getOutfitAuraReason(outfit)}
                            </p>
                            <p className="text-[11px] text-amber-900/90 leading-relaxed border-t border-amber-200/60 pt-1.5">
                              <strong>Điểm nhấn tôn dáng:</strong> {outfit.idealRatioNote}
                            </p>
                          </div>

                          {/* 4. Color Swatches, Proportion Rule & Fabric */}
                          <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-stone-700 flex items-center gap-1.5">
                                <Palette className="w-3.5 h-3.5 text-theme-primary" />
                                <span>Bảng Màu & Quy Tắc Tỷ Lệ</span>
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="w-4 h-4 rounded-full border border-black/20 shadow-2xs"
                                  style={{ backgroundColor: outfit.garmentSpecs.primaryColor }}
                                  title={`Màu chủ đạo: ${outfit.garmentSpecs.primaryColor}`}
                                />
                                <span
                                  className="w-4 h-4 rounded-full border border-black/20 shadow-2xs"
                                  style={{ backgroundColor: outfit.garmentSpecs.secondaryColor }}
                                  title={`Màu phối: ${outfit.garmentSpecs.secondaryColor}`}
                                />
                                <span
                                  className="w-4 h-4 rounded-full border border-black/20 shadow-2xs"
                                  style={{ backgroundColor: outfit.garmentSpecs.accentColor }}
                                  title={`Màu nhấn: ${outfit.garmentSpecs.accentColor}`}
                                />
                              </div>
                            </div>

                            <p className="text-stone-700 leading-snug">
                              <strong className="text-stone-900">Phối màu:</strong> {outfit.colorRule}
                            </p>
                            <p className="text-stone-700 leading-snug">
                              <strong className="text-stone-900">Tỷ lệ dài ngắn:</strong> {outfit.proportionRule}
                            </p>
                            <p className="text-stone-700 leading-snug flex items-center gap-1 pt-0.5">
                              <Layers className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                              <span>
                                <strong className="text-stone-900">Chất liệu:</strong> {outfit.fabric}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Column Action Footer */}
                      <div className="p-4 sm:p-5 pt-0 grid grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            onOpenChange(false);
                            onTryOnMannequin(outfit);
                          }}
                          className="py-2.5 px-3 bg-theme-primary text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          <span>Thử Lên Manocanh</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onOpenChange(false);
                            onTryOnAr(outfit);
                          }}
                          className="py-2.5 px-3 bg-theme-canvas hover:bg-stone-200/70 text-stone-900 border border-stone-300 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5 text-theme-primary" />
                          <span>Ướm Qua AR</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
