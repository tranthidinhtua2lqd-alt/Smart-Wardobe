import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Check, Sparkles, X } from 'lucide-react';
import {
  CURATED_OUTFITS,
  FASHION_STYLE_OPTIONS,
  UserProfile,
} from '../types';

interface StyleOnboardingModalProps {
  profile: UserProfile;
  onCompleteOnboarding: (
    genderStyle: UserProfile['genderStyle'],
    favoriteStyles: string[]
  ) => Promise<void>;
  onClose?: () => void;
}

export const StyleOnboardingModal: React.FC<StyleOnboardingModalProps> = ({
  profile,
  onCompleteOnboarding,
  onClose,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedGender, setSelectedGender] = useState<UserProfile['genderStyle']>(
    profile.genderStyle || 'female'
  );
  const [selectedStyles, setSelectedStyles] = useState<string[]>(
    profile.favoriteStyles && profile.favoriteStyles.length > 0
      ? profile.favoriteStyles
      : ['coquette_babydoll', 'y2k_acubi', 'korean_casual']
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Allow closing with Escape key at any time
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSelectGender = (gender: UserProfile['genderStyle']) => {
    setSelectedGender(gender);
    setStep(2);
  };

  const toggleStyleOption = (styleId: string) => {
    setSelectedStyles((prev) => {
      if (prev.includes(styleId)) {
        return prev.filter((id) => id !== styleId);
      }
      if (prev.length >= 12) return prev;
      return [...prev, styleId];
    });
  };

  const handleFinish = async () => {
    if (selectedStyles.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onCompleteOnboarding(selectedGender, selectedStyles);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={() => {
        if (onClose) onClose();
      }}
      className="fixed inset-0 z-[65] flex items-center justify-center p-4 overflow-y-auto bg-black/65 backdrop-blur-[2px]"
    >
      {/* Subtle Background Collage Grid */}
      <div className="pointer-events-none fixed inset-0 opacity-20 grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 overflow-hidden">
        {CURATED_OUTFITS.slice(0, 8).map((item, idx) => (
          <div key={`${item.id}_${idx}`} className="rounded-2xl overflow-hidden bg-stone-800 h-64">
            <img
              src={item.imageUrl}
              alt=""
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 ? (
          /* STEP 1: GENDER IDENTIFICATION */
          <motion.div
            key="onboarding-step-1"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.96 }}
            transition={{ duration: 0.25 }}
            className="relative z-10 w-full max-w-[460px] rounded-[24px] sm:rounded-[28px] bg-white text-[#18181B] p-5 sm:p-8 md:p-10 shadow-[0_28px_90px_rgba(0,0,0,0.45)] flex flex-col justify-between min-h-[420px] sm:min-h-[480px] max-h-[92dvh] overflow-y-auto"
          >
            <div>
              {/* Top 2-Step Progress Pill Bar + Always-Available Close Button */}
              <div className="relative flex items-center justify-center mb-9">
                <div className="w-28 h-2 bg-stone-200 rounded-full overflow-hidden">
                  <div className="w-1/2 h-full bg-[#E11D48] rounded-full transition-all duration-300" />
                </div>
                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="absolute right-0 px-3 py-1.5 rounded-xl border border-stone-300 hover:bg-stone-100 text-xs font-semibold text-stone-700 flex items-center gap-1 cursor-pointer"
                    title="Đóng"
                  >
                    <X className="w-4 h-4" />
                    <span>Đóng</span>
                  </button>
                )}
              </div>

              <h1 className="font-serif-display text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight">
                Giới tính của bạn là gì?
              </h1>
              <p className="text-xs sm:text-sm text-stone-500 mt-2">
                Khi chọn <strong>Nữ</strong>, hệ thống sẽ ưu tiên hiển thị trọn bộ sưu tập đồ nữ đã tách nền riêng biệt và phối theo quy tắc màu sắc, tỷ lệ dài ngắn tôn dáng nhất.
              </p>

              <div className="mt-8 space-y-3.5">
                <button
                  type="button"
                  onClick={() => handleSelectGender('female')}
                  className="w-full py-4 px-6 rounded-2xl bg-[#ECEBE6] hover:bg-[#DFDDD5] text-stone-900 font-semibold text-sm sm:text-base transition-colors cursor-pointer text-center"
                >
                  Nữ (Female · Bộ sưu tập đồ Nữ tách nền)
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectGender('male')}
                  className="w-full py-4 px-6 rounded-2xl bg-[#ECEBE6] hover:bg-[#DFDDD5] text-stone-900 font-semibold text-sm sm:text-base transition-colors cursor-pointer text-center"
                >
                  Nam (Male · Bộ sưu tập đồ Nam)
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectGender('neutral')}
                  className="w-full py-4 px-6 rounded-2xl bg-[#ECEBE6] hover:bg-[#DFDDD5] text-stone-900 font-semibold text-sm sm:text-base transition-colors cursor-pointer text-center"
                >
                  Khác / Unisex (Tất cả bộ sưu tập)
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between mt-8 pt-4 border-t border-stone-100">
              <p className="text-[11px] text-stone-400">
                Bước 1 / 2 · Cá nhân hóa Smart Wardrobe
              </p>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs font-semibold text-stone-600 hover:text-stone-900 underline cursor-pointer"
                >
                  Bỏ qua bước này
                </button>
              )}
            </div>
          </motion.div>
        ) : (
          /* STEP 2: 12 DIVERSE FASHION STYLES MULTI-SELECT GRID */
          <motion.div
            key="onboarding-step-2"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.96 }}
            transition={{ duration: 0.25 }}
            className="relative z-10 w-full max-w-5xl rounded-[24px] sm:rounded-[28px] bg-white text-[#18181B] p-4 sm:p-7 md:p-9 shadow-[0_28px_90px_rgba(0,0,0,0.45)] flex flex-col justify-between max-h-[92dvh]"
          >
            {/* Top Bar with Back Arrow, Full Progress Bar & Always-Available Close Button */}
            <div>
              <div className="relative flex items-center justify-center mb-5">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="absolute left-0 p-2 rounded-full hover:bg-stone-100 text-stone-800 transition-colors cursor-pointer"
                  title="Quay lại chọn giới tính"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="w-32 h-2 bg-stone-200 rounded-full overflow-hidden">
                  <div className="w-full h-full bg-[#E11D48] rounded-full transition-all duration-300" />
                </div>

                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="absolute right-0 px-3 py-1.5 rounded-xl border border-stone-300 hover:bg-stone-100 text-xs font-semibold text-stone-700 flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                    <span>Đóng</span>
                  </button>
                )}
              </div>

              <div className="mb-4">
                <h1 className="font-serif-display text-2xl sm:text-4xl font-bold text-stone-900 tracking-tight">
                  Lựa chọn phong cách thời trang yêu thích của bạn
                </h1>
                <p className="text-xs sm:text-sm text-stone-500 mt-1">
                  Tích chọn 1 hoặc nhiều phong cách bên dưới (Coquette, Y2K Acubi, Hàn Quốc, Preppy, Balletcore, Quyến rũ, Streetwear, Parisian...) để hệ thống chia nhóm và gợi ý trang phục chuẩn gu.
                </p>
              </div>
            </div>

            {/* Scrollable Visual Style Grid (12 Styles) */}
            <div className="flex-1 overflow-y-auto pr-1 my-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {FASHION_STYLE_OPTIONS.map((option) => {
                  const isChecked = selectedStyles.includes(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => toggleStyleOption(option.id)}
                      className="group text-left flex flex-col focus:outline-none cursor-pointer"
                    >
                      <div
                        className={`relative aspect-[3/4] w-full rounded-2xl overflow-hidden border-2 transition-all bg-stone-100 ${
                          isChecked
                            ? 'border-stone-900 ring-2 ring-stone-900/20 scale-[0.98]'
                            : 'border-stone-200/80 group-hover:border-stone-400'
                        }`}
                      >
                        <img
                          src={option.imageUrl}
                          alt={option.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div
                          className={`absolute inset-0 transition-colors ${
                            isChecked ? 'bg-black/25' : 'bg-black/5 group-hover:bg-black/15'
                          }`}
                        />

                        {/* Top-Right Checkbox Indicator */}
                        <div
                          className={`absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-md ${
                            isChecked
                              ? 'bg-stone-900 text-white scale-105'
                              : 'bg-white/90 text-transparent border border-stone-300'
                          }`}
                        >
                          <Check className="w-4 h-4 stroke-[2.5]" />
                        </div>
                      </div>

                      <p className="mt-2 text-xs sm:text-sm font-bold text-stone-900 leading-snug">
                        {option.title}
                      </p>
                      <p className="text-[11px] text-stone-500 line-clamp-2 leading-snug">
                        {option.subtitle}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Continue CTA Bar */}
            <div className="pt-3.5 sm:pt-4 mt-2 border-t border-stone-100 flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:gap-3">
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2.5 sm:py-3.5 px-4 sm:px-5 rounded-xl sm:rounded-2xl border border-stone-300 text-stone-700 hover:bg-stone-100 font-semibold text-xs sm:text-sm cursor-pointer"
                >
                  Đóng
                </button>
              )}
              <button
                type="button"
                disabled={selectedStyles.length === 0 || isSubmitting}
                onClick={handleFinish}
                className={`flex-1 py-2.5 sm:py-3.5 px-4 sm:px-6 rounded-xl sm:rounded-2xl font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
                  selectedStyles.length > 0
                    ? 'bg-theme-primary text-white shadow-md cursor-pointer'
                    : 'bg-[#ECEBE6] text-stone-400 cursor-not-allowed'
                }`}
              >
                {selectedStyles.length === 0 ? (
                  <span>Chọn ít nhất 1 phong cách để tiếp tục</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span>
                      Hoàn tất & Xem Gợi Ý ({selectedStyles.length} phong cách)
                    </span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
