import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  CameraOff,
  Upload,
  Sparkles,
  Check,
  RefreshCw,
  Shirt,
  UserCheck,
  Wand2,
  X,
  SwitchCamera,
} from 'lucide-react';
import { OutfitItem, UserProfile, calculateOutfitFit } from '../types';

interface ArCameraTryOnModalProps {
  isOpen: boolean;
  onClose: () => void;
  outfit: OutfitItem;
  outfits: OutfitItem[];
  onSelectOutfit: (outfit: OutfitItem) => void;
  onApplyCapturedOutfitToMannequin?: (capturedOutfit: OutfitItem) => void;
  profile: UserProfile;
  onSaveArTryOn: (outfit: OutfitItem, mode: 'ar_camera' | 'mannequin_3d', notes: string) => Promise<void>;
}

/**
 * Smart Canvas processor:
 * 1. Resizes captured/uploaded garment image to clean studio resolution
 * 2. Optionally removes uniform bright/wall background around the garment so it drapes cleanly on the Mannequin
 * 3. Samples dominant primary & secondary garment HEX colors
 */
function processGarmentCanvas(
  source: HTMLVideoElement | HTMLImageElement,
  removeUniformBackground: boolean
): {
  processedDataUrl: string;
  primaryColorHex: string;
  secondaryColorHex: string;
} {
  const canvas = document.createElement('canvas');
  const targetW = 600;
  const targetH = 800;
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return {
      processedDataUrl: '',
      primaryColorHex: '#6B4423',
      secondaryColorHex: '#7895B2',
    };
  }

  // Draw centered cover crop onto 600x800 canvas
  const srcW =
    source instanceof HTMLVideoElement ? source.videoWidth || 640 : source.naturalWidth || 600;
  const srcH =
    source instanceof HTMLVideoElement ? source.videoHeight || 480 : source.naturalHeight || 800;

  const scale = Math.max(targetW / srcW, targetH / srcH);
  const drawW = srcW * scale;
  const drawH = srcH * scale;
  const offsetX = (targetW - drawW) / 2;
  const offsetY = (targetH - drawH) / 2;

  ctx.drawImage(source, offsetX, offsetY, drawW, drawH);

  const imgData = ctx.getImageData(0, 0, targetW, targetH);
  const data = imgData.data;

  // Sample corner pixels to estimate background color
  const corners = [
    0,
    (targetW - 1) * 4,
    (targetH - 1) * targetW * 4,
    ((targetH - 1) * targetW + (targetW - 1)) * 4,
  ];
  let bgR = 0;
  let bgG = 0;
  let bgB = 0;
  corners.forEach((idx) => {
    bgR += data[idx];
    bgG += data[idx + 1];
    bgB += data[idx + 2];
  });
  bgR = Math.round(bgR / corners.length);
  bgG = Math.round(bgG / corners.length);
  bgB = Math.round(bgB / corners.length);

  // Sample center chest & lower region for dominant garment colors
  let topR = 0,
    topG = 0,
    topB = 0,
    topCount = 0;
  let botR = 0,
    botG = 0,
    botB = 0,
    botCount = 0;

  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const i = (y * targetW + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const distToBg = Math.sqrt(
        Math.pow(r - bgR, 2) + Math.pow(g - bgG, 2) + Math.pow(b - bgB, 2)
      );

      // If smart background removal is enabled, make pixels very close to corner background transparent
      if (removeUniformBackground && distToBg < 38) {
        data[i + 3] = 0;
      } else if (removeUniformBackground && distToBg < 54) {
        data[i + 3] = Math.round(((distToBg - 38) / 16) * 255);
      }

      // Accumulate center garment colors
      if (x > targetW * 0.3 && x < targetW * 0.7 && distToBg >= 32) {
        if (y > targetH * 0.2 && y < targetH * 0.48) {
          topR += r;
          topG += g;
          topB += b;
          topCount++;
        } else if (y >= targetH * 0.5 && y < targetH * 0.8) {
          botR += r;
          botG += g;
          botB += b;
          botCount++;
        }
      }
    }
  }

  if (removeUniformBackground) {
    ctx.putImageData(imgData, 0, 0);
  }

  const toHex = (r: number, g: number, b: number) =>
    '#' +
    [r, g, b]
      .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
      .join('');

  const primaryColorHex =
    topCount > 20 ? toHex(topR / topCount, topG / topCount, topB / topCount) : '#6B4423';
  const secondaryColorHex =
    botCount > 20 ? toHex(botR / botCount, botG / botCount, botB / botCount) : primaryColorHex;

  return {
    processedDataUrl: canvas.toDataURL('image/png', 0.9),
    primaryColorHex,
    secondaryColorHex,
  };
}

export const ArCameraTryOnModal: React.FC<ArCameraTryOnModalProps> = ({
  isOpen,
  onClose,
  outfit,
  outfits,
  onSelectOutfit,
  onApplyCapturedOutfitToMannequin,
  profile,
  onSaveArTryOn,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [inputTab, setInputTab] = useState<'camera' | 'upload'>('camera');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Garment capture mode: Full outfit/dress vs Shirt/Top only
  const [garmentCaptureMode, setGarmentCaptureMode] = useState<'full_outfit' | 'top_only'>(
    'full_outfit'
  );
  const [removeBgEnabled, setRemoveBgEnabled] = useState<boolean>(true);

  // Captured or Uploaded Garment State
  const [rawSourceDataUrl, setRawSourceDataUrl] = useState<string | null>(null);
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null);
  const [garmentName, setGarmentName] = useState<string>('Bộ Đồ Chụp Thực Tế Của Bạn');
  const [garmentSubtitle, setGarmentSubtitle] = useState<string>(
    'Trang phục được chụp/tải lên và tự động khớp tỷ lệ lên Manocanh 3 vòng.'
  );
  const [colorRule, setColorRule] = useState<string>(
    'Phối màu đồng điệu với tông trang phục bạn vừa chụp.'
  );
  const [proportionRule, setProportionRule] = useState<string>(
    'Canh chỉnh ôm vừa vặn theo vòng ngực, vòng eo và chiều cao trên Manocanh.'
  );
  const [accessoriesAdvice, setAccessoriesAdvice] = useState<string>(
    'Túi xách kẹp nách tối giản, khuyên tai thanh lịch và giày cùng tông.'
  );
  const [makeupToneAdvice, setMakeupToneAdvice] = useState<string>(
    'Tone Hồng Đào hoặc Cam Đất tự nhiên, son bóng nhẹ trong trẻo.'
  );
  const [hairstyleAdvice, setHairstyleAdvice] = useState<string>(
    'Tóc xoăn sóng lơi Hàn Quốc hoặc kẹp nửa đầu; hợp màu Nâu Trà Sữa / Nâu Hạt Dẻ.'
  );
  const [primaryHex, setPrimaryHex] = useState<string>('#6B4423');
  const [secondaryHex, setSecondaryHex] = useState<string>('#7895B2');

  const [isAnalyzingAi, setIsAnalyzingAi] = useState<boolean>(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const fitInfo = calculateOutfitFit(outfit, profile);

  const startCamera = async () => {
    setCameraError(null);
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      setCameraActive(false);
      setCameraError(
        'Trình duyệt chưa cấp quyền Camera hoặc thiết bị không có sẵn webcam. Bạn có thể bấm sang tab "Tải Ảnh Áo Quần Từ Máy" để chọn ảnh bộ đồ bất kỳ nhé!'
      );
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (isOpen && inputTab === 'camera' && !capturedImageUrl) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, inputTab, facingMode]);

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

  // Re-process cutout when user toggles removeBgEnabled on an already uploaded/captured image
  useEffect(() => {
    if (!rawSourceDataUrl) return;
    const img = new Image();
    img.onload = () => {
      const result = processGarmentCanvas(img, removeBgEnabled);
      setCapturedImageUrl(result.processedDataUrl);
      setPrimaryHex(result.primaryColorHex);
      setSecondaryHex(result.secondaryColorHex);
    };
    img.src = rawSourceDataUrl;
  }, [removeBgEnabled, rawSourceDataUrl]);

  if (!isOpen) return null;

  // Analyze captured/uploaded garment via Aura Vision (/api/analyze-garment)
  const analyzeGarmentWithAura = async (
    base64DataUrl: string,
    mode: 'full_outfit' | 'top_only'
  ) => {
    setIsAnalyzingAi(true);
    try {
      const res = await fetch('/api/analyze-garment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64DataUrl,
          mimeType: 'image/png',
          captureMode: mode,
          userProfile: {
            displayName: profile.displayName,
            heightCm: profile.heightCm,
            weightKg: profile.weightKg,
            bustCm: profile.bustCm,
            waistCm: profile.waistCm,
            hipCm: profile.hipCm,
            genderStyle: profile.genderStyle,
          },
        }),
      });
      const data = await res.json();
      if (data?.analysis) {
        const a = data.analysis;
        if (a.name) setGarmentName(a.name);
        if (a.subtitle) setGarmentSubtitle(a.subtitle);
        if (a.colorRule) setColorRule(a.colorRule);
        if (a.proportionRule) setProportionRule(a.proportionRule);
        if (a.accessories) setAccessoriesAdvice(a.accessories);
        if (a.makeupTone) setMakeupToneAdvice(a.makeupTone);
        if (a.hairstyleAndColor) setHairstyleAdvice(a.hairstyleAndColor);
        if (a.primaryColorHex && a.primaryColorHex.startsWith('#')) {
          setPrimaryHex(a.primaryColorHex);
        }
        if (a.secondaryColorHex && a.secondaryColorHex.startsWith('#')) {
          setSecondaryHex(a.secondaryColorHex);
        }
      }
    } catch {
      // Keep smart local defaults
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  // 1. Capture live camera frame of a shirt/outfit
  const handleCaptureFromCamera = () => {
    if (!videoRef.current || !cameraActive) return;
    // Save raw snapshot first
    const rawResult = processGarmentCanvas(videoRef.current, false);
    setRawSourceDataUrl(rawResult.processedDataUrl);

    const processed = processGarmentCanvas(videoRef.current, removeBgEnabled);
    setCapturedImageUrl(processed.processedDataUrl);
    setPrimaryHex(processed.primaryColorHex);
    setSecondaryHex(processed.secondaryColorHex);
    stopCamera();

    analyzeGarmentWithAura(processed.processedDataUrl, garmentCaptureMode);
  };

  // 2. Upload photo of a shirt/outfit from device
  const handleUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setRawSourceDataUrl(dataUrl);

      const img = new Image();
      img.onload = () => {
        const processed = processGarmentCanvas(img, removeBgEnabled);
        setCapturedImageUrl(processed.processedDataUrl);
        setPrimaryHex(processed.primaryColorHex);
        setSecondaryHex(processed.secondaryColorHex);
        analyzeGarmentWithAura(processed.processedDataUrl, garmentCaptureMode);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // 3. Apply the photographed/uploaded garment directly onto the Mannequin!
  const handleDressMannequinNow = async () => {
    const imageToDress = capturedImageUrl || outfit.imageUrl;

    const customOutfit: OutfitItem = {
      id: `custom_garment_${Date.now()}`,
      name: capturedImageUrl ? garmentName : outfit.name,
      subtitle: capturedImageUrl ? garmentSubtitle : outfit.subtitle,
      category: 'Dạo phố đương đại',
      styleTags: profile.favoriteStyles?.length ? profile.favoriteStyles : ['korean_casual'],
      targetGenders: ['female', 'male', 'neutral'],
      imageUrl: imageToDress,
      fabric: capturedImageUrl ? 'Trang phục chụp/nhập thực tế' : outfit.fabric,
      season: 'Bốn mùa',
      idealRatioNote: `Đã đồng bộ trực tiếp hình dáng trang phục lên Manocanh theo số đo ${profile.bustCm}-${profile.waistCm}-${profile.hipCm}cm.`,
      colorRule: capturedImageUrl ? colorRule : outfit.colorRule,
      proportionRule: capturedImageUrl ? proportionRule : outfit.proportionRule,
      isCustomCaptured: true,
      garmentCaptureMode,
      stylingExtras: {
        accessories: accessoriesAdvice,
        makeupTone: makeupToneAdvice,
        hairstyleAndColor: hairstyleAdvice,
        occasionFit: 'Phối theo số đo & hoàn cảnh cá nhân',
      },
      garmentSpecs: {
        shoulderScale: 1.04,
        waistTaper: 0.94,
        hipDrape: 1.08,
        lengthType: garmentCaptureMode === 'top_only' ? 'blazer_set' : 'midi_dress',
        primaryColor: primaryHex,
        secondaryColor: secondaryHex,
        accentColor: '#D4A373',
      },
      baseMeasurements: outfit.baseMeasurements,
    };

    onSelectOutfit(customOutfit);
    if (onApplyCapturedOutfitToMannequin) {
      onApplyCapturedOutfitToMannequin(customOutfit);
    }

    await onSaveArTryOn(
      customOutfit,
      'mannequin_3d',
      `Đã chụp/tải ảnh "${customOutfit.name}" và mặc trực tiếp lên Manocanh (${profile.bustCm}-${profile.waistCm}-${profile.hipCm}cm)`
    );

    setSavedNotice('Đã mặc bộ đồ vừa chụp/nhập lên Manocanh thành công!');
    setTimeout(() => {
      setSavedNotice(null);
      onClose();
    }, 450);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-6xl rounded-2xl bg-[#FAF8F5] text-[#18181B] border border-stone-300 shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 max-h-[92vh]"
      >
        {/* Left 7 Cols: Garment Camera Capture / Photo Upload & Mannequin Preview */}
        <div className="lg:col-span-7 relative bg-[#141416] min-h-[460px] sm:min-h-[540px] flex flex-col justify-between overflow-hidden">
          {/* Top Mode Bar inside Viewport */}
          <div className="relative z-20 p-3.5 bg-black/75 border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 bg-white/10 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setCapturedImageUrl(null);
                  setRawSourceDataUrl(null);
                  setInputTab('camera');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  inputTab === 'camera'
                    ? 'bg-amber-500 text-stone-950'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>1. Máy Ảnh Chụp Áo / Bộ Đồ</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setInputTab('upload');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  inputTab === 'upload'
                    ? 'bg-amber-500 text-stone-950'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>2. Tải Ảnh Áo Quần Từ Máy</span>
              </button>
            </div>

            {/* Garment Type Selector: Full Outfit vs Shirt/Top Only */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  setGarmentCaptureMode(
                    garmentCaptureMode === 'full_outfit' ? 'top_only' : 'full_outfit'
                  )
                }
                className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-amber-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <Shirt className="w-3.5 h-3.5" />
                <span>
                  {garmentCaptureMode === 'full_outfit'
                    ? 'Chế độ: Chụp Cả Bộ Đồ / Đầm'
                    : 'Chế độ: Chỉ Chụp Áo Lẻ (Phối quần trên Manocanh)'}
                </span>
              </button>
            </div>
          </div>

          {/* Center Viewport: Either Live Camera / Upload Dropzone OR Captured Garment on Mannequin Preview */}
          <div className="relative z-10 flex-1 flex items-center justify-center p-4 overflow-hidden">
            {capturedImageUrl ? (
              /* PREVIEW: MANNEQUIN WEARING THE EXACT CAPTURED/UPLOADED GARMENT */
              <div className="w-full h-full flex flex-col sm:flex-row items-center justify-center gap-6 p-2">
                {/* Original Captured/Cutout Garment */}
                <div className="flex flex-col items-center">
                  <span className="text-[11px] text-amber-300 font-semibold mb-2">
                    Ảnh trang phục đã nhận diện:
                  </span>
                  <div className="w-44 h-60 rounded-2xl border-2 border-amber-400/70 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:12px_12px] bg-stone-100 overflow-hidden shadow-xl flex items-center justify-center p-2">
                    <img
                      src={capturedImageUrl}
                      alt={garmentName}
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>

                {/* Live Mini-Mannequin Wearing the Exact Captured Garment */}
                <div className="flex flex-col items-center">
                  <span className="text-[11px] text-emerald-300 font-semibold mb-2">
                    Manocanh mặc thử bộ đồ vừa chụp ({profile.bustCm}-{profile.waistCm}-{profile.hipCm}cm):
                  </span>
                  <div className="relative w-48 h-64 rounded-2xl bg-[#FAF8F5] border-2 border-emerald-400/80 shadow-xl flex items-center justify-center overflow-hidden">
                    {/* Mannequin Base Silhouette */}
                    <svg viewBox="0 0 200 320" className="w-full h-full">
                      <ellipse cx="100" cy="300" rx="45" ry="8" fill="#D6D3D1" />
                      <line
                        x1="100"
                        y1="25"
                        x2="100"
                        y2="300"
                        stroke="#A8A29E"
                        strokeDasharray="3 3"
                      />
                      {/* Head & Neck */}
                      <ellipse cx="100" cy="34" rx="13" ry="17" fill="#D5BDA5" stroke="#8C735B" />
                      <rect x="94" y="49" width="12" height="14" rx="3" fill="#D5BDA5" />
                      {/* Mannequin Arms & Legs behind garment */}
                      <path
                        d="M 64 64 Q 100 58 136 64 L 130 115 L 122 145 L 132 195 L 116 290 L 104 290 L 100 205 L 96 290 L 84 290 L 68 195 L 78 145 L 70 115 Z"
                        fill="#D5BDA5"
                        stroke="#8C735B"
                      />
                      {/* If user only captured a shirt, draw trousers on lower body */}
                      {garmentCaptureMode === 'top_only' && (
                        <path
                          d="M 76 145 L 124 145 L 134 195 L 120 290 L 103 290 L 100 202 L 97 290 L 80 290 L 66 195 Z"
                          fill="#475569"
                        />
                      )}
                    </svg>
                    {/* Exact Captured Garment Overlay Fitted on Mannequin Torso/Body */}
                    <img
                      src={capturedImageUrl}
                      alt="Mannequin Wearing Captured Outfit"
                      className={`absolute left-1/2 -translate-x-1/2 object-contain pointer-events-none drop-shadow-[0_8px_16px_rgba(0,0,0,0.28)] ${
                        garmentCaptureMode === 'top_only'
                          ? 'top-[17%] w-[72%] h-[46%]'
                          : 'top-[16%] w-[78%] h-[76%]'
                      }`}
                    />
                  </div>
                </div>
              </div>
            ) : inputTab === 'camera' ? (
              /* LIVE CAMERA VIEWPORT FOR PHOTOGRAPHING A SHIRT OR OUTFIT */
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className={`absolute inset-0 w-full h-full object-cover ${
                    facingMode === 'user' ? 'scale-x-[-1]' : ''
                  } ${cameraActive ? 'opacity-100' : 'opacity-0'}`}
                />

                {!cameraActive && (
                  <div className="relative z-10 max-w-md text-center p-6 rounded-2xl bg-black/65 border border-white/15 space-y-3">
                    <Camera className="w-10 h-10 text-amber-400 mx-auto" />
                    <p className="text-xs sm:text-sm text-amber-100 leading-relaxed">
                      {cameraError || 'Đang mở ống kính máy ảnh để chụp áo / trang phục...'}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setInputTab('upload')}
                        className="px-4 py-2 rounded-xl bg-amber-500 text-stone-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Chọn Ảnh Áo Quần Từ Máy Ngay</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Garment Alignment Frame Guide */}
                {cameraActive && (
                  <div className="pointer-events-none relative z-10 w-64 sm:w-72 h-80 sm:h-96 border-2 border-dashed border-amber-300/80 rounded-3xl flex flex-col justify-between p-4 bg-black/15">
                    <div className="text-center">
                      <span className="px-3 py-1 rounded-full bg-black/75 text-amber-300 text-[11px] font-semibold">
                        Đặt Áo hoặc Bộ Đồ Vào Giữa Khung Này
                      </span>
                    </div>
                    <div className="text-center">
                      <span className="px-2.5 py-1 rounded bg-black/70 text-white text-[10px]">
                        Sau khi chụp, Manocanh sẽ mặc bộ đồ y hệt ảnh này
                      </span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* UPLOAD PHOTO DROPZONE VIEWPORT */
              <div className="w-full max-w-md rounded-2xl bg-white/10 border-2 border-dashed border-amber-300/60 p-8 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center mx-auto">
                  <Upload className="w-7 h-7 text-amber-300" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-white">
                    Tải Ảnh Áo Hoặc Bộ Đồ Lên Để Manocanh Mặc Thử
                  </h4>
                  <p className="text-xs text-stone-300 leading-relaxed">
                    Chọn bất kỳ bức ảnh áo sơ mi, áo kiểu, đầm hoặc cả bộ đồ từ điện thoại/máy tính của bạn. Hệ thống sẽ tách nền và mặc y hệt lên Manocanh theo số đo 3 vòng của bạn!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs sm:text-sm inline-flex items-center gap-2 cursor-pointer shadow-lg"
                >
                  <Upload className="w-4 h-4" />
                  <span>Chọn Ảnh Trang Phục Từ Thiết Bị</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUploadFile}
                  className="hidden"
                />
              </div>
            )}
          </div>

          {/* Bottom Camera Action Toolbar */}
          <div className="relative z-20 p-4 bg-black/80 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
            {capturedImageUrl ? (
              <div className="flex flex-wrap items-center gap-2 w-full justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCapturedImageUrl(null);
                      setRawSourceDataUrl(null);
                      if (inputTab === 'camera') startCamera();
                    }}
                    className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Chụp / Chọn Ảnh Khác</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRemoveBgEnabled(!removeBgEnabled)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer border ${
                      removeBgEnabled
                        ? 'bg-emerald-600/90 text-white border-emerald-400'
                        : 'bg-white/10 text-stone-300 border-white/20'
                    }`}
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>{removeBgEnabled ? 'Đã tách nền sáng quanh áo' : 'Giữ nguyên nền ảnh'}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/40 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Đổi ảnh từ máy</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2 w-full">
                <div className="flex items-center gap-2">
                  {cameraActive ? (
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-3 py-2 rounded-xl bg-red-900/70 hover:bg-red-800 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                    >
                      <CameraOff className="w-3.5 h-3.5" />
                      <span>Tắt Camera</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setInputTab('camera');
                        startCamera();
                      }}
                      className="px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Mở Camera</span>
                    </button>
                  )}

                  {cameraActive && (
                    <button
                      type="button"
                      onClick={() =>
                        setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
                      }
                      className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-stone-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                    >
                      <SwitchCamera className="w-3.5 h-3.5" />
                      <span>Đổi ống kính trước/sau</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {cameraActive && (
                    <button
                      type="button"
                      onClick={handleCaptureFromCamera}
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-lg"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Chụp Áo / Bộ Đồ Này</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Tải ảnh lên</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUploadFile}
                    className="hidden"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 5 Cols: Aura Garment Analysis + Dress Mannequin Controls */}
        <div className="lg:col-span-5 p-5 sm:p-6 flex flex-col justify-between bg-[#FAF8F5] overflow-y-auto">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-stone-200">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-theme-primary">
                  Studio Chụp & Nhập Ảnh Áo Ướm Lên Manocanh
                </span>
                <h3 className="font-serif-display text-xl sm:text-2xl font-bold text-stone-900 mt-0.5 leading-snug">
                  {capturedImageUrl ? garmentName : outfit.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-semibold text-stone-700 hover:text-white bg-white hover:bg-stone-900 border border-stone-300 rounded-xl cursor-pointer transition-colors flex items-center gap-1 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
                <span>Đóng</span>
              </button>
            </div>

            {savedNotice && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{savedNotice}</span>
              </div>
            )}

            {isAnalyzingAi ? (
              <div className="p-4 rounded-xl bg-white border border-stone-200 flex items-center gap-3 text-xs text-stone-700">
                <RefreshCw className="w-4 h-4 animate-spin text-theme-primary shrink-0" />
                <span>
                  AI Aura đang quét phom áo vừa chụp, trích xuất màu sắc và gợi ý phụ kiện, tone makeup & kiểu tóc...
                </span>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-white border border-stone-200 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-theme-primary" />
                    <span>Nhận diện Trang phục & Gợi ý từ AI Aura:</span>
                  </span>
                  <span className="text-[11px] font-mono-tabular text-theme-primary font-semibold">
                    Size {fitInfo.recommendedSize} ({fitInfo.fitScore}%)
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] text-stone-500 mb-1">
                    Tên bộ đồ khi lưu vào Tủ Đồ & Manocanh:
                  </label>
                  <input
                    type="text"
                    value={garmentName}
                    onChange={(e) => setGarmentName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-semibold bg-theme-canvas border border-stone-300 rounded-lg"
                  />
                </div>

                <div className="space-y-1.5 pt-1 text-[11px] text-stone-700 leading-relaxed">
                  <p>
                    <strong className="text-stone-900">Phối màu & Tỷ lệ:</strong> {colorRule}{' '}
                    {proportionRule}
                  </p>
                  <p>
                    <strong className="text-stone-900">Phụ kiện đi kèm:</strong> {accessoriesAdvice}
                  </p>
                  <p>
                    <strong className="text-stone-900">Tone Makeup gợi ý:</strong> {makeupToneAdvice}
                  </p>
                  <p>
                    <strong className="text-stone-900">Kiểu tóc & Màu tóc:</strong> {hairstyleAdvice}
                  </p>
                </div>
              </div>
            )}

            {/* Quick pick from existing wardrobe if user wants to test immediately */}
            <div>
              <p className="text-xs font-semibold text-stone-700 mb-2">
                Hoặc chọn nhanh mẫu áo/bộ đồ có sẵn để mặc lên Manocanh ({outfits.length} bộ):
              </p>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                {outfits.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setRawSourceDataUrl(item.imageUrl);
                      setGarmentName(item.name);
                      setGarmentSubtitle(item.subtitle);
                      setColorRule(item.colorRule);
                      setProportionRule(item.proportionRule);
                      onSelectOutfit(item);
                    }}
                    className={`p-2 rounded-lg border text-left flex items-center gap-2 cursor-pointer transition-colors ${
                      item.id === outfit.id && !capturedImageUrl
                        ? 'border-stone-900 bg-stone-900 text-white'
                        : 'border-stone-200 bg-white text-stone-800 hover:border-stone-400'
                    }`}
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      className="w-9 h-11 rounded object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{item.name}</p>
                      <p className="text-[10px] text-stone-500 truncate">{item.category}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Primary CTA: Dress Mannequin with the Captured/Uploaded Garment */}
          <div className="pt-4 mt-4 border-t border-stone-200 space-y-2">
            <button
              type="button"
              onClick={handleDressMannequinNow}
              className="w-full py-3.5 px-4 rounded-xl bg-theme-primary text-white text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md hover:opacity-95"
            >
              <UserCheck className="w-4 h-4" />
              <span>Mặc Bộ Đồ Này Lên Manocanh Ngay</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
