import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Send,
  X,
  MessageCircle,
  Camera,
  RefreshCw,
  MapPin,
  CloudSun,
  ExternalLink,
  Compass,
  Sliders,
  Check,
  RotateCcw,
  Palette,
  Scissors,
  Brain,
  Globe,
  Zap,
  Trash2,
} from 'lucide-react';
import {
  CURATED_OUTFITS,
  FASHION_STYLE_OPTIONS,
  OutfitItem,
  UserProfile,
  AuraLearnedContext,
  calculateOutfitFit,
  calculateBodyShape,
  FACE_SHAPE_OPTIONS,
  UNDERTONE_OPTIONS,
} from '../types';
import {
  analyzeChatMessageContext,
  loadChatHistory,
  saveChatHistory,
  saveAuraMemory,
} from '../utils/auraMemory';

interface AiStylistChatBoxProps {
  profile: UserProfile;
  onSelectOutfitForAr: (outfit: OutfitItem) => void;
  onSelectOutfitForMannequin: (outfit: OutfitItem) => void;
  learnedContext?: AuraLearnedContext | null;
  onLearnedContextUpdate?: (context: AuraLearnedContext) => void;
}

interface GroundingSource {
  uri: string;
  title: string;
}

export interface ColorSwatchItem {
  label: string;
  name: string;
  hex: string;
}

export interface SampleCardData {
  outfitId: string;
  outfitName: string;
  imageUrl: string;
  fitScore: number;
  highlightBenefit: string;
  topColor: ColorSwatchItem;
  bottomColor: ColorSwatchItem;
  lipColor: ColorSwatchItem;
  eyeColor: ColorSwatchItem;
  hairstyleName: string;
  makeupLookName: string;
  fabricNote: string;
  isCustomSvg?: boolean;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  suggestedOutfitId?: string;
  sampleCard?: SampleCardData;
  sources?: GroundingSource[];
}

interface OccasionPreset {
  id: string;
  label: string;
  lighting: string;
  prompt: string;
}

const OCCASION_PRESETS: OccasionPreset[] = [
  {
    id: 'concert_flash',
    label: 'Concert / Flash',
    lighting: 'Stage/Flash',
    prompt:
      'Tối nay lúc 7h mình đi xem concert ngoài trời, đứng khu Fanzone nóng đông người, chụp flash nhiều. Aura tư vấn trang phục, kiểu tóc và makeup chống lóa flash nhé!',
  },
  {
    id: 'di_an_toi',
    label: 'Tiệc tối / Đèn vàng',
    lighting: 'Warm Dim Light',
    prompt:
      'Tối nay mình đi ăn tối hẹn hò dưới ánh đèn vàng lãng mạn. Aura gợi ý bộ đồ tôn dáng quyến rũ, kiểu tóc thu hút và makeup chuẩn ánh sáng ấm nhé!',
  },
  {
    id: 'di_hoc_led',
    label: 'Đi học (Đèn LED)',
    lighting: 'Indoor Cool LED',
    prompt:
      'Mình chuẩn bị đi học dưới đèn LED trắng mát ở trường. Aura tư vấn giúp mình cách phối đồ trẻ trung, thoải mái kèm tone makeup ấm không bị tái da nhé!',
  },
  {
    id: 'cong_so_led',
    label: 'Đi làm công sở',
    lighting: 'Indoor Cool LED',
    prompt:
      'Tư vấn giúp mình bộ đồ đi làm công sở thanh lịch, che khuyết điểm theo số đo kèm giày, túi xách, tone makeup tươi tắn dưới đèn LED nhé.',
  },
  {
    id: 'ngoai_troi_ngay',
    label: 'Dạo phố ban ngày',
    lighting: 'Outdoor Daylight',
    prompt:
      'Hôm nay mình đi dạo phố cà phê ngoài trời ban ngày. Aura tư vấn trang phục năng động tôn tỷ lệ 1/3 - 2/3, lớp makeup nền mỏng nhẹ và kiểu tóc bay bổng nhé!',
  },
  {
    id: 'di_chua',
    label: 'Đi chùa / Lễ Phật',
    lighting: 'Outdoor Daylight',
    prompt:
      'Mình sắp đi chùa lễ Phật. Aura hãy dựa vào thời tiết hôm nay và số đo của mình để gợi ý bộ đồ kín đáo, thanh lịch hợp hoàn cảnh kèm tone makeup nhẹ nhàng nhé!',
  },
  {
    id: 'di_xem_phim',
    label: 'Đi xem phim / Cà phê',
    lighting: 'Warm Dim Light',
    prompt:
      'Mình sắp đi xem phim (phòng máy lạnh) và uống cà phê. Aura gợi ý phối đồ layering vừa giữ ấm nhẹ vừa chuẩn gu kèm kiểu tóc và tone makeup nhé!',
  },
];

interface QuickReply {
  id: string;
  text: string;
  prompt: string;
  lighting?: string;
}

const QUICK_REPLIES: QuickReply[] = [
  {
    id: 'qr_hoc_mat',
    text: 'Gợi ý đồ đi học không nóng',
    prompt: 'Aura gợi ý cho mình set đồ đi học chất liệu thoáng mát, không nóng trong thời tiết hôm nay kèm tone makeup tự nhiên nhé!',
    lighting: 'Indoor Cool LED',
  },
  {
    id: 'qr_flash',
    text: 'Makeup chụp flash ban đêm',
    prompt: 'Tối nay mình đi concert ban đêm chụp ảnh flash điện thoại nhiều, Aura tư vấn layout makeup lì không lóa flash và kiểu tóc nhé!',
    lighting: 'Stage/Flash',
  },
  {
    id: 'qr_doi_mau',
    text: 'Cho mình xem mẫu thử khác',
    prompt: 'Aura ơi, cho mình xem thêm một phương án phối đồ & mẫu thử khác để mình so sánh nhé!',
  },
  {
    id: 'qr_tiec_toi',
    text: 'Đi tiệc tối đèn vàng lãng mạn',
    prompt: 'Tối nay mình đi ăn tối hẹn hò dưới ánh đèn vàng lãng mạn, Aura tư vấn set đồ quyến rũ tôn eo và layout makeup bắt sáng nhé!',
    lighting: 'Warm Dim Light',
  },
  {
    id: 'qr_nhuom_toc',
    text: 'Nên nhuộm tóc màu gì tôn da?',
    prompt: 'Aura ơi, với dáng mặt và tông da của mình thì mình nên nhuộm tóc màu gì để tôn da sáng nhất? Gợi ý luôn kiểu tóc nhé!',
  },
  {
    id: 'qr_ton_eo',
    text: 'Phối đồ che bắp tay & tôn eo',
    prompt: 'Aura tư vấn cho mình cách phối đồ khéo léo che bắp tay và tôn trọn vòng eo theo số đo 3 vòng của mình nhé!',
  },
  {
    id: 'qr_cong_so',
    text: 'Set đồ công sở thanh lịch',
    prompt: 'Gợi ý cho mình set đồ đi làm công sở thanh lịch, thoải mái dưới điều hòa văn phòng kèm phụ kiện nhé!',
    lighting: 'Indoor Cool LED',
  },
  {
    id: 'qr_dam_hot',
    text: 'Gợi ý mẫu đầm tôn dáng',
    prompt: 'Aura gợi ý cho mình mẫu đầm liền tôn vòng eo, hợp với số đo 3 vòng và phong cách của mình nhé!',
    lighting: 'Warm Dim Light',
  },
  {
    id: 'qr_google_trends',
    text: '🔍 Xu hướng thời trang 2026 (Google Search)',
    prompt: 'Aura hãy tra cứu Google Search xu hướng phối đồ và đầm hot nhất năm 2026 hợp với dáng người của mình nhé!',
  },
];

const LIGHTING_OPTIONS = [
  { id: 'Outdoor Daylight', label: 'Ban ngày ngoài trời', tip: 'Nền cushion mỏng nhẹ SPF, son bóng' },
  { id: 'Indoor Cool LED', label: 'Đèn trắng LED văn phòng', tip: 'Má hồng ấm đào/cam sữa để da không tái' },
  { id: 'Warm Dim Light', label: 'Đèn vàng / Tiệc tối', tip: 'Nền dewy, nhũ mắt, son đỏ rượu / đất' },
  { id: 'Stage/Flash', label: 'Flash / Concert / Sân khấu', tip: 'Nền lì không silica, má đậm 1.5x' },
];

/**
 * Component hiển thị tin nhắn mượt mà, loại bỏ ký hiệu '**' thô kệch, định dạng chữ đậm và đoạn văn tự nhiên
 */
const FormattedChatMessage: React.FC<{ text: string; role: 'user' | 'model' }> = ({ text, role }) => {
  if (role === 'user') {
    return <p className="whitespace-pre-line">{text.replace(/\*\*/g, '')}</p>;
  }

  const lines = text.split('\n');

  return (
    <div className="space-y-2 text-xs leading-relaxed text-stone-800">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-0.5" />;

        // Clean parts without awkward asterisks
        const parts = line.split(/(\*\*.*?\*\*)/g);
        const isBullet = trimmed.startsWith('•') || trimmed.startsWith('-');

        return (
          <p key={idx} className={isBullet ? 'pl-2 text-stone-700' : ''}>
            {parts.map((part, pIdx) => {
              if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
                const boldText = part.slice(2, -2);
                return (
                  <strong key={pIdx} className="font-semibold text-stone-900">
                    {boldText}
                  </strong>
                );
              }
              const cleanPart = part.replace(/\*\*/g, '');
              return <span key={pIdx}>{cleanPart}</span>;
            })}
          </p>
        );
      })}
    </div>
  );
};

/**
 * Bản vẽ minh họa trang phục SVG thời trang động dựa trên màu Áo và màu Quần/Váy do AI gợi ý
 */
const DynamicOutfitIllustration: React.FC<{
  topHex: string;
  bottomHex: string;
  topName?: string;
  bottomName?: string;
  className?: string;
}> = ({ topHex, bottomHex, className = 'w-20 h-28' }) => {
  const safeTop = topHex && topHex.startsWith('#') ? topHex : '#5C3A21';
  const safeBottom = bottomHex && bottomHex.startsWith('#') ? bottomHex : '#2B2B2B';

  return (
    <div
      className={`relative rounded-xl overflow-hidden bg-gradient-to-b from-stone-100 to-stone-200 border border-stone-200 shadow-2xs flex flex-col items-center justify-center p-1 group-hover:scale-105 transition-transform duration-300 ${className}`}
      title="Bản vẽ màu AI gợi ý"
    >
      <svg viewBox="0 0 100 140" className="w-full h-full drop-shadow-xs">
        <defs>
          <linearGradient id={`topGrad_${safeTop.replace('#', '')}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={safeTop} stopOpacity="1" />
            <stop offset="100%" stopColor={safeTop} stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id={`bottomGrad_${safeBottom.replace('#', '')}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={safeBottom} stopOpacity="1" />
            <stop offset="100%" stopColor={safeBottom} stopOpacity="0.88" />
          </linearGradient>
        </defs>
        {/* Mannequin neck */}
        <circle cx="50" cy="14" r="7" fill="#E7E5E4" stroke="#D6D3D1" strokeWidth="1" />
        <path d="M47 21 L53 21 L52 26 L48 26 Z" fill="#D6D3D1" />
        
        {/* Top Garment (Chic silhouette) */}
        <path
          d="M34 26 C42 29 58 29 66 26 L74 38 C70 42 66 40 64 36 L62 58 C54 62 46 62 38 58 L36 36 C34 40 30 42 26 38 Z"
          fill={`url(#topGrad_${safeTop.replace('#', '')})`}
          stroke="#383838"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Waistband cinch */}
        <path d="M38 58 Q50 63 62 58" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="2,2" opacity="0.6" />
        
        {/* Bottom Garment (Flared / Trousers silhouette) */}
        <path
          d="M38 58 Q50 63 62 58 L72 108 C64 112 36 112 28 108 Z"
          fill={`url(#bottomGrad_${safeBottom.replace('#', '')})`}
          stroke="#383838"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Crease lines */}
        <line x1="44" y1="60" x2="40" y2="109" stroke="#000000" strokeWidth="0.8" opacity="0.2" />
        <line x1="50" y1="61" x2="50" y2="111" stroke="#000000" strokeWidth="0.8" opacity="0.2" />
        <line x1="56" y1="60" x2="60" y2="109" stroke="#000000" strokeWidth="0.8" opacity="0.2" />
      </svg>
      <div className="absolute bottom-1 px-1 py-0.5 rounded bg-black/60 text-[7px] font-mono font-medium text-white tracking-wider backdrop-blur-xs">
        BẢN VẼ MÀU AI
      </div>
    </div>
  );
};

export const AiStylistChatBox: React.FC<AiStylistChatBoxProps> = ({
  profile,
  onSelectOutfitForAr,
  onSelectOutfitForMannequin,
  learnedContext,
  onLearnedContextUpdate,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOccasion, setSelectedOccasion] = useState<string>('Tự do / Mọi hoàn cảnh');
  const [activeFaceShape, setActiveFaceShape] = useState<string>(profile.faceShape || 'round');
  const [activeUndertone, setActiveUndertone] = useState<string>(profile.undertone || 'warm');
  const [activeLighting, setActiveLighting] = useState<string>('Outdoor Daylight');
  const [showTuningDrawer, setShowTuningDrawer] = useState<boolean>(false);
  const [appliedOutfitId, setAppliedOutfitId] = useState<string | null>(null);
  const [useSearchGrounding, setUseSearchGrounding] = useState<boolean>(true);
  const [modelMode, setModelMode] = useState<'flash_search' | 'flash_lite'>('flash_search');

  const [weatherInfo, setWeatherInfo] = useState<{
    city: string;
    temperature: number;
    conditionText: string;
    humidity: number;
  }>({
    city: 'TP. Hồ Chí Minh',
    temperature: 30,
    conditionText: 'Nắng ấm dễ chịu',
    humidity: 68,
  });

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (profile.faceShape) setActiveFaceShape(profile.faceShape);
    if (profile.undertone) setActiveUndertone(profile.undertone);
  }, [profile.faceShape, profile.undertone]);

  const bodyShapeAnalysis = useMemo(
    () => calculateBodyShape(profile.bustCm, profile.waistCm, profile.hipCm),
    [profile.bustCm, profile.waistCm, profile.hipCm]
  );

  const genderPool = useMemo(() => {
    return profile.genderStyle === 'neutral'
      ? CURATED_OUTFITS
      : CURATED_OUTFITS.filter((o) => o.targetGenders.includes(profile.genderStyle));
  }, [profile.genderStyle]);

  const defaultOutfit = genderPool[0] || CURATED_OUTFITS[1];
  const initialFit = calculateOutfitFit(defaultOutfit, profile);

  // Sync live weather context for Aura
  useEffect(() => {
    const cityMap: Record<string, { name: string; lat: number; lon: number }> = {
      tphcm: { name: 'TP. Hồ Chí Minh', lat: 10.7769, lon: 106.7009 },
      hanoi: { name: 'Hà Nội', lat: 21.0285, lon: 105.8542 },
      danang: { name: 'Đà Nẵng', lat: 16.0544, lon: 108.2022 },
      dalat: { name: 'Đà Lạt', lat: 11.9404, lon: 108.4583 },
      cantho: { name: 'Cần Thơ', lat: 10.0452, lon: 105.7469 },
    };
    const savedCityId = localStorage.getItem('atelier_aura_city_id') || 'tphcm';
    const cityObj = cityMap[savedCityId] || cityMap.tphcm;

    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${cityObj.lat}&longitude=${cityObj.lon}&current=temperature_2m,relative_humidity_2m,weather_code&timezone=Asia%2FBangkok`
    )
      .then((r) => r.json())
      .then((data) => {
        if (data?.current) {
          const temp = Math.round(data.current.temperature_2m ?? 30);
          const hum = Math.round(data.current.relative_humidity_2m ?? 68);
          setWeatherInfo({
            city: cityObj.name,
            temperature: temp,
            conditionText: temp < 22 ? 'Trời se lạnh' : temp >= 30 ? 'Nắng ấm' : 'Trời dịu mát',
            humidity: hum,
          });
        }
      })
      .catch(() => {
        // Keep default weather context
      });
  }, [isOpen]);

  const userStyleNames = FASHION_STYLE_OPTIONS.filter((opt) =>
    (profile.favoriteStyles || []).includes(opt.id)
  ).map((o) => o.title);

  const faceShapeItem = FACE_SHAPE_OPTIONS.find((f) => f.id === activeFaceShape) || FACE_SHAPE_OPTIONS[0];
  const undertoneItem = UNDERTONE_OPTIONS.find((u) => u.id === activeUndertone) || UNDERTONE_OPTIONS[0];

  // Helper to construct rich SampleCardData with Swatches for an outfit
  const buildSampleCard = (
    outfit: OutfitItem,
    lighting: string,
    face: string,
    undertone: string
  ): SampleCardData => {
    const fit = calculateOutfitFit(outfit, profile);
    const isCool = undertone === 'cool';

    // Lip Swatch according to lighting and undertone
    let lipColorItem: ColorSwatchItem;
    if (lighting === 'Stage/Flash') {
      lipColorItem = isCool
        ? { label: 'Son môi', name: 'Đỏ Mận Lì', hex: '#881337' }
        : { label: 'Son môi', name: 'Đỏ Nâu Đất Lì', hex: '#8B261D' };
    } else if (lighting === 'Warm Dim Light') {
      lipColorItem = isCool
        ? { label: 'Son môi', name: 'Đỏ Rượu Vang', hex: '#701A32' }
        : { label: 'Son môi', name: 'Đỏ Đất Sang Trọng', hex: '#9A3412' };
    } else if (lighting === 'Indoor Cool LED') {
      lipColorItem = isCool
        ? { label: 'Son môi', name: 'Hồng Đào MLBB', hex: '#D87093' }
        : { label: 'Son môi', name: 'Cam Đào MLBB', hex: '#E07A5F' };
    } else {
      lipColorItem = isCool
        ? { label: 'Son môi', name: 'Hồng San Hô Bóng', hex: '#FF6B6B' }
        : { label: 'Son môi', name: 'Cam San Hô Bóng', hex: '#FF7F50' };
    }

    // Eyeshadow / Blush Swatch
    let eyeColorItem: ColorSwatchItem;
    if (lighting === 'Stage/Flash') {
      eyeColorItem = { label: 'Mắt / Má', name: 'Glitter Vàng Đồng & Má Nướng', hex: '#B87333' };
    } else if (lighting === 'Warm Dim Light') {
      eyeColorItem = { label: 'Mắt / Má', name: 'Shimmer Nâu Đồng Ấm', hex: '#A0522D' };
    } else if (lighting === 'Indoor Cool LED') {
      eyeColorItem = { label: 'Mắt / Má', name: 'Má Đào Ấm (Chống Tái Da)', hex: '#FA8072' };
    } else {
      eyeColorItem = { label: 'Mắt / Má', name: 'Be Nâu Tự Nhiên & Má Ửng Nắng', hex: '#D2B48C' };
    }

    // Hairstyle name
    let hairName = '';
    if (face === 'square') {
      hairName = 'Xoăn sóng lơi mềm mại & mái bay che xương hàm';
    } else if (face === 'long') {
      hairName = 'Mái thưa Hàn Quốc & uốn phồng ngang hai bên tai';
    } else if (face === 'heart') {
      hairName = 'Uốn phồng đuôi ngang cằm & mái bay che gò má';
    } else if (face === 'oval') {
      hairName = 'Sóng lơi buộc nửa đầu hoặc búi củ tỏi kẹp càng cua';
    } else {
      hairName = 'Rẽ ngôi lệch 7/3 tỉa layer xoăn lơi & mái bay dài';
    }

    // Makeup look name
    let makeupName = '';
    if (lighting === 'Stage/Flash') {
      makeupName = 'Idol Flash Matte Glam (Lớp nền lì chống flashback)';
    } else if (lighting === 'Warm Dim Light') {
      makeupName = 'Candlelight Dewy Romance (Căng bóng bắt sáng đèn vàng)';
    } else if (lighting === 'Indoor Cool LED') {
      makeupName = 'Campus & Office Fresh (Má hồng ấm rạng rỡ dưới đèn LED)';
    } else {
      makeupName = 'Clean Girl Sun-Kissed (Mỏng nhẹ tự nhiên SPF)';
    }

    return {
      outfitId: outfit.id,
      outfitName: outfit.name,
      imageUrl: outfit.imageUrl,
      fitScore: fit.fitScore,
      highlightBenefit: `Độ hợp dáng: ${fit.fitScore}% · Tôn eo ${profile.waistCm}cm theo tỷ lệ 1/3 - 2/3`,
      topColor: {
        label: 'Áo',
        name: outfit.garmentSpecs.primaryColor.startsWith('#') ? 'Màu chủ đạo' : outfit.garmentSpecs.primaryColor,
        hex: outfit.garmentSpecs.primaryColor,
      },
      bottomColor: {
        label: 'Quần / Váy',
        name: outfit.garmentSpecs.secondaryColor.startsWith('#') ? 'Màu phối' : outfit.garmentSpecs.secondaryColor,
        hex: outfit.garmentSpecs.secondaryColor,
      },
      lipColor: lipColorItem,
      eyeColor: eyeColorItem,
      hairstyleName: hairName,
      makeupLookName: makeupName,
      fabricNote: `Chất liệu ${outfit.fabric || 'cao cấp'}, phom dáng ${outfit.category}`,
    };
  };

  const initialSampleCard = useMemo(
    () => buildSampleCard(defaultOutfit, activeLighting, activeFaceShape, activeUndertone),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Load chat history from localStorage or fallback to friendly greeting
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const cached = loadChatHistory();
    if (Array.isArray(cached) && cached.length > 0) {
      return cached as ChatMessage[];
    }
    return [
      {
        id: 'welcome_msg',
        role: 'model',
        text: `Dạ Aura xin chào ${profile.displayName} nè! ✨ Mình là Chuyên viên CSKH kiêm Stylist riêng của bạn tại Smart Wardrobe.\n\nAura đã ghi nhận số đo của bạn (${profile.heightCm}cm · ${profile.weightKg}kg · 3 vòng ${profile.bustCm}-${profile.waistCm}-${profile.hipCm}cm) cùng thời tiết hôm nay (${weatherInfo.temperature}°C tại ${weatherInfo.city}).\n\nHôm nay bạn đang chuẩn bị đi đâu (đi học, đi làm, dự tiệc, đi chơi, hẹn hò hay đi chùa...) hoặc cần tìm outfit cho hoàn cảnh nào, hãy nhắn cho Aura biết nhé! Aura luôn ở đây sẵn sàng hỗ trợ bạn. 💕`,
      },
    ];
  });

  // Save chat history to localStorage
  useEffect(() => {
    saveChatHistory(messages);
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  const handleClearChatHistory = () => {
    const freshWelcome: ChatMessage = {
      id: `welcome_${Date.now()}`,
      role: 'model',
      text: `Dạ Aura đã làm mới cuộc trò chuyện cho ${profile.displayName} rồi nè! ✨\n\nHiện Aura đang bật chế độ ${
        modelMode === 'flash_lite'
          ? 'Phản hồi siêu tốc (Gemini 3.1 Flash-Lite)'
          : useSearchGrounding
          ? 'Gemini 3.8 Flash + Google Search Grounding trực tuyến'
          : 'Gemini 3.8 Flash Chuẩn'
      }.\n\nBạn muốn Aura tư vấn phối đồ, chọn đầm, hỏi đáp làm đẹp hay tra cứu xu hướng thời trang mới nhất trên Google Search thì nhắn cho Aura ngay nhé! 💕`,
    };
    setMessages([freshWelcome]);
    saveChatHistory([freshWelcome]);
  };

  // Detect which curated outfit matches Aura's recommendation and occasion
  const detectSuggestedOutfit = (replyText: string, queryText: string, excludeId?: string): OutfitItem => {
    const combined = `${replyText} ${queryText}`.toLowerCase();
    const pool = excludeId ? genderPool.filter((o) => o.id !== excludeId) : genderPool;
    const safePool = pool.length > 0 ? pool : genderPool;

    // Prioritize Dresses (Đầm / Váy liền) when user or Aura mentions đầm / váy liền
    if (
      combined.includes('đầm') ||
      combined.includes('váy liền') ||
      combined.includes('coquette') ||
      combined.includes('tiểu thư')
    ) {
      if (combined.includes('công sở') || combined.includes('đi làm') || combined.includes('blazer') || combined.includes('đi học')) {
        const dressOffice = safePool.find((o) => o.id === 'outfit_dress_blazer_pleated_25');
        if (dressOffice) return dressOffice;
      }
      if (combined.includes('tiệc') || combined.includes('ăn tối') || combined.includes('lụa') || combined.includes('đèn vàng')) {
        const dressSilk = safePool.find((o) => o.id === 'outfit_dress_silk_midi_evening_24');
        if (dressSilk) return dressSilk;
      }
      if (combined.includes('concert') || combined.includes('flash') || combined.includes('denim') || combined.includes('yếm')) {
        const dressDenim = safePool.find((o) => o.id === 'outfit_dress_halter_denim_26');
        if (dressDenim) return dressDenim;
      }
      const anyDress =
        safePool.find((o) => o.id === 'outfit_dress_coquette_ribbon_23') ||
        safePool.find((o) => o.id === 'outfit_dress_silk_midi_evening_24') ||
        safePool.find((o) => o.id === 'outfit_dress_blazer_pleated_25') ||
        safePool.find((o) => o.id === 'outfit_dress_halter_denim_26');
      if (anyDress) return anyDress;
    }

    if (
      combined.includes('thuyết trình') ||
      combined.includes('báo cáo') ||
      combined.includes('seminar') ||
      combined.includes('sơ mi') ||
      combined.includes('tennis')
    ) {
      const match =
        safePool.find((o) => o.id === 'outfit_preppy_shirt_tennis_14') ||
        safePool.find((o) => o.id === 'outfit_henley_denim_skirt_21');
      if (match) return match;
    }
    if (
      combined.includes('flash') ||
      combined.includes('concert') ||
      combined.includes('fanzone') ||
      combined.includes('cổ yếm') ||
      combined.includes('cháy')
    ) {
      const match =
        safePool.find((o) => o.id === 'outfit_espresso_halter_skirt_05') ||
        safePool.find((o) => o.id === 'outfit_henley_denim_skirt_21') ||
        safePool.find((o) => o.id === 'outfit_cross_halter_flared_18');
      if (match) return match;
    }
    if (
      combined.includes('chùa') ||
      combined.includes('lễ phật') ||
      combined.includes('kín đáo') ||
      combined.includes('linen') ||
      combined.includes('cổ tàu')
    ) {
      const match =
        safePool.find((o) => o.id === 'outfit_grey_bell_pearl_jeans_15') ||
        safePool.find((o) => o.id === 'outfit_linen_white_shirt_wide_01') ||
        safePool.find((o) => o.id === 'outfit_oversized_linen_wide_pants_02');
      if (match) return match;
    }
    if (
      combined.includes('đi học') ||
      combined.includes('trường') ||
      combined.includes('học sinh') ||
      combined.includes('sinh viên')
    ) {
      const match =
        safePool.find((o) => o.id === 'outfit_preppy_shirt_tennis_14') ||
        safePool.find((o) => o.id === 'outfit_sage_wrap_pleated_skirt_19') ||
        safePool.find((o) => o.id === 'outfit_henley_denim_skirt_21');
      if (match) return match;
    }
    if (
      combined.includes('đi làm') ||
      combined.includes('công sở') ||
      combined.includes('blazer') ||
      combined.includes('văn phòng')
    ) {
      const match =
        safePool.find((o) => o.id === 'outfit_preppy_shirt_tennis_14') ||
        safePool.find((o) => o.id === 'outfit_sage_wrap_pleated_skirt_19') ||
        safePool.find((o) => o.id === 'outfit_blazer_wool_trousers_03');
      if (match) return match;
    }
    if (
      combined.includes('chợ') ||
      combined.includes('siêu thị') ||
      combined.includes('thoáng mát') ||
      combined.includes('dạo phố') ||
      combined.includes('cà phê')
    ) {
      const match =
        safePool.find((o) => o.id === 'outfit_henley_denim_skirt_21') ||
        safePool.find((o) => o.id === 'outfit_sage_wrap_pleated_skirt_19') ||
        safePool.find((o) => o.id === 'outfit_espresso_halter_skirt_05');
      if (match) return match;
    }
    if (
      combined.includes('xem phim') ||
      combined.includes('máy lạnh') ||
      combined.includes('se lạnh') ||
      combined.includes('hoodie') ||
      combined.includes('áo khoác')
    ) {
      const match =
        safePool.find((o) => o.id === 'outfit_california_hoodie_skirt_08') ||
        safePool.find((o) => o.id === 'outfit_valley_hoodie_wide_pants_07') ||
        safePool.find((o) => o.id === 'outfit_espresso_knit_wide_pants_09');
      if (match) return match;
    }
    if (
      combined.includes('ăn tối') ||
      combined.includes('hẹn hò') ||
      combined.includes('dạ tiệc') ||
      combined.includes('quyến rũ') ||
      combined.includes('đèn vàng') ||
      combined.includes('corset')
    ) {
      const match =
        safePool.find((o) => o.id === 'outfit_cross_halter_flared_18') ||
        safePool.find((o) => o.id === 'outfit_espresso_corset_flared_02') ||
        safePool.find((o) => o.id === 'outfit_coquette_bow_skirt_13');
      if (match) return match;
    }
    if (
      combined.includes('nơ') ||
      combined.includes('coquette') ||
      combined.includes('tiểu thư') ||
      combined.includes('bèo nhún')
    ) {
      const match =
        safePool.find((o) => o.id === 'outfit_coquette_bow_skirt_13') ||
        safePool.find((o) => o.id === 'outfit_grey_bow_black_skirt_17');
      if (match) return match;
    }

    return safePool[0] || CURATED_OUTFITS[0];
  };

  // Helper: Phân loại ý định tin nhắn của người dùng
  const detectClientIntent = (userQuery: string, occasionContext?: string): 'greeting' | 'qa' | 'styling' => {
    const text = (userQuery || '').trim().toLowerCase();

    // 1. Chào hỏi xã giao
    const pureGreetingRegex =
      /^((xin\s+)?chào(\s+(bạn|aura|cậu|em|shop|ad|nàng))?|hi(\s+aura)?|hello(\s+aura)?|hé\s+lô|alo(\s+aura)?|hey(\s+aura)?|good\s+(morning|afternoon|evening))[\s!~.?]*$/i;
    const isWhoAreYou =
      text.includes('bạn là ai') ||
      text.includes('cậu là ai') ||
      text.includes('em là ai') ||
      text.includes('ai vậy') ||
      text.includes('bạn tên gì') ||
      text.includes('giới thiệu về bạn');

    if (
      (pureGreetingRegex.test(text) || isWhoAreYou) &&
      (!occasionContext || occasionContext === 'Tự do / Mọi hoàn cảnh')
    ) {
      return 'greeting';
    }

    // 2. Yêu cầu phối đồ / Sự kiện
    const isStylingRequest =
      text.includes('mặc gì') ||
      text.includes('phối đồ') ||
      text.includes('gợi ý đồ') ||
      text.includes('chọn đồ') ||
      text.includes('set đồ') ||
      text.includes('outfit') ||
      text.includes('mẫu thử') ||
      text.includes('thử đồ') ||
      text.includes('ướm đồ') ||
      text.includes('tôn eo') ||
      text.includes('che bắp tay') ||
      text.includes('che hông') ||
      text.includes('che đùi') ||
      text.includes('che bụng') ||
      text.includes('đi chơi') ||
      text.includes('đi học') ||
      text.includes('đi làm') ||
      text.includes('đi tiệc') ||
      text.includes('đi chùa') ||
      text.includes('lễ phật') ||
      text.includes('đi concert') ||
      text.includes('fanzone') ||
      text.includes('đi ăn tối') ||
      text.includes('hẹn hò') ||
      text.includes('thuyết trình') ||
      text.includes('hôm nay mặc') ||
      text.includes('tối nay mặc') ||
      text.includes('tư vấn giúp mình bộ') ||
      text.includes('tư vấn outfit') ||
      text.includes('đổi mẫu') ||
      (occasionContext && occasionContext !== 'Tự do / Mọi hoàn cảnh' && !pureGreetingRegex.test(text));

    if (isStylingRequest) {
      return 'styling';
    }

    // 3. Hỏi đáp thời trang / làm đẹp (Q&A)
    const isQA =
      text.includes('màu gì') ||
      text.includes('da ngăm') ||
      text.includes('da trắng') ||
      text.includes('tóc mỏng') ||
      text.includes('tóc dày') ||
      text.includes('tóc thưa') ||
      text.includes('nhuộm tóc') ||
      text.includes('màu tóc') ||
      text.includes('đám cưới') ||
      text.includes('mặt tròn') ||
      text.includes('mặt vuông') ||
      text.includes('mặt dài') ||
      text.includes('mặt trái xoan') ||
      text.includes('có nên') ||
      text.includes('sao lại') ||
      text.includes('tại sao') ||
      text.includes('như thế nào') ||
      text.includes('thế nào') ||
      text.includes('chất liệu') ||
      text.includes('vải gì') ||
      text.includes('là gì') ||
      text.includes('nghĩa là gì') ||
      text.includes('hợp với') ||
      text.endsWith('?');

    if (isQA) {
      return 'qa';
    }

    if (text.split(/\s+/).length <= 3) {
      return 'greeting';
    }

    return 'styling';
  };

  // Build natural conversational response without raw asterisks
  const buildLocalCustomerCareReply = (
    userQuestion: string,
    occasion: string,
    lighting: string,
    face: string,
    undertone: string,
    forcedOutfit?: OutfitItem,
    forcedIntent?: 'greeting' | 'qa' | 'styling'
  ): { text: string; outfit?: OutfitItem; intent: 'greeting' | 'qa' | 'styling' } => {
    const intent = forcedIntent || detectClientIntent(userQuestion, occasion);

    // 1. Nhánh Chào hỏi xã giao
    if (intent === 'greeting') {
      return {
        intent: 'greeting',
        text: `Dạ Aura chào ${profile.displayName} nè! ✨ Rất vui được gặp lại bạn tại Smart Wardrobe.\n\nHôm nay bạn đang chuẩn bị đi đâu (đi học, đi làm, dự tiệc, đi chơi, hẹn hò hay đi chùa...) hoặc cần tìm outfit cho dịp nào, hãy nhắn cho Aura biết nhé! Aura luôn ở đây sẵn sàng hỗ trợ bạn. 💕`,
      };
    }

    // 2. Nhánh Hỏi đáp kiến thức (Q&A)
    if (intent === 'qa') {
      const q = userQuestion.toLowerCase();
      let answer = '';

      if (q.includes('da ngăm') || (q.includes('ngăm') && q.includes('màu gì'))) {
        answer = `Dạ đối với làn da ngăm khỏe khoắn và ấm áp, bí quyết chọn màu đỉnh nhất là ưu tiên các gam màu tôn da tự nhiên nè! ✨\n\n• Gam màu nên chọn: Tone đất ấm (nâu caramel, cam cháy, be đậm), đỏ gạch (terracotta), xanh rêu/olive hoặc màu trắng kem (ivory) thanh lịch.\n• Gam màu nên tránh: Tránh những gam màu neon quá chói gắt hoặc tone xám xịt nhạt nhòa vì rất dễ khiến sắc tố da bị xỉn màu nha.\n\nNếu bạn muốn Aura phối thử một set đồ tôn da ngăm theo dáng người của bạn, hãy nhắn cho Aura biết dịp bạn sắp đi nha! 👗`;
      } else if (q.includes('tóc mỏng') || q.includes('tóc thưa') || q.includes('mỏng')) {
        answer = `Dạ với chất tóc mỏng, bí quyết tạo độ dày và bồng bềnh tự nhiên là cắt tỉa layer tầng kết hợp uốn sóng lơi nhẹ (wavy) hoặc uốn phồng chân tóc nè! 💇‍♀️\n\nBạn cũng có thể kết hợp mái bay dài qua gò má hoặc mái thưa Hàn Quốc để gương mặt thanh thoát hơn, tránh ép thẳng đơ sát da đầu nha. Bạn có muốn Aura gợi ý kiểu tóc chuẩn theo dáng mặt ${faceShapeItem.label} của bạn không nè? ✨`;
      } else if (q.includes('đám cưới') && (q.includes('trắng') || q.includes('màu gì'))) {
        answer = `Dạ theo quy tắc ứng xử thời trang dự tiệc cưới (wedding guest etiquette), bạn nên tránh diện trang phục toàn màu trắng tinh khôi vì đây là gam màu đặc quyền của cô dâu trong ngày trọng đại nè! ✨\n\nThay vào đó, bạn có thể chọn các gam pastel nhã nhặn như hồng phấn, xanh mint, be kem nhẹ nhàng hoặc đầm hoa nhí thanh lịch để vừa nổi bật, xinh đẹp mà lại cực kỳ tinh tế và tôn trọng cô dâu chú rể nha! 👗`;
      } else if (q.includes('nhuộm') || q.includes('màu tóc')) {
        const isCool = undertone === 'cool';
        const recommendedColors = isCool
          ? 'Nâu Khói Lạnh, Đỏ Cherry hoặc Nâu Trà Đen ánh tím'
          : 'Nâu Trà Sữa, Nâu Hạt Dẻ ấm, Nâu Hổ Phách hoặc Nâu Caramel';
        answer = `Dạ để màu tóc tôn da sáng bừng, quy tắc vàng là chọn theo Undertone da của bạn nè! Với tông da ${undertoneItem.label}, những gam màu lý tưởng nhất là ${recommendedColors}. Màu này vừa sang vừa giúp làm sáng bừng gương mặt dưới mọi ánh sáng nha! 💇‍♀️✨`;
      } else if (q.includes('váy 1') || q.includes('áo 2') || q.includes('áo 3') || q.includes('mix') || q.includes('phối váy')) {
        answer = `Dạ theo kho dữ liệu Mix & Match Học Đường & Coquette mà Aura đã được huấn luyện, bạn có thể áp dụng ngay các công thức phối chéo cực chuẩn sau nè: ✨\n\n• Công thức 1 (Váy 1 + Áo 2 / Áo 3): Chân váy xếp ly đen cạp cao (Váy 1) phối cùng Áo Blazer trắng kem cà vạt đen (Áo 2) hoặc Blazer be lửng cà vạt kẻ (Áo 3) — chuẩn Preppy Hàn Quốc tôn eo 1/3 - 2/3.\n• Công thức 2 (Váy 6 + Áo 5): Chân váy xếp ly đỏ tươi (Váy 6) phối cùng Áo Gile len xám sơ mi trắng cà vạt đỏ (Áo 5) — nổi bật, trẻ trung.\n• Công thức 3 (Váy 1 / Váy 8 + Áo đỏ trễ vai): Phối chân váy đen hoặc chân váy kẻ đỏ cùng Áo len đỏ trễ vai vạt chéo / Đầm nhung đỏ rượu cổ tim — quyến rũ cho buổi hẹn hò.\n• Giày & Túi đi kèm: Giày Mary Jane đế xuồng đính nơ hoặc Bốt da đen cổ cao, kết hợp Túi kẹp nách da bóng xích vàng nha! 👗👜`;
      } else {
        answer = `Dạ với câu hỏi này của ${profile.displayName}, trong thời trang nguyên tắc quan trọng nhất là sự cân bằng và phù hợp với vóc dáng của bạn. Khi chọn trang phục hay layout làm đẹp, bạn nên giữ một điểm nhấn chính (One Focal Point) để tổng thể hài hòa nhất nè! ✨\n\nNếu bạn đang chuẩn bị đồ cho một dịp cụ thể, hãy nhắn cho Aura biết hoàn cảnh để mình tư vấn trọn gói set đồ kèm kiểu tóc và makeup nha! 💕`;
      }

      return {
        intent: 'qa',
        text: answer,
      };
    }

    // 3. Nhánh Phối đồ (Styling Request)
    const q = `${userQuestion} ${occasion} ${lighting}`.toLowerCase();
    const outfit = forcedOutfit || detectSuggestedOutfit('', q);
    const fit = calculateOutfitFit(outfit, profile);
    const isHot = weatherInfo.temperature >= 28;

    // 1. Dáng người
    const bodyInfo = calculateBodyShape(profile.bustCm, profile.waistCm, profile.hipCm);
    let topRule = '';
    let bottomRule = '';

    switch (bodyInfo.shape) {
      case 'Pear':
        topRule = 'Áo sáng màu cổ yếm, trễ vai hoặc tay bồng để thu hút ánh nhìn lên thân trên và mở rộng vai.';
        bottomRule = 'Quần ống rộng cạp cao hoặc chân váy chữ A tối màu che gọn hông và đùi.';
        break;
      case 'Hourglass':
        topRule = 'Áo cổ chữ V ôm vừa vặn hoặc croptop tôn trọn vòng eo thắt tự nhiên.';
        bottomRule = 'Váy wrap dress, quần ống loe hoặc chân váy bút chì cạp cao ôm sát đường cong.';
        break;
      case 'Apple':
        topRule = 'Áo cổ V sâu hoặc đầm chiết chân ngực (Empire waist) mềm rủ, giải phóng vòng eo.';
        bottomRule = 'Chân váy chữ A trên gối hoặc quần ống đứng khoe đôi chân thon gọn.';
        break;
      case 'Inverted Triangle':
        topRule = 'Áo cổ V mềm rủ tối màu, cổ yếm nhẹ nhàng thu gọn bờ vai.';
        bottomRule = 'Chân váy xếp ly xòe, quần ống rộng sáng màu tạo độ phồng cho hông cân đối với vai.';
        break;
      default: // Rectangle
        topRule = 'Áo croptop bèo nhún, áo peplum hoặc chi tiết xếp nếp tạo đường cong.';
        bottomRule = 'Quần ống rộng cạp cao hoặc chân váy xòe chữ A tạo điểm thắt eo giả theo tỷ lệ 1/3 - 2/3.';
        break;
    }

    // 2. Kiểu tóc
    let hairName = '';
    let hairBangs = '';

    if (face === 'square') {
      hairName = isHot ? 'Búi cao đánh rối nhẹ với mái bay buông lơi' : 'Tóc xoăn sóng lơi bồng bềnh kết hợp mái bay';
      hairBangs = 'Mái bay dài qua xương hàm';
    } else if (face === 'long') {
      hairName = isHot ? 'Búi thấp kiểu Pháp kết hợp mái thưa' : 'Tóc uốn phồng hai bên tai kết hợp mái thưa Hàn Quốc';
      hairBangs = 'Mái thưa hoặc mái bằng';
    } else if (face === 'heart') {
      hairName = 'Tóc bob layer hoặc uốn phồng đuôi ngang cằm';
      hairBangs = 'Mái bay che gò má';
    } else if (face === 'oval') {
      hairName = isHot ? 'Tóc búi củ tỏi cao kẹp càng cua' : 'Tóc sóng lơi buộc nửa đầu tiểu thư';
      hairBangs = 'Mái bay nhẹ hoặc rẽ ngôi giữa thanh tú';
    } else {
      // round
      hairName = isHot ? 'Tóc buộc đuôi ngựa cao (High Ponytail) kết hợp mái bay' : 'Tóc rẽ ngôi lệch 7/3 tỉa layer uốn sóng lơi nhẹ';
      hairBangs = 'Mái bay rẽ ngôi lệch 7/3';
    }

    // 3. Makeup
    const isCool = undertone === 'cool';
    let baseFinish = '';
    let eyeDesc = '';
    let blushDesc = '';
    let lipColor = '';

    if (lighting === 'Stage/Flash' || q.includes('flash') || q.includes('concert')) {
      baseFinish = 'Matte lì bám chặt, không chứa hạt silica để chống lóa flash khi chụp ảnh ban đêm';
      eyeDesc = 'Eyeliner mắt mèo sắc nét, kẻ bọng mắt và chấm nhũ glitter giữa bầu mắt';
      blushDesc = isCool ? 'Má hồng mận lạnh đánh xéo đậm hơn 1.5 lần' : 'Má hồng cam nướng đánh xéo lên thái dương đậm hơn 1.5 lần';
      lipColor = isCool ? 'Son kem lì màu Đỏ Mận / Đỏ Rượu' : 'Son kem lì màu Đỏ Nâu Đất / Cam Cháy';
    } else if (lighting === 'Warm Dim Light' || q.includes('ăn tối') || q.includes('tiệc')) {
      baseFinish = 'Dewy căng bóng nhẹ, tăng highlight sống mũi và gò má thêm 30% để bắt sáng lung linh';
      eyeDesc = 'Mắt tán phấn màu nâu đồng hoặc hồng đất có nhũ shimmer mịn tạo chiều sâu';
      blushDesc = isCool ? 'Má hồng hồng khô phớt nhẹ' : 'Má hồng cam đào ấm áp';
      lipColor = isCool ? 'Son kem màu Đỏ Rượu Vang bóng nhẹ' : 'Son kem màu Đỏ Đất / Nâu Tây sắc nét';
    } else if (lighting === 'Indoor Cool LED' || q.includes('học') || q.includes('công sở')) {
      baseFinish = 'Semi-Matte ráo mịn mỏng nhẹ, che kỹ quầng thâm mắt';
      eyeDesc = 'Phấn mắt tone nâu trung tính lì, viền mí trong tự nhiên';
      blushDesc = isCool ? 'Má hồng tone hồng đào ấm để da không bị tái' : 'Má hồng tone cam sữa / đào ấm từ gò má hướng lên';
      lipColor = isCool ? 'Son tint bóng màu Hồng Đất MLBB' : 'Son tint bóng màu Cam Đào MLBB tươi tắn';
    } else {
      baseFinish = 'Cushion mỏng nhẹ kết hợp kem chống nắng nâng tông tự nhiên';
      eyeDesc = 'Mắt lì tông be nâu tự nhiên, chuốt mascara cong tơi';
      blushDesc = isCool ? 'Má hồng phớt màu cánh hoa hồng' : 'Má hồng cam đào phớt nhẹ như ửng nắng';
      lipColor = isCool ? 'Son tint bóng màu Hồng San Hô' : 'Son tint bóng màu Cam Đào Tươi Tắn';
    }

    // 4. Kiến thức phối chéo (Mix & Match), Giày, Túi & Tóc đã huấn luyện cho Aura AI
    let trainedMixNote = '';
    let trainedShoeBagNote = '';
    if (q.includes('học') || q.includes('thuyết trình') || q.includes('công sở') || q.includes('preppy')) {
      trainedMixNote = 'Gợi ý Mix & Match mở rộng: Bạn cũng có thể phối Chân váy xếp ly đen (Váy 1) cùng Áo Blazer trắng kem cà vạt đen (Áo 2) hoặc Blazer be lửng cà vạt kẻ (Áo 3); hay phối Chân váy đỏ (Váy 6) cùng Gile len xám sơ mi trắng (Áo 5).';
      trainedShoeBagNote = 'Giày Mary Jane đế xuồng 5cm đen bóng/trắng kem phối tất cao cổ + Túi kẹp nách da bóng xích vàng hoặc Túi yên ngựa đen.';
    } else if (q.includes('tiệc') || q.includes('ăn tối') || q.includes('hẹn hò') || q.includes('coquette') || q.includes('đầm')) {
      trainedMixNote = 'Gợi ý Mix & Match mở rộng: Bạn có thể chọn Đầm nhung đỏ rượu cổ trái tim tay bồng, Đầm nhung đỏ viền ren trắng tiểu thư, hoặc phối Áo len đỏ trễ vai vạt chéo cùng Chân váy xếp ly đen (Váy 1).';
      trainedShoeBagNote = 'Giày Mary Jane đỏ rượu viền ren đính nơ hoặc hồng phấn + Túi hộp chần bông dây xích vàng (dáng Chanel Vanity/Flap).';
    } else {
      trainedMixNote = 'Gợi ý Mix & Match mở rộng: Bạn có thể biến tấu Áo Blazer đen cropped (Áo 1) với Chân váy xếp ly đen (Váy 1) hoặc Sơ mi tay bồng cổ thủy thủ (Áo 7) với Chân váy caro hồng nâu (Váy 3).';
      trainedShoeBagNote = 'Bốt da đen cổ lửng (Combat Boots) hoặc Bốt cao cổ ngang gối (Knee-high Boots) hack dáng + Túi kẹp nách da bóng khóa tam giác.';
    }

    // 5. One Focal Point
    const focalPointRule =
      lighting === 'Stage/Flash' || lighting === 'Warm Dim Light'
        ? 'Khi môi chọn tone màu đậm sắc nét, phần mắt hãy giữ đường nét tinh gọn, nhấn nhũ vừa phải để gương mặt thu hút mà không bị nặng nề.'
        : 'Với trang phục đơn sắc thanh lịch, điểm nhấn sẽ rơi vào mái tóc bồng bềnh và lớp son môi tươi tắn, tạo cảm giác trong trẻo (Clean Girl) rất thu hút.';

    return {
      intent: 'styling',
      outfit,
      text: `Dạ Aura chào ${profile.displayName} nè! Lắng nghe chia sẻ của bạn về buổi ${occasion} dưới ánh sáng ${lighting} và thời tiết ${weatherInfo.temperature}°C tại ${weatherInfo.city}, Aura đã chọn cho bạn công thức vừa vặn nhất:

✨ Về dáng người & trang phục (${bodyInfo.nameVi.split('—')[0].trim()}):
Aura gợi ý bạn diện ${outfit.name} (độ hợp dáng ${fit.fitScore}%). Áo: ${topRule} Phối cùng quần/váy: ${bottomRule} Thiết kế cạp cao này áp dụng chuẩn tỷ lệ 1/3 - 2/3 giúp đôi chân bạn trông thanh thoát và dài hơn.
• ${trainedMixNote}

💇‍♀️ Về kiểu tóc & mái che khuyết điểm:
Hợp nhất với gương mặt ${faceShapeItem.label} là ${hairName} (${hairBangs}), có thể cài thêm băng đô trắng hoặc kẹp nơ lụa Coquette. Nếu bạn thích đổi màu tóc, gam ${isCool ? 'Nâu Khói Lạnh / Đỏ Cherry' : 'Nâu Trà Sữa / Nâu Hạt Dẻ'} sẽ nâng tone da sáng rạng rỡ.

💄 Về layout makeup theo ánh sáng (${lighting}):
Lớp nền: ${baseFinish}. Điểm nhấn mắt và má: ${eyeDesc}. ${blushDesc}. Màu son: ${lipColor}. Layout này xử lý ánh sáng ${lighting} cực tốt, giúp da luôn hồng hào và bền màu suốt cả buổi.

💡 Về giày, túi xách & cân bằng tổng thể:
${focalPointRule} Phụ kiện chuẩn gu: ${trainedShoeBagNote}

Aura đã gửi kèm Thẻ Mẫu Thử bên dưới với đầy đủ bảng màu Swatch. Bạn hãy bấm "Thử mẫu này lên Manocanh" để ngắm phom dáng 3D nha!`,
    };
  };

  const handleSendMessage = async (
    textToSend?: string,
    occasionOverride?: string,
    lightingOverride?: string,
    forcedOutfit?: OutfitItem,
    excludeOutfitId?: string
  ) => {
    const content = (textToSend ?? input).trim();
    if (!content || isLoading) return;

    const activeOccasion = occasionOverride || selectedOccasion;
    const currentLighting = lightingOverride || activeLighting;

    // Detect Client Intent: 'greeting' | 'qa' | 'styling'
    const clientIntent = forcedOutfit ? 'styling' : detectClientIntent(content, activeOccasion);

    // Only update memory if NOT a pure greeting
    if (clientIntent !== 'greeting') {
      const updatedLearned = analyzeChatMessageContext(content, learnedContext || null, profile);
      saveAuraMemory(updatedLearned);
      onLearnedContextUpdate?.(updatedLearned);
    }

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      text: content,
    };

    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    if (!textToSend) setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/stylist-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedHistory.map((m) => ({ role: m.role, text: m.text })),
          userProfile: {
            displayName: profile.displayName,
            heightCm: profile.heightCm,
            weightKg: profile.weightKg,
            bustCm: profile.bustCm,
            waistCm: profile.waistCm,
            hipCm: profile.hipCm,
            faceShape: activeFaceShape,
            undertone: activeUndertone,
            genderStyle: profile.genderStyle,
            favoriteStyles: userStyleNames,
          },
          weatherContext: weatherInfo,
          occasionContext: activeOccasion,
          lightingCondition: currentLighting,
          excludeOutfitId: excludeOutfitId || undefined,
          useSearchGrounding: modelMode === 'flash_search' ? useSearchGrounding : false,
          modelMode,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Lỗi phản hồi từ máy chủ AI Stylist');
      }

      const replyText = data.reply as string;
      const resolvedIntent: 'greeting' | 'qa' | 'styling' =
        (data.intent as 'greeting' | 'qa' | 'styling') || clientIntent;

      let suggestedOutfit: OutfitItem | undefined = undefined;
      let sampleCard: SampleCardData | undefined = undefined;

      // CHỈ ĐÍNH KÈM SAMPLE CARD KHI Ý ĐỊNH LÀ PHỐI ĐỒ (STYLING)
      if (resolvedIntent === 'styling') {
        if (data.sample_card) {
          const sc = data.sample_card;
          const matched = CURATED_OUTFITS.find((o) => o.id === sc.matched_outfit_id);
          suggestedOutfit = matched;
          sampleCard = {
            outfitId: sc.matched_outfit_id || `custom_${Date.now()}`,
            outfitName: sc.outfit_name || matched?.name || 'Set Đồ Phối Riêng Cho Bạn',
            imageUrl: matched?.imageUrl || '',
            isCustomSvg: !matched?.imageUrl,
            fitScore: sc.match_score || 96,
            highlightBenefit:
              sc.highlight_benefit ||
              `Độ hợp dáng: ${sc.match_score || 96}% · Tôn eo ${profile.waistCm}cm theo tỷ lệ 1/3 - 2/3`,
            topColor: {
              label: 'Áo',
              name: sc.swatches?.top_name || 'Áo thiết kế',
              hex: sc.swatches?.top_hex || matched?.garmentSpecs?.primaryColor || '#5C3A21',
            },
            bottomColor: {
              label: 'Quần / Váy',
              name: sc.swatches?.bottom_name || 'Quần / Chân váy',
              hex: sc.swatches?.bottom_hex || matched?.garmentSpecs?.secondaryColor || '#2B2B2B',
            },
            lipColor: {
              label: 'Son môi',
              name: sc.swatches?.lip_name || 'Son môi',
              hex: sc.swatches?.lip_hex || '#8B261D',
            },
            eyeColor: {
              label: 'Mắt / Má',
              name: `${sc.swatches?.blush_name || 'Má hồng'} & Phấn mắt`,
              hex: sc.swatches?.blush_hex || '#E07A5F',
            },
            hairstyleName: sc.hair_style || 'Tóc sóng lơi mái bay',
            makeupLookName: sc.makeup_layout || 'Layout makeup tự nhiên',
            fabricNote: sc.fabric_note || matched?.fabric || 'Chất vải cao cấp, phom dáng chuẩn',
          };
        } else {
          suggestedOutfit = forcedOutfit || detectSuggestedOutfit(replyText, content, excludeOutfitId);
          sampleCard = buildSampleCard(suggestedOutfit, currentLighting, activeFaceShape, activeUndertone);
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `model_${Date.now()}`,
          role: 'model',
          text: replyText,
          suggestedOutfitId: suggestedOutfit?.id,
          sampleCard,
          sources: Array.isArray(data.sources) ? data.sources : undefined,
        },
      ]);
    } catch {
      const fallback = buildLocalCustomerCareReply(
        content,
        activeOccasion,
        currentLighting,
        activeFaceShape,
        activeUndertone,
        forcedOutfit,
        clientIntent
      );

      let sampleCard: SampleCardData | undefined = undefined;
      if (fallback.intent === 'styling' && fallback.outfit) {
        sampleCard = buildSampleCard(fallback.outfit, currentLighting, activeFaceShape, activeUndertone);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `model_fallback_${Date.now()}`,
          role: 'model',
          text: fallback.text,
          suggestedOutfitId: fallback.outfit?.id,
          sampleCard,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestAlternativeSample = (currentOutfitId?: string) => {
    handleSendMessage(
      'Aura đổi cho mình xem phương án phối đồ & mẫu thử khác nhé!',
      selectedOccasion,
      activeLighting,
      undefined,
      currentOutfitId
    );
  };

  return (
    <div className="fixed bottom-3 left-3 sm:bottom-6 sm:left-6 z-50 flex flex-col items-start max-w-[calc(100vw-1.5rem)]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="ai-stylist-window"
            initial={{ opacity: 0, y: 20, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.92 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="mb-0 sm:mb-3.5 w-[calc(100vw-1.5rem)] sm:w-[430px] md:w-[480px] max-h-[calc(100dvh-1.5rem)] sm:max-h-[min(680px,calc(100dvh-6rem))] rounded-2xl bg-white border border-stone-300 shadow-[0_24px_64px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden text-[#18181B]"
          >
            {/* Header: CSKH Aura Live Badge + Weather */}
            <div className="px-4 py-3 bg-theme-primary text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0 border border-white/30 shadow-inner">
                    <Sparkles className="w-4 h-4 text-amber-200" />
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full" title="Aura đang trực tuyến" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-serif-display text-base font-bold leading-tight truncate">
                      Aura — Chuyên Viên CSKH & Stylist
                    </h3>
                  </div>
                  <p className="text-[11px] text-white/85 font-mono-tabular flex items-center gap-1.5 truncate">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span>
                      {weatherInfo.city} {weatherInfo.temperature}°C · Dáng: {bodyShapeAnalysis.shape} · 3V: {profile.bustCm}-{profile.waistCm}-{profile.hipCm}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowTuningDrawer(!showTuningDrawer)}
                  className={`p-1.5 rounded-lg text-white/90 transition-colors cursor-pointer flex items-center gap-1 text-[11px] ${
                    showTuningDrawer ? 'bg-white/25' : 'hover:bg-white/15'
                  }`}
                  title="Chỉnh nhanh dáng mặt, tông da, ánh sáng"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Chỉnh thông số</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearChatHistory}
                  className="p-1.5 rounded-lg hover:bg-white/15 text-white/90 transition-colors cursor-pointer"
                  title="Làm mới lịch sử trò chuyện"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/15 text-white/90 transition-colors cursor-pointer"
                  title="Thu gọn cửa sổ chat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Gemini AI Engine & Google Search Grounding Bar */}
            <div className="px-3 py-1.5 bg-stone-900 text-white flex items-center justify-between gap-2 text-[11px] border-b border-stone-800">
              <div className="flex items-center gap-1.5 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    setModelMode('flash_search');
                    setUseSearchGrounding((prev) => !prev);
                  }}
                  className={`px-2 py-0.5 rounded-full flex items-center gap-1 font-medium cursor-pointer transition-all border ${
                    modelMode === 'flash_search' && useSearchGrounding
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
                      : 'bg-white/10 text-stone-300 border-white/15 hover:bg-white/15'
                  }`}
                  title="Bật/tắt tra cứu dữ liệu thời gian thực bằng Google Search Grounding (gemini-3.8-flash)"
                >
                  <Globe className="w-3 h-3 shrink-0" />
                  <span className="truncate">
                    Google Search: {modelMode === 'flash_search' && useSearchGrounding ? 'BẬT' : 'TẮT'}
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setModelMode('flash_search');
                    setUseSearchGrounding(true);
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer transition-all ${
                    modelMode === 'flash_search'
                      ? 'bg-theme-primary text-white shadow-2xs'
                      : 'bg-white/10 text-stone-300 hover:bg-white/20'
                  }`}
                  title="Gemini 3.8 Flash kết hợp Google Search Grounding"
                >
                  3.8 Flash + Search
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModelMode('flash_lite');
                    setUseSearchGrounding(false);
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-0.5 cursor-pointer transition-all ${
                    modelMode === 'flash_lite'
                      ? 'bg-amber-500 text-stone-950 shadow-2xs'
                      : 'bg-white/10 text-stone-300 hover:bg-white/20'
                  }`}
                  title="Gemini 3.1 Flash-Lite phản hồi tốc độ cao"
                >
                  <Zap className="w-2.5 h-2.5" />
                  <span>3.1 Lite Nhanh</span>
                </button>
              </div>
            </div>

            {/* Quick Tuning Drawer for Face Shape, Undertone & Lighting */}
            <AnimatePresence>
              {showTuningDrawer && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-stone-50 border-b border-stone-200 p-3 space-y-2 text-xs overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900">Thông số tư vấn cá nhân:</span>
                    <button
                      type="button"
                      onClick={() => setShowTuningDrawer(false)}
                      className="text-stone-500 hover:text-stone-800 text-[11px] cursor-pointer"
                    >
                      Đóng
                    </button>
                  </div>

                  {/* Body shape badge */}
                  <div className="p-2 rounded-lg bg-white border border-stone-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-stone-500 uppercase tracking-wider block">Dáng người (tự động tính từ số đo):</span>
                      <strong className="text-theme-primary">{bodyShapeAnalysis.nameVi}</strong>
                    </div>
                    <span className="text-[10px] bg-theme-primary/10 text-theme-primary px-2 py-0.5 rounded font-medium">
                      Tỷ lệ 1/3 - 2/3
                    </span>
                  </div>

                  {/* Face shape selector */}
                  <div>
                    <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                      Dáng mặt (chọn kiểu tóc & mái che khuyết điểm):
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {FACE_SHAPE_OPTIONS.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setActiveFaceShape(f.id)}
                          className={`px-2 py-1 rounded text-[11px] font-medium border cursor-pointer transition-all ${
                            activeFaceShape === f.id
                              ? 'bg-theme-primary text-white border-theme-primary shadow-2xs'
                              : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                          }`}
                        >
                          {f.label.split('(')[0].trim()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Undertone selector */}
                  <div>
                    <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                      Tông da (chọn màu son, mắt, má & màu tóc):
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {UNDERTONE_OPTIONS.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => setActiveUndertone(u.id)}
                          className={`px-2 py-1 rounded text-[11px] font-medium border cursor-pointer transition-all ${
                            activeUndertone === u.id
                              ? 'bg-theme-primary text-white border-theme-primary shadow-2xs'
                              : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                          }`}
                        >
                          {u.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Lighting selector */}
                  <div>
                    <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                      Ánh sáng sự kiện (xử lý lớp nền & độ đậm makeup):
                    </label>
                    <div className="grid grid-cols-2 gap-1">
                      {LIGHTING_OPTIONS.map((l) => (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => setActiveLighting(l.id)}
                          className={`p-1.5 rounded text-left border cursor-pointer transition-all ${
                            activeLighting === l.id
                              ? 'bg-theme-primary text-white border-theme-primary'
                              : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          <div className="font-semibold text-[11px] truncate">{l.label}</div>
                          <div className={`text-[9px] truncate ${activeLighting === l.id ? 'text-white/80' : 'text-stone-400'}`}>
                            {l.tip}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* AI Learned Memory Indicator Strip */}
            {learnedContext && (
              <div className="px-3 py-1 bg-amber-50/80 border-b border-amber-200/60 flex items-center justify-between text-[11px] text-amber-900">
                <div className="flex items-center gap-1.5 truncate">
                  <Brain className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="truncate">
                    Aura đang nhớ: <strong>{learnedContext.recentEvent}</strong>
                    {learnedContext.bodyConcerns && learnedContext.bodyConcerns.length > 0 && (
                      <> · {learnedContext.bodyConcerns[0]}</>
                    )}
                  </span>
                </div>
                <span className="text-[10px] text-amber-700 font-semibold shrink-0">Đã đồng bộ Tủ Đồ</span>
              </div>
            )}

            {/* Occasion Presets Bar */}
            <div className="px-3 py-1.5 bg-stone-100 border-b border-stone-200 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-stone-600">
                <span className="font-semibold flex items-center gap-1 text-stone-800">
                  <Compass className="w-3.5 h-3.5 text-theme-primary" />
                  <span>Hoàn cảnh & Ánh sáng:</span>
                </span>
                <span className="text-[10px] text-theme-primary font-semibold flex items-center gap-1">
                  <CloudSun className="w-3 h-3" />
                  {weatherInfo.temperature}°C
                </span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                {OCCASION_PRESETS.map((occ) => {
                  const isActive = selectedOccasion === occ.label;
                  return (
                    <button
                      key={occ.id}
                      type="button"
                      disabled={isLoading}
                      onClick={() => {
                        setSelectedOccasion(occ.label);
                        setActiveLighting(occ.lighting);
                        handleSendMessage(occ.prompt, occ.label, occ.lighting);
                      }}
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap shrink-0 cursor-pointer transition-all border ${
                        isActive
                          ? 'bg-theme-primary text-white border-theme-primary shadow-2xs'
                          : 'bg-white hover:bg-stone-50 text-stone-700 border-stone-300'
                      }`}
                    >
                      {occ.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Messages Scrollable Thread */}
            <div className="flex-1 p-3 sm:p-3.5 space-y-3.5 overflow-y-auto bg-theme-canvas min-h-[180px] max-h-[46dvh] sm:max-h-[360px]">
              {messages.map((msg) => {
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.role === 'user' ? 'items-end' : 'items-start'
                    } space-y-1.5`}
                  >
                    {/* CSKH Header Label */}
                    {msg.role === 'model' && (
                      <div className="flex items-center gap-1.5 text-[11px] text-stone-500 font-medium px-1">
                        <div className="w-4 h-4 rounded-full bg-theme-primary text-white flex items-center justify-center text-[9px] font-bold">
                          A
                        </div>
                        <span>Aura · Chuyên viên CSKH</span>
                      </div>
                    )}

                    {/* Chat Bubble with Formatted Clean Typography */}
                    <div
                      className={`max-w-[94%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-theme-primary text-white rounded-br-xs'
                          : 'bg-white border border-stone-200/90 text-stone-800 rounded-bl-xs shadow-2xs'
                      }`}
                    >
                      <FormattedChatMessage text={msg.text} role={msg.role} />

                      {/* Grounding Sources (Google Search Live Data) */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-stone-100 space-y-1">
                          <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                            <Globe className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>Nguồn xác thực từ Google Search:</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {msg.sources.map((src, idx) => (
                              <a
                                key={idx}
                                href={src.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50/80 hover:bg-emerald-100 border border-emerald-200/70 text-[10px] font-medium text-emerald-900 transition-colors"
                              >
                                <ExternalLink className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                <span className="truncate max-w-[140px]">{src.title}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Sample Preview Card (Thẻ Mẫu Thử Kèm Swatch & Nút Thử Manocanh) */}
                    {msg.sampleCard && msg.role === 'model' && (
                      <div className="w-[94%] bg-white border border-stone-200/90 rounded-2xl p-3 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            <span className="text-[11px] font-bold uppercase tracking-wide text-stone-900">
                              Mẫu Thử Phong Cách & Layout Makeup
                            </span>
                          </div>
                          <span className="text-[10px] font-semibold text-theme-primary bg-theme-primary/10 px-2 py-0.5 rounded-full">
                            {msg.sampleCard.fitScore}% Hợp dáng
                          </span>
                        </div>

                        {/* Outfit overview */}
                        <div className="flex gap-3">
                          <div className="relative group shrink-0 w-20 h-28">
                            {msg.sampleCard.imageUrl && !msg.sampleCard.isCustomSvg ? (
                              <img
                                src={msg.sampleCard.imageUrl}
                                alt={msg.sampleCard.outfitName}
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  (e.currentTarget as HTMLElement).style.display = 'none';
                                  const fallback = e.currentTarget.parentElement?.querySelector('.svg-dynamic-fallback');
                                  if (fallback) (fallback as HTMLElement).style.display = 'flex';
                                }}
                                className="w-20 h-28 rounded-xl object-cover border border-stone-200 shadow-2xs group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : null}
                            <div
                              className={`svg-dynamic-fallback w-20 h-28 ${
                                msg.sampleCard.imageUrl && !msg.sampleCard.isCustomSvg ? 'hidden' : 'flex'
                              }`}
                            >
                              <DynamicOutfitIllustration
                                topHex={msg.sampleCard.topColor.hex}
                                bottomHex={msg.sampleCard.bottomColor.hex}
                                topName={msg.sampleCard.topColor.name}
                                bottomName={msg.sampleCard.bottomColor.name}
                              />
                            </div>
                          </div>
                          <div className="min-w-0 flex-1 space-y-1">
                            <h4 className="text-xs font-bold text-stone-900 leading-snug">
                              {msg.sampleCard.outfitName}
                            </h4>
                            <p className="text-[11px] text-stone-600 flex items-start gap-1">
                              <Scissors className="w-3 h-3 text-stone-400 shrink-0 mt-0.5" />
                              <span className="line-clamp-1">{msg.sampleCard.hairstyleName}</span>
                            </p>
                            <p className="text-[11px] text-stone-600 flex items-start gap-1">
                              <Palette className="w-3 h-3 text-stone-400 shrink-0 mt-0.5" />
                              <span className="line-clamp-1">{msg.sampleCard.makeupLookName}</span>
                            </p>
                            <div className="pt-0.5 text-[10px] text-stone-500 line-clamp-1">
                              {msg.sampleCard.fabricNote}
                            </div>
                          </div>
                        </div>

                        {/* Live Color Swatches */}
                        <div className="p-2 rounded-xl bg-stone-50 border border-stone-200/70 space-y-1.5">
                          <div className="text-[10px] font-semibold text-stone-600 uppercase tracking-wider">
                            Bảng màu Swatch thực tế:
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            {/* Swatch Áo */}
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span
                                className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/20 shadow-2xs"
                                style={{ backgroundColor: msg.sampleCard.topColor.hex }}
                              />
                              <span className="truncate text-stone-800">
                                Áo: <strong>{msg.sampleCard.topColor.hex}</strong>
                              </span>
                            </div>

                            {/* Swatch Quần */}
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span
                                className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/20 shadow-2xs"
                                style={{ backgroundColor: msg.sampleCard.bottomColor.hex }}
                              />
                              <span className="truncate text-stone-800">
                                Quần: <strong>{msg.sampleCard.bottomColor.hex}</strong>
                              </span>
                            </div>

                            {/* Swatch Son môi */}
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span
                                className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/20 shadow-2xs"
                                style={{ backgroundColor: msg.sampleCard.lipColor.hex }}
                              />
                              <span className="truncate text-stone-800">
                                Son: <strong>{msg.sampleCard.lipColor.hex}</strong>
                              </span>
                            </div>

                            {/* Swatch Mắt / Má */}
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span
                                className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/20 shadow-2xs"
                                style={{ backgroundColor: msg.sampleCard.eyeColor.hex }}
                              />
                              <span className="truncate text-stone-800">
                                Mắt/Má: <strong>{msg.sampleCard.eyeColor.hex}</strong>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons: Thử Lên Manocanh & Đổi Mẫu Khác */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              const target = CURATED_OUTFITS.find((o) => o.id === msg.sampleCard?.outfitId);
                              if (target) {
                                onSelectOutfitForMannequin(target);
                                setAppliedOutfitId(target.id);
                              } else if (msg.sampleCard) {
                                const syntheticOutfit: OutfitItem = {
                                  id: msg.sampleCard.outfitId,
                                  name: msg.sampleCard.outfitName,
                                  subtitle: `Bộ đồ thiết kế riêng theo tư vấn của CSKH Aura`,
                                  category: 'Dạ tiệc lụa',
                                  styleTags: ['korean_casual', 'parisian_chic'],
                                  targetGenders: [profile.genderStyle === 'male' ? 'male' : 'female'],
                                  imageUrl: msg.sampleCard.imageUrl || '/assets/outfits/outfit_set_14_preppy_shirt_tennis.png',
                                  fabric: msg.sampleCard.fabricNote || 'Vải cao cấp thoáng mát',
                                  season: 'Bốn mùa',
                                  idealRatioNote: msg.sampleCard.highlightBenefit,
                                  colorRule: `${msg.sampleCard.topColor.name} + ${msg.sampleCard.bottomColor.name}`,
                                  proportionRule: 'Tỷ lệ 1/3 - 2/3 tôn dáng',
                                  garmentSpecs: {
                                    shoulderScale: 1.0,
                                    waistTaper: 0.85,
                                    hipDrape: 1.05,
                                    lengthType: 'blazer_set',
                                    primaryColor: msg.sampleCard.topColor.hex,
                                    secondaryColor: msg.sampleCard.bottomColor.hex,
                                    accentColor: msg.sampleCard.lipColor.hex,
                                  },
                                  baseMeasurements: {
                                    S: { bust: [76, 84], waist: [58, 64], hip: [82, 90], height: [150, 163] },
                                    M: { bust: [85, 90], waist: [65, 71], hip: [91, 96], height: [158, 170] },
                                    L: { bust: [91, 97], waist: [72, 79], hip: [97, 104], height: [164, 176] },
                                    XL: { bust: [98, 106], waist: [80, 88], hip: [105, 112], height: [168, 182] },
                                  },
                                };
                                onSelectOutfitForMannequin(syntheticOutfit);
                                setAppliedOutfitId(msg.sampleCard.outfitId);
                              }
                            }}
                            className={`py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                              appliedOutfitId === msg.sampleCard.outfitId
                                ? 'bg-emerald-600 text-white'
                                : 'bg-theme-primary text-white hover:bg-stone-900 shadow-2xs'
                            }`}
                          >
                            {appliedOutfitId === msg.sampleCard.outfitId ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Đã đưa lên Manocanh</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Thử mẫu lên Manocanh</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRequestAlternativeSample(msg.sampleCard?.outfitId)}
                            className="py-2 px-2.5 rounded-xl border border-stone-300 bg-stone-50 hover:bg-stone-100 text-stone-800 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-theme-primary" />
                            <span>Đổi mẫu thử khác</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Typing Indicator: 'Aura đang soạn tin nhắn...' */}
              {isLoading && (
                <div className="flex flex-col items-start space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] text-stone-500 font-medium px-1">
                    <div className="w-4 h-4 rounded-full bg-theme-primary text-white flex items-center justify-center text-[9px] font-bold">
                      A
                    </div>
                    <span>Aura · Chuyên viên CSKH</span>
                  </div>
                  <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl rounded-bl-xs bg-white border border-stone-200/90 shadow-2xs">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-theme-primary animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-2 h-2 rounded-full bg-theme-primary animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-2 h-2 rounded-full bg-theme-primary animate-bounce" />
                    </div>
                    <span className="text-xs text-stone-600 font-medium">
                      Aura đang soạn tin nhắn tư vấn cho {profile.displayName}...
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Replies (Gợi ý câu hỏi nhanh) */}
            <div className="px-3 py-2 bg-stone-50 border-t border-stone-200 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider shrink-0">
                Hỏi nhanh:
              </span>
              {QUICK_REPLIES.map((qr) => (
                <button
                  key={qr.id}
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    if (qr.id === 'qr_doi_mau') {
                      handleRequestAlternativeSample();
                    } else {
                      if (qr.lighting) setActiveLighting(qr.lighting);
                      handleSendMessage(qr.prompt, selectedOccasion, qr.lighting);
                    }
                  }}
                  className="px-2.5 py-1 rounded-full bg-white hover:bg-stone-100 text-stone-700 hover:text-theme-primary border border-stone-300 hover:border-theme-primary text-[11px] font-medium whitespace-nowrap shrink-0 transition-all cursor-pointer shadow-2xs"
                >
                  {qr.text}
                </button>
              ))}
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-2.5 bg-white border-t border-stone-200 flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Nhắn tin với Aura: 'Mình sắp thuyết trình, không thích mặc màu tối, muốn che hông to'..."
                className="flex-1 px-3 py-2 text-xs bg-theme-canvas border border-stone-300 rounded-lg focus:outline-none focus:border-stone-900"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="p-2 rounded-lg bg-theme-primary text-white disabled:opacity-40 cursor-pointer transition-colors shadow-2xs"
                title="Gửi tin nhắn cho Aura"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Circular Chat Trigger Button (Hidden on mobile when chat window is already open to maximize vertical chat height) */}
      <motion.button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        className={`${
          isOpen ? 'hidden sm:flex' : 'flex'
        } w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-theme-primary text-white shadow-[0_12px_32px_rgba(0,0,0,0.35)] border-2 border-white items-center justify-center cursor-pointer relative group`}
        title="Mở CSKH Aura tư vấn phối đồ, makeup & tóc"
      >
        {isOpen ? (
          <X className="w-5 h-5 sm:w-6 sm:h-6" />
        ) : (
          <div className="flex flex-col items-center justify-center">
            <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full" />
          </div>
        )}
        {!isOpen && (
          <span className="hidden sm:inline-block ml-3 left-full absolute px-3 py-1.5 rounded-lg bg-[#18181B] text-white text-xs font-medium whitespace-nowrap shadow-md pointer-events-none opacity-95 group-hover:opacity-100">
            Aura · CSKH Phối Đồ, Makeup & Tóc
          </span>
        )}
      </motion.button>
    </div>
  );
};
