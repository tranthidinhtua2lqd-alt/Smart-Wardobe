import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  Upload,
  Check,
  Ruler,
  Scale,
  LogOut,
  Cloud,
  Palette,
  X,
  Sparkles,
} from 'lucide-react';
import {
  DEFAULT_AVATARS,
  FASHION_STYLE_OPTIONS,
  THEME_PALETTES,
  ThemePalette,
  UserProfile,
  calculateBodyShape,
  FACE_SHAPE_OPTIONS,
  UNDERTONE_OPTIONS,
} from '../types';

interface ProfileDrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  isCloudSynced: boolean;
  activeTheme: ThemePalette;
  customPrimaryColor: string;
  onSelectTheme: (palette: ThemePalette) => void;
  onSelectCustomColor: (hex: string) => void;
  onSaveProfile: (updated: UserProfile) => Promise<void>;
  onLogout: () => void;
}

export const ProfileDrawerModal: React.FC<ProfileDrawerModalProps> = ({
  isOpen,
  onClose,
  profile,
  isCloudSynced,
  activeTheme,
  customPrimaryColor,
  onSelectTheme,
  onSelectCustomColor,
  onSaveProfile,
  onLogout,
}) => {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [heightCm, setHeightCm] = useState(profile.heightCm);
  const [weightKg, setWeightKg] = useState(profile.weightKg);
  const [bustCm, setBustCm] = useState(profile.bustCm);
  const [waistCm, setWaistCm] = useState(profile.waistCm);
  const [hipCm, setHipCm] = useState(profile.hipCm);
  const [genderStyle, setGenderStyle] = useState<UserProfile['genderStyle']>(profile.genderStyle);
  const [favoriteStyles, setFavoriteStyles] = useState<string[]>(profile.favoriteStyles || []);
  const [faceShape, setFaceShape] = useState<string>(profile.faceShape || 'round');
  const [undertone, setUndertone] = useState<string>(profile.undertone || 'warm');
  const [isSaving, setIsSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setDisplayName(profile.displayName);
    setAvatarUrl(profile.avatarUrl);
    setHeightCm(profile.heightCm);
    setWeightKg(profile.weightKg);
    setBustCm(profile.bustCm);
    setWaistCm(profile.bustCm ? profile.waistCm : 66);
    setHipCm(profile.hipCm);
    setGenderStyle(profile.genderStyle);
    setFavoriteStyles(profile.favoriteStyles || []);
    setFaceShape(profile.faceShape || 'round');
    setUndertone(profile.undertone || 'warm');
  }, [profile, isOpen]);

  // Allow closing with Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleStyleOption = (styleId: string) => {
    setFavoriteStyles((prev) => {
      if (prev.includes(styleId)) {
        return prev.filter((id) => id !== styleId);
      }
      if (prev.length >= 10) return prev;
      return [...prev, styleId];
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 48;
        canvas.height = 48;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, 48, 48);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.55);
          if (dataUrl.length <= 1950) {
            setAvatarUrl(dataUrl);
          } else {
            const smallerCanvas = document.createElement('canvas');
            smallerCanvas.width = 32;
            smallerCanvas.height = 32;
            const sCtx = smallerCanvas.getContext('2d');
            sCtx?.drawImage(img, 0, 0, 32, 32);
            setAvatarUrl(smallerCanvas.toDataURL('image/jpeg', 0.45));
          }
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveProfile({
        ...profile,
        displayName: displayName.trim().slice(0, 100) || 'Khách hàng Smart Wardrobe',
        avatarUrl: avatarUrl.slice(0, 2000),
        heightCm: Math.max(100, Math.min(250, Number(heightCm))),
        weightKg: Math.max(25, Math.min(250, Number(weightKg))),
        bustCm: Math.max(50, Math.min(180, Number(bustCm))),
        waistCm: Math.max(40, Math.min(180, Number(waistCm))),
        hipCm: Math.max(50, Math.min(180, Number(hipCm))),
        genderStyle,
        favoriteStyles: favoriteStyles.slice(0, 10),
        faceShape,
        undertone,
        onboardingCompleted: true,
      });
      setSavedBanner(true);
      setTimeout(() => {
        setSavedBanner(false);
        onClose();
      }, 500);
    } catch (err) {
      console.warn('Profile save completed locally:', err);
      setSavedBanner(true);
      setTimeout(() => {
        setSavedBanner(false);
        onClose();
      }, 500);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[70] bg-black/65 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
    >
      {/* Floating High-Contrast Escape Button always visible on screen */}
      <button
        type="button"
        onClick={onClose}
        className="fixed top-4 right-4 z-[80] px-3 py-2 rounded-full bg-white text-stone-900 border border-stone-300 shadow-xl hover:bg-stone-900 hover:text-white hover:scale-105 transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs font-bold"
        title="Thoát hoặc Đóng (phím ESC)"
      >
        <X className="w-4 h-4" />
        <span>Đóng (ESC)</span>
      </button>

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-theme-canvas text-[#18181B] rounded-2xl border border-stone-300 shadow-[0_28px_80px_rgba(0,0,0,0.45)] flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Sticky Header with Prominent Close Button */}
        <div className="sticky top-0 z-20 bg-theme-canvas px-6 py-4 border-b border-stone-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <User className="w-5 h-5 text-theme-primary shrink-0" />
            <div>
              <h2 className="font-serif-display text-xl sm:text-2xl font-bold text-stone-900 leading-tight">
                Thông Tin Cá Nhân, Số Đo & Phong Cách
              </h2>
              <p className="text-[11px] text-stone-500">
                Nhấn ra ngoài khung hoặc bấm nút Đóng (ESC) bất cứ lúc nào để thoát
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-stone-700 hover:text-white bg-white hover:bg-stone-900 border border-stone-300 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
            title="Đóng cửa sổ thông tin cá nhân"
          >
            <X className="w-4 h-4" />
            <span>Đóng</span>
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {savedBanner && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>Đã lưu thông tin cá nhân, phong cách & cập nhật gợi ý phối đồ!</span>
            </div>
          )}

          {/* Avatar Selection & Custom Upload */}
          <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-white border border-stone-200">
            <img
              src={avatarUrl}
              alt={displayName}
              referrerPolicy="no-referrer"
              className="w-20 h-20 rounded-full object-cover border-2 border-theme-primary shrink-0"
            />
            <div className="flex-1 space-y-2.5 text-center sm:text-left">
              <p className="text-xs font-semibold text-stone-900">
                Ảnh đại diện cá nhân (Có thể đổi theo ý thích)
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                {DEFAULT_AVATARS.map((presetUrl, i) => (
                  <button
                    key={presetUrl}
                    type="button"
                    onClick={() => setAvatarUrl(presetUrl)}
                    className={`w-9 h-9 rounded-full overflow-hidden border-2 transition-transform cursor-pointer ${
                      avatarUrl === presetUrl
                        ? 'border-stone-900 scale-110'
                        : 'border-stone-200 hover:border-stone-400'
                    }`}
                    title={`Mẫu Avatar ${i + 1}`}
                  >
                    <img
                      src={presetUrl}
                      alt={`Avatar ${i + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg border border-stone-300 hover:border-stone-900 text-xs font-medium text-stone-700 flex items-center gap-1.5 cursor-pointer bg-stone-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Tải ảnh lên</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Display Name & Gender / Body Frame Style */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1">
                Tên hiển thị
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-xl focus:outline-none focus:border-stone-900"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1">
                Giới tính & Phom đồ gợi ý
              </label>
              <select
                value={genderStyle}
                onChange={(e) => setGenderStyle(e.target.value as UserProfile['genderStyle'])}
                className="w-full px-3 py-2.5 text-sm bg-white border border-stone-300 rounded-xl focus:outline-none focus:border-stone-900 cursor-pointer"
              >
                <option value="female">Nữ (Gợi ý các bộ đồ Nữ tách nền & Manocanh thắt eo)</option>
                <option value="male">Nam (Gợi ý các bộ đồ Nam & Manocanh vai rộng)</option>
                <option value="neutral">Unisex · Đương đại (Gợi ý đa phong cách)</option>
              </select>
            </div>
          </div>

          {/* Fashion Style Preferences Section inside Personal Profile */}
          <div className="p-4 rounded-xl bg-white border border-stone-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-xs font-semibold text-stone-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-theme-primary" />
                  <span>Phong cách thời trang yêu thích (Có thể thay đổi bất cứ lúc nào)</span>
                </span>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Tích chọn các phong cách bạn muốn Smart Wardrobe ưu tiên gợi ý phối đồ
                </p>
              </div>
              <span className="text-[11px] font-semibold text-theme-primary bg-theme-primary/10 px-2.5 py-1 rounded-full">
                Đã chọn {favoriteStyles.length} phong cách
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[270px] overflow-y-auto pr-1 pt-1">
              {FASHION_STYLE_OPTIONS.map((option) => {
                const isSelected = favoriteStyles.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => toggleStyleOption(option.id)}
                    className={`p-2 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-theme-primary bg-theme-primary/10 ring-1 ring-theme-primary/30 shadow-2xs'
                        : 'border-stone-200 hover:border-stone-400 bg-stone-50/60'
                    }`}
                  >
                    <img
                      src={option.imageUrl}
                      alt={option.title}
                      referrerPolicy="no-referrer"
                      className="w-11 h-14 rounded-lg object-cover shrink-0 border border-stone-200 bg-white"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-bold text-stone-900 truncate">
                          {option.title}
                        </p>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-theme-primary shrink-0 stroke-[2.5]" />
                        )}
                      </div>
                      <p className="text-[10px] text-stone-500 line-clamp-2 leading-tight mt-0.5">
                        {option.subtitle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Body Measurements Section */}
          <div className="p-4 rounded-xl bg-white border border-stone-200 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-900 flex items-center gap-1.5">
                <Ruler className="w-4 h-4 text-theme-primary" />
                <span>Thông số cơ thể thực tế (Đồng bộ sang Manocanh)</span>
              </span>
              <span className="text-[11px] text-stone-500 flex items-center gap-1">
                <Cloud className="w-3.5 h-3.5" />
                <span>{isCloudSynced ? 'Đã đồng bộ Cloud' : 'Lưu cục bộ'}</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-stone-600 mb-1">
                  Chiều cao (cm)
                </label>
                <input
                  type="number"
                  min={120}
                  max={230}
                  value={heightCm}
                  onChange={(e) => setHeightCm(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono-tabular bg-theme-canvas border border-stone-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-stone-600 mb-1 flex items-center gap-1">
                  <Scale className="w-3 h-3" /> Cân nặng (kg)
                </label>
                <input
                  type="number"
                  min={30}
                  max={200}
                  value={weightKg}
                  onChange={(e) => setWeightKg(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono-tabular bg-theme-canvas border border-stone-300 rounded-lg"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-stone-100">
              <div>
                <label className="block text-xs font-medium text-theme-primary mb-1">
                  Vòng 1 · Ngực (cm)
                </label>
                <input
                  type="number"
                  min={55}
                  max={160}
                  value={bustCm}
                  onChange={(e) => setBustCm(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono-tabular bg-theme-canvas border border-stone-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-emerald-900 mb-1">
                  Vòng 2 · Eo (cm)
                </label>
                <input
                  type="number"
                  min={45}
                  max={150}
                  value={waistCm}
                  onChange={(e) => setWaistCm(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono-tabular bg-theme-canvas border border-stone-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-900 mb-1">
                  Vòng 3 · Hông (cm)
                </label>
                <input
                  type="number"
                  min={60}
                  max={165}
                  value={hipCm}
                  onChange={(e) => setHipCm(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono-tabular bg-theme-canvas border border-stone-300 rounded-lg"
                  required
                />
              </div>
            </div>

            {/* Dáng Người Tự Động Phân Tích theo Luật 1 */}
            {(() => {
              const body = calculateBodyShape(Number(bustCm) || 86, Number(waistCm) || 66, Number(hipCm) || 92);
              return (
                <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-300/80 text-stone-900 space-y-1.5 shadow-2xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                      <span>Dáng Người Tính Từ Số Đo (Luật 1)</span>
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-900">
                      {body.nameVi.split(' — ')[0]}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-700 leading-relaxed">
                    <strong>Quy tắc phối:</strong> {body.stylingRule}
                  </p>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    <strong>Đồ nên mặc:</strong> {body.recommendedCuts}
                  </p>
                  <p className="text-[11px] text-red-700/90 leading-relaxed">
                    <strong>Cần tránh:</strong> {body.avoidCuts}
                  </p>
                </div>
              );
            })()}

            {/* Dáng Mặt (Luật 2) & Tông Da (Luật 3) */}
            <div className="pt-3 border-t border-stone-100 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-stone-800 mb-1">
                  Dáng mặt (Luật Kiểu Tóc 2)
                </label>
                <select
                  value={faceShape}
                  onChange={(e) => setFaceShape(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-theme-canvas border border-stone-300 rounded-lg focus:outline-none focus:border-stone-900 cursor-pointer"
                >
                  {FACE_SHAPE_OPTIONS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-stone-500 mt-1 leading-tight">
                  {FACE_SHAPE_OPTIONS.find((f) => f.id === faceShape)?.hairRule ||
                    'Chọn dáng mặt để gợi ý kiểu tóc và mái che khuyết điểm.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-800 mb-1">
                  Tông da Undertone (Luật Makeup 3)
                </label>
                <select
                  value={undertone}
                  onChange={(e) => setUndertone(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-theme-canvas border border-stone-300 rounded-lg focus:outline-none focus:border-stone-900 cursor-pointer"
                >
                  {UNDERTONE_OPTIONS.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.label}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-stone-500 mt-1 leading-tight">
                  {UNDERTONE_OPTIONS.find((u) => u.id === undertone)?.paletteTip ||
                    'Chọn tông da để gợi ý màu mắt, son môi và má hồng.'}
                </p>
              </div>
            </div>
          </div>

          {/* Theme Primary Color Customizer Section */}
          <div className="p-4 rounded-xl bg-white border border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-900 flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-theme-primary" />
                <span>Chỉnh màu chủ đạo giao diện Web</span>
              </span>
              <span className="text-[11px] font-mono-tabular text-stone-500">
                {customPrimaryColor.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {THEME_PALETTES.map((palette) => {
                const isSelected = activeTheme.id === palette.id && customPrimaryColor === palette.primary;
                return (
                  <button
                    key={palette.id}
                    type="button"
                    onClick={() => onSelectTheme(palette)}
                    className={`p-2 rounded-lg border text-center flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-stone-900 bg-stone-100 shadow-2xs scale-[1.02]'
                        : 'border-stone-200 hover:border-stone-400 bg-white'
                    }`}
                    title={palette.description}
                  >
                    <span
                      className="w-6 h-6 rounded-full border border-black/15 shadow-2xs"
                      style={{ backgroundColor: palette.primary }}
                    />
                    <span className="text-[10px] font-medium text-stone-700 truncate w-full">
                      {palette.name.split(' (')[0]}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-3">
              <label className="text-xs text-stone-600">
                Hoặc tự chọn mã màu yêu thích của bạn:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={customPrimaryColor}
                  onChange={(e) => onSelectCustomColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border border-stone-300 bg-white p-0.5"
                />
                <span className="text-xs font-mono-tabular text-stone-700">
                  {customPrimaryColor}
                </span>
              </div>
            </div>
          </div>

          {/* Sticky Bottom Action Bar inside Form */}
          <div className="sticky bottom-0 z-20 bg-theme-canvas pt-3 pb-1 border-t border-stone-200 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onLogout}
                className="py-2.5 px-3.5 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Đăng xuất</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-4 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 text-xs font-semibold cursor-pointer"
              >
                Thoát
              </button>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 min-w-[200px] py-2.5 px-5 rounded-xl bg-theme-primary text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {isSaving ? 'Đang lưu...' : 'Lưu Hồ Sơ, Phong Cách & Đóng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
