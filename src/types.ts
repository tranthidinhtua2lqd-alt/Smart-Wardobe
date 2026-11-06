export interface UserProfile {
  uid: string;
  displayName: string;
  avatarUrl: string;
  heightCm: number;
  weightKg: number;
  bustCm: number;
  waistCm: number;
  hipCm: number;
  genderStyle: 'female' | 'male' | 'neutral';
  favoriteStyles?: string[];
  faceShape?: 'round' | 'square' | 'long' | 'heart' | 'oval' | string;
  undertone?: 'warm' | 'cool' | 'neutral' | string;
  onboardingCompleted?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export const FACE_SHAPE_OPTIONS = [
  {
    id: 'round',
    label: 'Mặt tròn (Round)',
    hairRule: 'Rẽ ngôi lệch 7/3, mái bay dài qua gò má, tỉa layer hoặc búi cao. Tránh mái bằng dày.',
  },
  {
    id: 'square',
    label: 'Mặt vuông (Square)',
    hairRule: 'Xoăn sóng lơi mềm mại, mái bay che xương hàm. Tránh cắt bằng sắc nét ngang hàm.',
  },
  {
    id: 'long',
    label: 'Mặt dài (Long)',
    hairRule: 'Mái thưa/mái bằng, uốn phồng 2 bên tai. Tránh tóc thẳng rẽ ngôi giữa không mái.',
  },
  {
    id: 'heart',
    label: 'Mặt trái tim / kim cương (Heart)',
    hairRule: 'Uốn phồng đuôi ngang cằm, mái bay che gò má cân đối cằm thon.',
  },
  {
    id: 'oval',
    label: 'Mặt trái xoan (Oval)',
    hairRule: 'Hợp mọi kiểu tóc, ưu tiên chọn theo cổ áo và thời tiết.',
  },
];

export const UNDERTONE_OPTIONS = [
  {
    id: 'warm',
    label: 'Warm (Da tông ấm)',
    paletteTip: 'Hợp cam đất, nâu caramel, đỏ gạch, vàng đồng, son MLBB đào ấm.',
  },
  {
    id: 'cool',
    label: 'Cool (Da tông lạnh)',
    paletteTip: 'Hợp hồng đất, đỏ rượu, nâu khói lạnh, mận, son đỏ berry.',
  },
  {
    id: 'neutral',
    label: 'Neutral (Da trung tính)',
    paletteTip: 'Hợp đa dạng bảng màu, dễ dàng biến hóa mọi phong cách makeup.',
  },
];

export type DetectedBodyShape = 'Hourglass' | 'Pear' | 'Apple' | 'Rectangle' | 'Inverted Triangle';

export function calculateBodyShape(bust: number, waist: number, hip: number): {
  shape: DetectedBodyShape;
  nameVi: string;
  stylingRule: string;
  recommendedCuts: string;
  avoidCuts: string;
} {
  // 1. Đồng hồ cát: Ngực ~ Mông (chênh lệch <= 5cm), Eo nhỏ hơn >= 20cm
  if (Math.abs(bust - hip) <= 6 && (bust - waist >= 18 || hip - waist >= 18)) {
    return {
      shape: 'Hourglass',
      nameVi: 'Đồng hồ cát (Hourglass) — Vòng eo thon, ngực và hông cân đối',
      stylingRule: 'Chọn đồ ôm vừa vặn, tôn eo rõ nét theo tỷ lệ vàng 1/3 - 2/3.',
      recommendedCuts: 'Đầm wrap dress, áo croptop cổ V, chân váy cạp cao, quần ống loe ôm đùi.',
      avoidCuts: 'Tránh đồ oversized thùng thình giấu mất đường cong eo.',
    };
  }

  // 2. Quả lê: Mông > Ngực (chênh >= 5cm), Eo thon
  if (hip - bust >= 5 && waist < hip - 15) {
    return {
      shape: 'Pear',
      nameVi: 'Quả lê (Pear) — Hông và đùi nở nang, eo thon, vai nhỏ',
      stylingRule: 'Tập trung điểm nhấn vào thân trên (áo sáng màu, trễ vai, tay bồng) để cân bằng với hông.',
      recommendedCuts: 'Áo croptop cổ yếm/trễ vai sáng màu + Quần ống suông/chân váy chữ A tối màu cạp cao.',
      avoidCuts: 'Tránh quần sáng màu bó sát phần đùi hoặc quần có túi hộp phồng to ở hông.',
    };
  }

  // 3. Quả táo: Ngực lớn, Eo >= Ngực/Mông hoặc vòng 2 đầy đặn
  if (waist >= bust - 6 || waist >= hip - 6) {
    return {
      shape: 'Apple',
      nameVi: 'Quả táo (Apple) — Thân trên và vòng 1 đầy đặn, eo không thắt rõ, chân thon',
      stylingRule: 'Kéo dài phần cổ bằng cổ V sâu, hướng sự chú ý xuống đôi chân thon gọn.',
      recommendedCuts: 'Áo cổ V sâu, váy chữ A, đầm chiết chân ngực (Empire waist), quần suông đứng dáng.',
      avoidCuts: 'Tránh áo bó sát bụng, thắt lưng to bản ngay eo hoặc áo cổ lọ quá kín.',
    };
  }

  // 4. Tam giác ngược: Vai/Ngực rộng > Mông (chênh >= 5cm)
  if (bust - hip >= 5) {
    return {
      shape: 'Inverted Triangle',
      nameVi: 'Tam giác ngược (Inverted Triangle) — Vai và ngực rộng hơn hông',
      stylingRule: 'Tiết chế phần vai và ngực bằng màu tối mềm rủ, tăng độ xòe phồng cho phần thân dưới.',
      recommendedCuts: 'Áo cổ V hoặc cổ yếm mềm rủ tối màu + Quần ống rộng/chân váy xòe sáng màu có nơ/xếp ly.',
      avoidCuts: 'Tránh áo độn vai, tay phồng lớn hoặc áo cổ thuyền làm vai thêm rộng.',
    };
  }

  // 5. Hình chữ nhật: 3 vòng chênh lệch ít (< 15cm)
  return {
    shape: 'Rectangle',
    nameVi: 'Hình chữ nhật (Rectangle) — 3 vòng thanh mảnh, đường cong nhẹ',
    stylingRule: 'Tạo ảo giác đường cong bằng chi tiết cắt cúp, peplum, bèo nhún và cạp cao.',
    recommendedCuts: 'Áo peplum chiết eo, áo croptop bèo nhún phối quần cạp cao, đầm chữ A có đai lưng.',
    avoidCuts: 'Tránh trang phục suông thẳng đuột từ trên xuống dưới không có điểm nhấn eo.',
  };
}

export interface AuraLearnedContext {
  recentEvent?: string;
  eventKey?: string;
  preferredColors?: string[];
  dislikedColors?: string[];
  bodyConcerns?: string[];
  weatherNote?: string;
  preferredStyles?: string[];
  customReasonTemplate?: string;
  timestamp: number;
}

export interface UserPrivateInfo {
  uid: string;
  contactIdentifier: string;
  contactType: 'email' | 'phone' | 'google';
  passwordHash: string;
  otpVerified: boolean;
  updatedAt?: unknown;
}

export interface TryOnHistoryItem {
  id: string;
  userId: string;
  outfitId: string;
  outfitName: string;
  category: string;
  imageUrl: string;
  tryOnMode: 'ar_camera' | 'mannequin_3d' | 'curated_match';
  recommendedSize: string;
  fitScore: number;
  snapshotMeasurements: string;
  notes: string;
  createdAtMs: number;
}

export interface FashionStyleOption {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  accentColor: string;
}

export const FASHION_STYLE_OPTIONS: FashionStyleOption[] = [
  {
    id: 'coquette_babydoll',
    title: 'Coquette & Tiểu Thư Nơ',
    subtitle: 'Áo quây thắt nơ, chân váy xếp tầng & ruy băng ngọt ngào',
    imageUrl: '/assets/outfits/outfit_set_13_coquette_bow_skirt.png',
    accentColor: '#9D174D',
  },
  {
    id: 'y2k_acubi',
    title: 'Y2K & Acubi Cá Tính',
    subtitle: 'Áo quây khăn choàng cổ, áo lưới tay chuông & jeans đính nơ',
    imageUrl: '/assets/outfits/outfit_set_20_scarf_tube_ribbon_jeans.png',
    accentColor: '#3F3F46',
  },
  {
    id: 'korean_casual',
    title: 'Hàn Quốc Trẻ Trung',
    subtitle: 'Chân váy xếp ly ngắn, áo trễ vai & phối layer tôn dáng',
    imageUrl: '/assets/outfits/outfit_set_09_grey_offshoulder_skirt.png',
    accentColor: '#4B5563',
  },
  {
    id: 'preppy_school',
    title: 'Preppy Học Đường',
    subtitle: 'Sơ mi chiết eo, chân váy Tennis trắng & chân váy cúc trước',
    imageUrl: '/assets/outfits/outfit_set_14_preppy_shirt_tennis.png',
    accentColor: '#1E3A8A',
  },
  {
    id: 'balletcore_soft',
    title: 'Balletcore & Nàng Thơ',
    subtitle: 'Áo len tay loe, đắp chéo phối ren & quần đính nơ ngọc trai',
    imageUrl: '/assets/outfits/outfit_set_15_grey_bell_pearl_jeans.png',
    accentColor: '#64748B',
  },
  {
    id: 'luxury_evening',
    title: 'Quyến Rũ & Tôn Dáng',
    subtitle: 'Áo corset nâu Espresso, cổ yếm đan chéo & quần ống loe',
    imageUrl: '/assets/outfits/outfit_set_07_espresso_corset_flared.png',
    accentColor: '#5C3A21',
  },
  {
    id: 'streetwear_denim',
    title: 'Streetwear & Baggy Jeans',
    subtitle: 'Áo trễ vai, Hoodie & quần jeans ống rộng họa tiết trái tim',
    imageUrl: '/assets/outfits/outfit_set_16_offshoulder_heart_jeans.png',
    accentColor: '#27272A',
  },
  {
    id: 'parisian_chic',
    title: 'Thanh Lịch Kiểu Pháp',
    subtitle: 'Áo cổ yếm xoắn ngực, cổ lọ sát nách & chân váy chữ A',
    imageUrl: '/assets/outfits/outfit_set_08_espresso_halter_skirt.png',
    accentColor: '#8C6239',
  },
  {
    id: 'minimalist_office',
    title: 'Tối Giản Thanh Lịch',
    subtitle: 'Áo len đắp chéo, sơ mi Kaki & phom dáng tinh gọn hiện đại',
    imageUrl: '/assets/outfits/outfit_set_19_sage_wrap_pleated_skirt.png',
    accentColor: '#52525B',
  },
  {
    id: 'vintage_retro',
    title: 'Denim & Vintage Hoài Cổ',
    subtitle: 'Corset cổ điển, sơ mi caro & quần jeans ống loe xanh đậm',
    imageUrl: '/assets/outfits/outfit_set_18_cross_halter_flared.png',
    accentColor: '#3B5998',
  },
  {
    id: 'classic_autumn',
    title: 'Thu Đông Ấm Áp (Cozy)',
    subtitle: 'Áo len gân cổ V nâu Mocha, Hoodie nỉ bông & len kẻ sọc',
    imageUrl: '/assets/outfits/outfit_set_12_espresso_knit_butterfly_jeans.png',
    accentColor: '#785238',
  },
  {
    id: 'resort_linen',
    title: 'Dạo Phố & Cafe Cuối Tuần',
    subtitle: 'Áo thun Henley layer, áo nơ đen & chân váy ngắn năng động',
    imageUrl: '/assets/outfits/outfit_set_21_henley_denim_skirt.png',
    accentColor: '#065F46',
  },
];

export interface OutfitItem {
  id: string;
  name: string;
  subtitle: string;
  category: 'Công sở thanh lịch' | 'Dạ tiệc lụa' | 'Dạo phố đương đại' | 'Thu Đông cổ điển';
  styleTags: string[];
  targetGenders: ('female' | 'male' | 'neutral')[];
  imageUrl: string;
  fabric: string;
  season: string;
  idealRatioNote: string;
  colorRule: string;
  proportionRule: string;
  isCustomCaptured?: boolean;
  garmentCaptureMode?: 'full_outfit' | 'top_only' | 'dress';
  stylingExtras?: {
    accessories: string;
    makeupTone: string;
    hairstyleAndColor: string;
    occasionFit: string;
  };
  garmentSpecs: {
    shoulderScale: number;
    waistTaper: number;
    hipDrape: number;
    lengthType: 'blazer_set' | 'midi_dress' | 'denim_jacket' | 'trench_coat';
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
  };
  baseMeasurements: {
    S: { bust: [number, number]; waist: [number, number]; hip: [number, number]; height: [number, number] };
    M: { bust: [number, number]; waist: [number, number]; hip: [number, number]; height: [number, number] };
    L: { bust: [number, number]; waist: [number, number]; hip: [number, number]; height: [number, number] };
    XL: { bust: [number, number]; waist: [number, number]; hip: [number, number]; height: [number, number] };
  };
}

export interface ThemePalette {
  id: string;
  name: string;
  description: string;
  primary: string;
  primaryHover: string;
  primarySoft: string;
  primaryBorder: string;
  canvas: string;
  surface: string;
}

export const THEME_PALETTES: ThemePalette[] = [
  {
    id: 'terracotta',
    name: 'Cam Đất Hoàng Gia (Terracotta)',
    description: 'Ấm áp, sang trọng chuẩn Smart Wardrobe',
    primary: '#9A3412',
    primaryHover: '#7C2D12',
    primarySoft: '#FFEDD5',
    primaryBorder: '#FDBA74',
    canvas: '#FAF8F5',
    surface: '#F2ECE1',
  },
  {
    id: 'emerald',
    name: 'Xanh Ngọc Lục Bảo (Couture Emerald)',
    description: 'Thanh lịch, quý phái và dịu mắt',
    primary: '#065F46',
    primaryHover: '#064E3B',
    primarySoft: '#D1FAE5',
    primaryBorder: '#6EE7B7',
    canvas: '#F7FAF9',
    surface: '#E6F2EE',
  },
  {
    id: 'burgundy',
    name: 'Đỏ Rượu Vang (Velvet Burgundy)',
    description: 'Quyến rũ, nổi bật đậm chất thời trang cao cấp',
    primary: '#881337',
    primaryHover: '#701A32',
    primarySoft: '#FFE4E6',
    primaryBorder: '#FDA4AF',
    canvas: '#FCF8F8',
    surface: '#F5E9EC',
  },
  {
    id: 'sapphire',
    name: 'Xanh Sapphire Đương Đại (Royal Navy)',
    description: 'Hiện đại, sắc sảo và cá tính',
    primary: '#1E3A8A',
    primaryHover: '#172554',
    primarySoft: '#DBEAFE',
    primaryBorder: '#93C5FD',
    canvas: '#F8FAFC',
    surface: '#EAEFF7',
  },
  {
    id: 'noir',
    name: 'Đen Tuyền Tối Giản (Minimalist Noir)',
    description: 'Tương phản cao, tinh tế chuẩn sàn diễn Milan',
    primary: '#18181B',
    primaryHover: '#27272A',
    primarySoft: '#F4F4F5',
    primaryBorder: '#D4D4D8',
    canvas: '#FAFAFA',
    surface: '#EFEFEF',
  },
];

export const DEFAULT_AVATARS = [
  '/src/assets/images/avatar_fashion_default_1793893594523.jpg',
  'https://api.dicebear.com/9.x/notionists/svg?seed=AuraAtelier&backgroundColor=f3efe6',
  'https://api.dicebear.com/9.x/notionists/svg?seed=MilanVogue&backgroundColor=e8dfd1',
  'https://api.dicebear.com/9.x/notionists/svg?seed=ParisCouture&backgroundColor=ede6db',
];

export const CURATED_OUTFITS: OutfitItem[] = [
  // ======================== 16 BỘ ĐỒ NỮ ĐÃ TÁCH NỀN & PHỐI THEO QUY TẮC MÀU SẮC / DÀI NGẮN ========================
  {
    id: 'outfit_coquette_bow_skirt_13',
    name: 'Set Áo Quây Nơ Nâu Mocha & Chân Váy Trắng Xếp Tầng Coquette',
    subtitle: 'Áo cúp ngực thắt nơ vạt nhọn tôn vòng eo phối cùng chân váy ngắn trắng xếp 2 tầng đính nơ tiểu thư',
    category: 'Dạ tiệc lụa',
    styleTags: ['coquette_babydoll', 'parisian_chic', 'luxury_evening'],
    targetGenders: ['female'],
    imageUrl: '/assets/outfits/outfit_set_13_coquette_bow_skirt.png',
    fabric: 'Voan Lụa Mềm Rủ & Cotton Đũi Trắng Dập Nổi',
    season: 'Xuân Hè · Hẹn hò, Tiệc trà & Chụp ảnh',
    idealRatioNote: 'Vạt áo nhọn hướng xuống kết hợp cạp váy ôm sát giúp vòng 2 trông nhỏ gọn và tạo đường cong hông mềm mại.',
    colorRule: 'Tương phản Ấm - Sáng (Nâu Mocha Ấm + Trắng Tinh Khôi)',
    proportionRule: 'Trên Ôm Ngắn (1/3) + Dưới Xòe Ngắn (2/3) tôn chân thon',
    garmentSpecs: {
      shoulderScale: 1.0,
      waistTaper: 0.84,
      hipDrape: 1.08,
      lengthType: 'midi_dress',
      primaryColor: '#6E472B',
      secondaryColor: '#F5F5F4',
      accentColor: '#D6D3D1',
    },
    baseMeasurements: {
      S: { bust: [76, 84], waist: [58, 64], hip: [82, 90], height: [150, 163] },
      M: { bust: [85, 90], waist: [65, 71], hip: [91, 96], height: [158, 170] },
      L: { bust: [91, 97], waist: [72, 79], hip: [97, 104], height: [164, 176] },
      XL: { bust: [98, 106], waist: [80, 88], hip: [105, 112], height: [168, 182] },
    },
  },
  {
    id: 'outfit_espresso_corset_flared_02',
    name: 'Set Áo Corset Tay Loe Nâu Espresso & Quần Jeans Ống Loe Đính Nơ',
    subtitle: 'Áo kiểu cổ vuông nhún ngực tay chuông nâu Espresso phối cùng quần Jeans cạp cao ống loe đính nơ đầu gối Y2K',
    category: 'Dạ tiệc lụa',
    styleTags: ['luxury_evening', 'y2k_acubi', 'parisian_chic', 'vintage_retro'],
    targetGenders: ['female'],
    imageUrl: '/assets/outfits/outfit_set_07_espresso_corset_flared.png',
    fabric: 'Voan Lụa Phối Thun Gân Co Giãn & Denim Co Giãn 12oz',
    season: 'Xuân Hè · Thu Đông · Hẹn hò & Dạo phố',
    idealRatioNote: 'Vạt áo corset nhọn thu gọn vòng 2 kết hợp quần ống loe cạp cao giúp chân trông dài thêm 5-7cm.',
    colorRule: 'Bổ túc Nâu Đất Ấm (Espresso) + Xanh Denim Băng (Ice Blue)',
    proportionRule: 'Quy tắc 1/3 - 2/3: Áo Crop Corset ngắn + Quần ống loe dài chạm gót',
    garmentSpecs: {
      shoulderScale: 1.03,
      waistTaper: 0.85,
      hipDrape: 1.05,
      lengthType: 'blazer_set',
      primaryColor: '#5C3A21',
      secondaryColor: '#6082B6',
      accentColor: '#D4A373',
    },
    baseMeasurements: {
      S: { bust: [76, 84], waist: [58, 64], hip: [82, 90], height: [150, 163] },
      M: { bust: [85, 90], waist: [65, 71], hip: [91, 96], height: [158, 170] },
      L: { bust: [91, 97], waist: [72, 79], hip: [97, 104], height: [164, 176] },
      XL: { bust: [98, 106], waist: [80, 88], hip: [105, 112], height: [168, 182] },
    },
  },
  {
    id: 'outfit_preppy_shirt_tennis_14',
    name: 'Set Sơ Mi Chiết Eo Nâu Espresso & Chân Váy Tennis Trắng Xếp Ly',
    subtitle: 'Áo sơ mi ngắn tay phom corset chiết eo sắc sảo phối cùng chân váy xếp ly trắng tinh khôi chuẩn Preppy',
    category: 'Công sở thanh lịch',
    styleTags: ['preppy_school', 'minimalist_office', 'korean_casual'],
    targetGenders: ['female'],
    imageUrl: '/assets/outfits/outfit_set_14_preppy_shirt_tennis.png',
    fabric: 'Cotton Poplin Co Giãn & Tuytsi Trắng Đứng Ly',
    season: 'Bốn mùa · Đi học, Công sở trẻ & Dạo phố',
    idealRatioNote: 'Đường chiết eo dọc thân áo kết hợp độ xòe chữ A của chân váy giúp tạo dáng đồng hồ cát cân đối.',
    colorRule: 'Tương phản Cổ điển Sáng - Tối (Nâu Đậm + Trắng Sáng)',
    proportionRule: 'Áo sơ mi lửng ôm eo + Chân váy ngắn xếp ly chữ A trên gối',
    garmentSpecs: {
      shoulderScale: 1.02,
      waistTaper: 0.85,
      hipDrape: 1.06,
      lengthType: 'blazer_set',
      primaryColor: '#4A2C18',
      secondaryColor: '#FAFAFA',
      accentColor: '#D4D4D8',
    },
    baseMeasurements: {
      S: { bust: [76, 84], waist: [58, 64], hip: [84, 90], height: [150, 163] },
      M: { bust: [85, 90], waist: [65, 71], hip: [91, 96], height: [158, 170] },
      L: { bust: [91, 97], waist: [72, 79], hip: [97, 104], height: [164, 176] },
      XL: { bust: [98, 106], waist: [80, 88], hip: [105, 112], height: [168, 182] },
    },
  },
  {
    id: 'outfit_grey_bell_pearl_jeans_15',
    name: 'Set Áo Len Gân Xám Tay Loe & Quần Jeans Ống Loe Đính Nơ Ngọc Trai',
    subtitle: 'Áo len tăm cổ V phối dây cổ đen tay chuông dài kết hợp quần Jeans xanh nhạt xẻ gấu đính nơ trắng & ngọc trai',
    category: 'Dạo phố đương đại',
    styleTags: ['balletcore_soft', 'korean_casual', 'coquette_babydoll'],
    targetGenders: ['female'],
    imageUrl: '/assets/outfits/outfit_set_15_grey_bell_pearl_jeans.png',
    fabric: 'Len Tăm Mềm Mịn & Light-Wash Denim Đính Ngọc Trai',
    season: 'Xuân Thu · Đi cà phê, Dạo phố & Hẹn hò',
    idealRatioNote: 'Tay áo loe dài kết hợp ống quần loe đính nơ tạo sự đồng điệu nhịp nhàng và kéo dài tỷ lệ đôi chân.',
    colorRule: 'Chuyển sắc Pastel Dịu Mắt (Xám Sáng + Xanh Băng + Nơ Trắng)',
    proportionRule: 'Áo Crop Lửng Tay Dài (1/3) + Quần Cạp Cao Ống Loe Dài (2/3)',
    garmentSpecs: {
      shoulderScale: 1.02,
      waistTaper: 0.86,
      hipDrape: 1.05,
      lengthType: 'denim_jacket',
      primaryColor: '#D4D4D8',
      secondaryColor: '#93C5FD',
      accentColor: '#18181B',
    },
    baseMeasurements: {
      S: { bust: [76, 84], waist: [58, 64], hip: [84, 90], height: [152, 164] },
      M: { bust: [85, 90], waist: [65, 71], hip: [91, 96], height: [158, 170] },
      L: { bust: [91, 97], waist: [72, 79], hip: [97, 104], height: [164, 176] },
      XL: { bust: [98, 106], waist: [80, 88], hip: [105, 113], height: [168, 182] },
    },
  },
  {
    id: 'outfit_grey_offshoulder_skirt_03',
    name: 'Set Áo Trễ Vai Bất Đối Xứng Xám Khói & Chân Váy Xếp Ly Xanh Nhạt',
    subtitle: 'Áo nỉ mỏng lệch vai phối dây cổ đen cá tính kết hợp chân váy ngắn xếp ly bản to trẻ trung chuẩn Hàn Quốc',
    category: 'Dạo phố đương đại',
    styleTags: ['korean_casual', 'preppy_school', 'y2k_acubi'],
    targetGenders: ['female'],
    imageUrl: '/assets/outfits/outfit_set_09_grey_offshoulder_skirt.png',
    fabric: 'Cotton Melange Mềm Mịn & Denim Wash Xanh Băng',
    season: 'Bốn mùa · Đi cà phê, Dạo phố & Chụp hình',
    idealRatioNote: 'Đường cắt lệch vai tôn xương quai xanh kết hợp chân váy chữ A cạp cao giúp tôn vòng eo thon.',
    colorRule: 'Tông Lạnh Hiện Đại (Xám Melange + Đen + Xanh Denim Sáng)',
    proportionRule: 'Áo Lửng Bo Eo + Chân Váy Xếp Ly Ngắn khoe đôi chân thon',
    garmentSpecs: {
      shoulderScale: 1.04,
      waistTaper: 0.88,
      hipDrape: 1.06,
      lengthType: 'midi_dress',
      primaryColor: '#9CA3AF',
      secondaryColor: '#93C5FD',
      accentColor: '#18181B',
    },
    baseMeasurements: {
      S: { bust: [78, 85], waist: [59, 65], hip: [84, 91], height: [152, 164] },
      M: { bust: [86, 91], waist: [66, 72], hip: [92, 97], height: [158, 170] },
      L: { bust: [92, 98], waist: [73, 80], hip: [98, 105], height: [164, 176] },
      XL: { bust: [99, 107], waist: [81, 89], hip: [106, 113], height: [168, 182] },
    },
  },
  {
    id: 'outfit_offshoulder_heart_jeans_16',
    name: 'Set Áo Len Trễ Vai Nâu Espresso & Quần Jeans Baggy Họa Tiết Trái Tim',
    subtitle: 'Áo len gân trễ vai buộc nơ ngực tay dài phối cùng quần Jeans ống suông rộng in trái tim trắng đáng yêu',
    category: 'Thu Đông cổ điển',
    styleTags: ['streetwear_denim', 'korean_casual', 'classic_autumn', 'y2k_acubi'],
    targetGenders: ['female'],
    imageUrl: '/assets/outfits/outfit_set_16_offshoulder_heart_jeans.png',
    fabric: 'Len Gân Co Giãn Ấm Áp & Washed Blue Denim',
    season: 'Thu Đông · Dạo phố, Xem phim & Du lịch',
    idealRatioNote: 'Phần cổ trễ vai ngang giúp cân bằng bờ vai mảnh, kết hợp quần baggy suông rộng che khuyết điểm chân hoàn hảo.',
    colorRule: 'Phối màu Ấm - Lạnh (Nâu Espresso Trầm + Xanh Jeans Họa Tiết Trắng)',
    proportionRule: 'Quy tắc Trên Ôm Ngắn - Dưới Rộng Dài (Crop Knit + Wide-Leg Baggy)',
    garmentSpecs: {
      shoulderScale: 1.04,
      waistTaper: 0.86,
      hipDrape: 1.08,
      lengthType: 'denim_jacket',
      primaryColor: '#4A2E1B',
      secondaryColor: '#93C5FD',
      accentColor: '#FFFFFF',
    },
    baseMeasurements: {
      S: { bust: [76, 84], waist: [58, 64], hip: [84, 91], height: [152, 164] },
      M: { bust: [85, 91], waist: [65, 72], hip: [92, 97], height: [158, 170] },
      L: { bust: [92, 98], waist: [73, 80], hip: [98, 105], height: [164, 176] },
      XL: { bust: [99, 107], waist: [81, 89], hip: [106, 113], height: [168, 182] },
    },
  },
  {
    id: 'outfit_espresso_halter_skirt_05',
    name: 'Set Áo Cổ Yếm Xoắn Ngực Nâu Espresso & Chân Váy Denim Xếp Ly',
    subtitle: 'Áo yếm nâu trầm viền lượn sóng tôn bờ vai thon kết hợp chân váy ngắn Denim xanh chàm xếp ly năng động',
    category: 'Dạ tiệc lụa',
    styleTags: ['parisian_chic', 'luxury_evening', 'korean_casual', 'y2k_acubi'],
    targetGenders: ['female'],
    imageUrl: '/assets/outfits/outfit_set_08_espresso_halter_skirt.png',
    fabric: 'Thun Gân Lụa Mềm Co Giãn & Denim Xanh Indigo',
    season: 'Xuân Hè · Thu Sớm · Dạo phố & Tiệc tối',
    idealRatioNote: 'Thiết kế cổ yếm chữ V sâu kết hợp chân váy cạp trễ vừa phải giúp tôn trọn đường cong chữ S.',
    colorRule: 'Phối màu Tương đồng Trầm (Nâu Espresso + Xanh Chàm Indigo)',
    proportionRule: 'Áo Halter Không Tay Ôm Sát + Chân Váy Xếp Ly Ngắn Chữ A',
    garmentSpecs: {
      shoulderScale: 1.01,
      waistTaper: 0.84,
      hipDrape: 1.07,
      lengthType: 'midi_dress',
      primaryColor: '#6E472B',
      secondaryColor: '#2B4C7E',
      accentColor: '#D4A373',
    },
    baseMeasurements: {
      S: { bust: [76, 84], waist: [58, 64], hip: [84, 90], height: [150, 163] },
      M: { bust: [85, 90], waist: [65, 71], hip: [91, 96], height: [158, 169] },
      L: { bust: [91, 97], waist: [72, 79], hip: [97, 104], height: [163, 175] },
      XL: { bust: [98, 106], waist: [80, 88], hip: [105, 112], height: [167, 180] },
    },
  },
  {
    id: 'outfit_mesh_top_pink_bow_06',
    name: 'Set Áo Lưới Đen Tay Loe Xếp Nếp & Quần Jeans Baggy Đính Nơ Hồng',
    subtitle: 'Áo trễ vai voan lưới loang khói tay chuông phối cùng quần Jeans ống rộng xanh sáng đính nơ ruy băng hồng Y2K',
    category: 'Dạo phố đương đại',
    styleTags: ['y2k_acubi', 'coquette_babydoll', 'streetwear_denim'],
    targetGenders: ['female'],
    imageUrl: '/assets/outfits/outfit_set_10_mesh_top_pink_bow_jeans.png',
    fabric: 'Voan Lưới Xuyên Thấu 2 Lớp & Light-Wash Denim',
    season: 'Quanh năm · Phong cách Y2K & Coquette nổi bật',
    idealRatioNote: 'Sự tương phản giữa áo ôm sát xếp nếp và quần baggy ống rộng giúp vòng eo trông cực kỳ nhỏ nhắn.',
    colorRule: 'Điểm nhấn Pastel Ngọt Ngào (Đen Khói + Xanh Sáng + Nơ Hồng Phấn)',
    proportionRule: 'Quy tắc 1/3 - 2/3: Áo Ôm Vạt Ngắn + Quần Baggy Suông Dài Cạp Cao',
    garmentSpecs: {
      shoulderScale: 1.03,
      waistTaper: 0.86,
      hipDrape: 1.08,
      lengthType: 'denim_jacket',
      primaryColor: '#3F3F46',
      secondaryColor: '#89B0D3',
      accentColor: '#FBCFE8',
    },
    baseMeasurements: {
      S: { bust: [76, 84], waist: [58, 64], hip: [84, 90], height: [152, 164] },
      M: { bust: [85, 90], waist: [65, 71], hip: [91, 96], height: [158, 170] },
      L: { bust: [91, 97], waist: [72, 79], hip: [97, 104], height: [164, 176] },
      XL: { bust: [98, 106], waist: [80, 88], hip: [105, 113], height: [168, 182] },
    },
  },
  {
    id: 'outfit_grey_bow_black_skirt_17',
    name: 'Set Áo Thun Xám Đính Nơ Đen & Chân Váy Tầng Đen Thắt Nơ Bản To',
    subtitle: 'Áo thun cổ vuông nhún sườn đính nơ đen phối dây yếm kết hợp chân váy ngắn xếp tầng đen tuyền Coquette',
    category: 'Dạo phố đương đại',
    styleTags: ['coquette_babydoll', 'y2k_acubi', 'balletcore_soft'],
    targetGenders: ['female'],
    imageUrl: '/assets/outfits/outfit_set_17_grey_bow_black_skirt.png',
    fabric: 'Thun Cotton Gân Mềm & Kaki Mềm Xếp Tầng',
    season: 'Xuân Hè · Thu · Dạo phố, Xem concert & Chụp hình',
    idealRatioNote: 'Đường nhún chéo bên sườn áo kết hợp chân váy xếp tầng xòe giúp tạo hiệu ứng eo nhỏ hông nở quyến rũ.',
    colorRule: 'Monochrome Đồng Điệu (Xám Trung Tính + Đen Tuyền)',
    proportionRule: 'Áo Ôm Vạt Chéo Bất Đối Xứng + Chân Váy Xòe Ngắn 2 Tầng',
    garmentSpecs: {
      shoulderScale: 1.02,
      waistTaper: 0.85,
      hipDrape: 1.08,
      lengthType: 'midi_dress',
      primaryColor: '#71717A',
      secondaryColor: '#18181B',
      accentColor: '#27272A',
    },
    baseMeasurements: {
      S: { bust: [76, 84], waist: [58, 64], hip: [84, 90], height: [150, 163] },
      M: { bust: [85, 90], waist: [65, 71], hip: [91, 96], height: [158, 170] },
      L: { bust: [91, 97], waist: [72, 79], hip: [97, 104], height: [164, 176] },
      XL: { bust: [98, 106], waist: [80, 88], hip: [105, 112], height: [168, 182] },
    },
  },
  {
    id: 'outfit_cross_halter_flared_18',
    name: 'Set Áo Corset Đan Chéo Cổ Halter & Quần Jeans Ống Loe Cạp Trái Tim',
    subtitle: 'Áo corset gân nâu Chocolate dây đan chéo cổ gợi cảm phối cùng quần Jeans ống loe xanh chàm cạp khóa trái tim',
    category: 'Dạ tiệc lụa',
    styleTags: ['luxury_evening', 'vintage_retro', 'parisian_chic'],
    targetGenders: ['female'],
    imageUrl: '/assets/outfits/outfit_set_18_cross_halter_flared.png',
    fabric: 'Thun Gân Dày Định Hình & Dark Indigo Stretch Denim',
    season: 'Quanh năm · Tiệc tối, Hẹn hò & Sự kiện',
    idealRatioNote: 'Dây cổ đan chéo thu hút ánh nhìn lên bờ vai thon, kết hợp quần ống loe tối màu giúp đôi chân thon dài miên man.',
    colorRule: 'Phối màu Trầm Sang Trọng (Nâu Chocolate + Xanh Indigo Đậm)',
    proportionRule: 'Quy tắc 1/3 - 2/3: Áo Corset Vạt Nhọn + Quần Ống Loe Dài Ôm Đùi',
    garmentSpecs: {
      shoulderScale: 1.01,
      waistTaper: 0.83,
      hipDrape: 1.05,
      lengthType: 'blazer_set',
      primaryColor: '#5C3A21',
      secondaryColor: '#1E3A5F',
      accentColor: '#D4A373',
    },
    baseMeasurements: {
      S: { bust: [76, 84], waist: [58, 64], hip: [82, 90], height: [152, 164] },
      M: { bust: [85, 90], waist: [65, 71], hip: [91, 96], height: [158, 170] },
      L: { bust: [91, 97], waist: [72, 79], hip: [97, 104], height: [164, 176] },
      XL: { bust: [98, 106], waist: [80, 88], hip: [105, 112], height: [168, 182] },
    },
  },
  {
    id: 'outfit_sage_wrap_pleated_skirt_19',
    name: 'Set Áo Len Đắp Chéo Phối Ren Xám Rêu & Chân Váy Chữ A Xanh Navy',
    subtitle: 'Áo len trễ vai đắp chéo phối dây ren tinh tế kết hợp chân váy ngắn xếp ly chữ A xanh Navy thanh lịch',
    category: 'Công sở thanh lịch',
    styleTags: ['minimalist_office', 'balletcore_soft', 'parisian_chic', 'preppy_school'],
    targetGenders: ['female'],
    imageUrl: '/assets/outfits/outfit_set_19_sage_wrap_pleated_skirt.png',
    fabric: 'Len Dệt Mịn Phối Ren & Tuytsi Xanh Navy Đứng Phom',
    season: 'Xuân Thu · Đi làm, Đi học & Gặp gỡ đối tác',
    idealRatioNote: 'Vạt áo đắp chéo chữ V giúp thon gọn thân trên, kết hợp chân váy xếp ly chữ A lịch sự và tôn dáng.',
    colorRule: 'Phối màu Lạnh Thanh Lịch (Xám Rêu Sage + Xanh Navy Trầm)',
    proportionRule: 'Áo Len Lửng Tay Dài Ôm Eo + Chân Váy Ngắn Chữ A Cạp Cao',
    garmentSpecs: {
      shoulderScale: 1.03,
      waistTaper: 0.86,
      hipDrape: 1.05,
      lengthType: 'midi_dress',
      primaryColor: '#6B7280',
      secondaryColor: '#1E293B',
      accentColor: '#94A3B8',
    },
    baseMeasurements: {
      S: { bust: [78, 85], waist: [59, 65], hip: [84, 91], height: [152, 164] },
      M: { bust: [86, 91], waist: [66, 72], hip: [92, 97], height: [158, 170] },
      L: { bust: [92, 98], waist: [73, 80], hip: [98, 105], height: [164, 176] },
      XL: { bust: [99, 107], waist: [81, 89], hip: [106, 113], height: [168, 182] },
    },
  },
  {
    id: 'outfit_scarf_tube_ribbon_jeans_20',
    name: 'Set Áo Quây Nâu Kèm Khăn Choàng Cổ & Quần Jeans Đan Dây Nơ Sườn',
    subtitle: 'Áo quây nhún thun nâu Espresso kèm khăn quàng cổ Y2K phối cùng quần Jeans ống suông xanh nhạt đan nơ dọc hai bên',
    category: 'Dạo phố đương đại',
    styleTags: ['y2k_acubi', 'streetwear_denim', 'luxury_evening'],
    targetGenders: ['female'],
    imageUrl: '/assets/outfits/outfit_set_20_scarf_tube_ribbon_jeans.png',
    fabric: 'Thun Lụa Nhún Co Giãn & Light Blue Denim Đan Dây',
    season: 'Xuân Hè · Thu · Dạo phố Acubi & Chụp hình thời trang',
    idealRatioNote: 'Dải khăn choàng cổ buông dọc kết hợp hàng nơ hai bên ống quần tạo đường thẳng đứng giúp vóc dáng thanh mảnh và cao ráo.',
    colorRule: 'Tương phản Nâu Đất Đậm (Espresso) + Xanh Denim Phấn (Pastel Blue)',
    proportionRule: 'Quy tắc Trên Ôm Ngắn (Bandeau 1/3) + Dưới Suông Dài (Wide Jeans 2/3)',
    garmentSpecs: {
      shoulderScale: 1.0,
      waistTaper: 0.84,
      hipDrape: 1.07,
      lengthType: 'denim_jacket',
      primaryColor: '#4A2C18',
      secondaryColor: '#93C5FD',
      accentColor: '#E2E8F0',
    },
    baseMeasurements: {
      S: { bust: [76, 84], waist: [58, 64], hip: [84, 90], height: [152, 164] },
      M: { bust: [85, 90], waist: [65, 71], hip: [91, 96], height: [158, 170] },
      L: { bust: [91, 97], waist: [72, 79], hip: [97, 104], height: [164, 176] },
      XL: { bust: [98, 106], waist: [80, 88], hip: [105, 113], height: [168, 182] },
    },
  },
  {
    id: 'outfit_california_hoodie_skirt_08',
    name: 'Set Hoodie Nỉ Xám "CALIFORNIA" & Chân Váy Tầng Đen Thắt Nơ',
    subtitle: 'Áo Hoodie nỉ bông xám than phom rộng phối cùng chân váy ngắn xếp tầng wash đen đính nơ bản to',
    category: 'Thu Đông cổ điển',
    styleTags: ['classic_autumn', 'korean_casual', 'coquette_babydoll'],
    targetGenders: ['female'],
    imageUrl: '/assets/outfits/outfit_set_11_california_hoodie_skirt.png',
    fabric: 'Nỉ Bông Cao Cấp & Washed Black Denim',
    season: 'Thu Đông · Thời tiết mát mẻ & Se lạnh',
    idealRatioNote: 'Phối Hoodie oversize với chân váy xòe ngắn giúp tạo vẻ ngoài trẻ trung, năng động và tôn đôi chân.',
    colorRule: 'Monochrome Cá Tính (Xám Than Charcoal + Đen Wash)',
    proportionRule: 'Quy tắc Trên Rộng Ấm (Oversize Hoodie) + Dưới Xòe Ngắn (Mini Tiered Skirt)',
    garmentSpecs: {
      shoulderScale: 1.07,
      waistTaper: 0.91,
      hipDrape: 1.08,
      lengthType: 'midi_dress',
      primaryColor: '#3F3F46',
      secondaryColor: '#27272A',
      accentColor: '#E4E4E7',
    },
    baseMeasurements: {
      S: { bust: [78, 86], waist: [59, 66], hip: [84, 91], height: [152, 164] },
      M: { bust: [86, 92], waist: [66, 73], hip: [92, 97], height: [158, 170] },
      L: { bust: [93, 99], waist: [74, 81], hip: [98, 105], height: [164, 176] },
      XL: { bust: [100, 108], waist: [82, 90], hip: [106, 113], height: [168, 182] },
    },
  },
  {
    id: 'outfit_espresso_knit_butterfly_09',
    name: 'Set Áo Len Gân Cổ V Nâu Mocha & Quần Jeans Baggy Họa Tiết Bướm',
    subtitle: 'Áo len dệt kim tay phồng cổ chữ V ấm áp phối cùng quần Jeans ống suông xám đen thêu bươm bướm',
    category: 'Thu Đông cổ điển',
    styleTags: ['classic_autumn', 'vintage_retro', 'streetwear_denim'],
    targetGenders: ['female'],
    imageUrl: '/assets/outfits/outfit_set_12_espresso_knit_butterfly_jeans.png',
    fabric: 'Len Dệt Kim Mềm Mịn & Washed Charcoal Denim',
    season: 'Thu Đông · Dạo phố & Du lịch Đà Lạt / Hà Nội',
    idealRatioNote: 'Áo len dáng lửng vừa chạm cạp quần baggy giúp giữ ấm mà vẫn tôn tỷ lệ lưng ngắn chân dài.',
    colorRule: 'Phối màu Trầm Cổ Điển (Nâu Mocha + Xám Than + Họa Tiết Trắng)',
    proportionRule: 'Quy tắc 1/3 - 2/3: Áo Len Lửng Cổ V + Quần Baggy Ống Rộng Dài',
    garmentSpecs: {
      shoulderScale: 1.04,
      waistTaper: 0.88,
      hipDrape: 1.06,
      lengthType: 'trench_coat',
      primaryColor: '#785238',
      secondaryColor: '#3F3F46',
      accentColor: '#E4E4E7',
    },
    baseMeasurements: {
      S: { bust: [78, 85], waist: [59, 65], hip: [84, 91], height: [152, 164] },
      M: { bust: [86, 91], waist: [66, 72], hip: [92, 97], height: [158, 170] },
      L: { bust: [92, 98], waist: [73, 80], hip: [98, 105], height: [164, 176] },
      XL: { bust: [99, 107], waist: [81, 89], hip: [106, 113], height: [168, 182] },
    },
  },
  {
    id: 'outfit_henley_denim_skirt_21',
    name: 'Set Áo Thun Tay Dài Layer Trắng Xám & Chân Váy Denim Hàng Cúc Trước',
    subtitle: 'Áo thun cổ cúc Henley xám nhạt phối layer áo hai dây trắng cùng chân váy chữ A Denim đính cúc kim loại',
    category: 'Dạo phố đương đại',
    styleTags: ['resort_linen', 'korean_casual', 'preppy_school'],
    targetGenders: ['female'],
    imageUrl: '/assets/outfits/outfit_set_21_henley_denim_skirt.png',
    fabric: 'Cotton Gân Mềm Co Giãn & Mid-Wash Blue Denim',
    season: 'Bốn mùa · Đi học, Cà phê cuối tuần & Dạo phố',
    idealRatioNote: 'Hàng cúc dọc từ cổ áo xuống chân váy tạo trục thẳng đứng giúp thân hình trông thanh thoát hơn.',
    colorRule: 'Phối màu Trung Tính Trẻ Trung (Xám Nhạt + Trắng + Xanh Denim)',
    proportionRule: 'Áo Tay Dài Ôm Vừa + Chân Váy Chữ A Ngắn Cạp Cao',
    garmentSpecs: {
      shoulderScale: 1.02,
      waistTaper: 0.87,
      hipDrape: 1.05,
      lengthType: 'midi_dress',
      primaryColor: '#9CA3AF',
      secondaryColor: '#3B82F6',
      accentColor: '#FFFFFF',
    },
    baseMeasurements: {
      S: { bust: [76, 84], waist: [58, 64], hip: [84, 90], height: [152, 164] },
      M: { bust: [85, 90], waist: [65, 71], hip: [91, 96], height: [158, 170] },
      L: { bust: [91, 97], waist: [72, 79], hip: [97, 104], height: [164, 176] },
      XL: { bust: [98, 106], waist: [80, 88], hip: [105, 112], height: [168, 182] },
    },
  },
  {
    id: 'outfit_turtleneck_ruffle_skirt_22',
    name: 'Set Áo Len Gân Cổ Lọ Sát Nách Nâu & Chân Váy Denim Đuôi Cá Nhún Bèo',
    subtitle: 'Áo len gân cổ cao sát nách tôn vai thon phối cùng chân váy ngắn Denim xanh đậm viền bèo xếp ly nữ tính',
    category: 'Công sở thanh lịch',
    styleTags: ['parisian_chic', 'minimalist_office', 'resort_linen', 'vintage_retro'],
    targetGenders: ['female'],
    imageUrl: '/assets/outfits/outfit_set_22_turtleneck_ruffle_skirt.png',
    fabric: 'Len Tăm Co Giãn 4 Chiều & Raw Indigo Denim',
    season: 'Xuân Hè · Thu · Dạo phố, Hẹn hò & Đi làm',
    idealRatioNote: 'Thiết kế cổ lọ sát nách khoe khéo bờ vai, kết hợp chân váy đuôi cá xòe nhẹ giúp tôn vòng 3 đầy đặn.',
    colorRule: 'Phối màu Old Money Trầm Ấm (Nâu Espresso + Xanh Indigo Đậm)',
    proportionRule: 'Áo Sát Nách Ôm Sát Thân Trên + Chân Váy Ngắn Đuôi Cá Xòe Nhẹ',
    garmentSpecs: {
      shoulderScale: 1.0,
      waistTaper: 0.85,
      hipDrape: 1.07,
      lengthType: 'midi_dress',
      primaryColor: '#5C4033',
      secondaryColor: '#1E293B',
      accentColor: '#D4A373',
    },
    baseMeasurements: {
      S: { bust: [76, 84], waist: [58, 64], hip: [84, 90], height: [150, 163] },
      M: { bust: [85, 90], waist: [65, 71], hip: [91, 96], height: [158, 170] },
      L: { bust: [91, 97], waist: [72, 79], hip: [97, 104], height: [164, 176] },
      XL: { bust: [98, 106], waist: [80, 88], hip: [105, 112], height: [168, 182] },
    },
  },

  // ======================== 6 BỘ ĐỒ NAM / UNISEX ĐÃ TÁCH RIÊNG ========================
  {
    id: 'outfit_valley_hoodie_01',
    name: 'Set Hoodie Zip Đen "VALLEY" & Quần Jeans Ống Rộng Phối Xích',
    subtitle: 'Áo khoác Hoodie khóa kéo layer thun trắng kết hợp quần Jeans ống suông đen tuyền gắn xích bạc và Sneaker Canvas',
    category: 'Dạo phố đương đại',
    styleTags: ['streetwear_denim', 'korean_casual', 'y2k_acubi'],
    targetGenders: ['male', 'neutral'],
    imageUrl: '/assets/outfits/outfit_set_01_valley_hoodie.png',
    fabric: 'Nỉ Cotton 380gsm & Washed Denim 13oz · Đứng phom cá tính',
    season: 'Quanh năm · Dạo phố & Đi học',
    idealRatioNote: 'Áo Hoodie phom boxy vừa ngang hông kết hợp quần ống rộng cạp cao giúp kéo dài đôi chân.',
    colorRule: 'Monochrome Đen - Trắng Tương Phản Mạnh',
    proportionRule: 'Áo Khoác Boxy Ngang Hông + Quần Jeans Suông Rộng Dài',
    garmentSpecs: {
      shoulderScale: 1.1,
      waistTaper: 0.96,
      hipDrape: 1.06,
      lengthType: 'denim_jacket',
      primaryColor: '#27272A',
      secondaryColor: '#18181B',
      accentColor: '#E4E4E7',
    },
    baseMeasurements: {
      S: { bust: [84, 90], waist: [68, 74], hip: [88, 94], height: [162, 170] },
      M: { bust: [91, 97], waist: [75, 81], hip: [95, 101], height: [168, 176] },
      L: { bust: [98, 105], waist: [82, 88], hip: [102, 108], height: [174, 183] },
      XL: { bust: [106, 114], waist: [89, 97], hip: [109, 116], height: [178, 190] },
    },
  },
  {
    id: 'outfit_plaid_flannel_set_04',
    name: 'Set Sơ Mi Flannel Caro Đen Trắng & Quần Jeans Baggy Xám Khói',
    subtitle: 'Áo sơ mi caro khoác ngoài áo thun trắng cổ tròn phối cùng quần Jeans ống suông wash xám tro kèm dây xích hông',
    category: 'Dạo phố đương đại',
    styleTags: ['streetwear_denim', 'vintage_retro', 'preppy_school'],
    targetGenders: ['male', 'neutral'],
    imageUrl: '/assets/outfits/outfit_set_04_plaid_flannel.png',
    fabric: 'Flannel Cotton Dệt Thoi & Vintage Washed Denim',
    season: 'Quanh năm · Phong cách Layering năng động',
    idealRatioNote: 'Phối layer sơ mi mở cúc tạo hai đường kẻ dọc giúp thân trên trông gọn gàng và cao ráo hơn.',
    colorRule: 'Trung tính Đen - Trắng - Xám Khói hài hòa',
    proportionRule: 'Layer Sơ Mi Mở Cúc + Quần Baggy Suông Dài Cân Đối',
    garmentSpecs: {
      shoulderScale: 1.08,
      waistTaper: 0.95,
      hipDrape: 1.06,
      lengthType: 'denim_jacket',
      primaryColor: '#3F3F46',
      secondaryColor: '#52525B',
      accentColor: '#F4F4F5',
    },
    baseMeasurements: {
      S: { bust: [84, 90], waist: [68, 74], hip: [88, 94], height: [162, 170] },
      M: { bust: [91, 97], waist: [75, 81], hip: [95, 101], height: [168, 176] },
      L: { bust: [98, 105], waist: [82, 88], hip: [102, 108], height: [174, 183] },
      XL: { bust: [106, 114], waist: [89, 97], hip: [109, 116], height: [178, 190] },
    },
  },
  {
    id: 'outfit_star_bomber_cargo_07',
    name: 'Set Áo Khoác Bomber Đen Phối Thun Ngôi Sao & Quần Cargo Ống Rộng',
    subtitle: 'Áo khoác cổ đứng đen tuyền mặc ngoài áo thun trắng in ngôi sao vintage cùng quần dù ống rộng và Sneaker',
    category: 'Dạo phố đương đại',
    styleTags: ['streetwear_denim', 'minimalist_office', 'korean_casual'],
    targetGenders: ['male', 'neutral'],
    imageUrl: '/assets/outfits/outfit_set_03_star_bomber.png',
    fabric: 'Kaki Dù Chống Nhăn & Cotton Compact 250gsm',
    season: 'Quanh năm · Năng động & Hiện đại',
    idealRatioNote: 'Tương phản hai tông màu Đen - Trắng giúp định hình khung vai vuông vức và che khuyết điểm tốt.',
    colorRule: 'Tương phản Tối Giản (Đen Tuyền + Trắng Sáng)',
    proportionRule: 'Áo Khoác Bomber Lửng Ngang Thắt Lưng + Quần Cargo Ống Rộng',
    garmentSpecs: {
      shoulderScale: 1.09,
      waistTaper: 0.94,
      hipDrape: 1.06,
      lengthType: 'denim_jacket',
      primaryColor: '#18181B',
      secondaryColor: '#27272A',
      accentColor: '#FAFAFA',
    },
    baseMeasurements: {
      S: { bust: [84, 90], waist: [68, 74], hip: [88, 94], height: [162, 170] },
      M: { bust: [91, 97], waist: [75, 81], hip: [95, 101], height: [168, 176] },
      L: { bust: [98, 105], waist: [82, 88], hip: [102, 108], height: [174, 183] },
      XL: { bust: [106, 114], waist: [89, 97], hip: [109, 116], height: [178, 190] },
    },
  },
  {
    id: 'outfit_striped_knit_set_10',
    name: 'Set Áo Len Kẻ Sọc Ngang Oversize & Quần Jeans Wash Bụi Vintage',
    subtitle: 'Áo len kẻ sọc đen trắng phom rộng thoải mái kết hợp quần Jeans ống suông wash nâu xám cổ điển và Sneaker 3 sọc',
    category: 'Thu Đông cổ điển',
    styleTags: ['classic_autumn', 'vintage_retro', 'korean_casual'],
    targetGenders: ['male', 'neutral'],
    imageUrl: '/assets/outfits/outfit_set_06_striped_knit.png',
    fabric: 'Len Cotton Dệt Kim & Vintage Sand-Washed Denim',
    season: 'Thu Đông · Thời tiết mát dịu & Se lạnh',
    idealRatioNote: 'Kẻ sọc ngang mảnh giúp mở rộng bờ vai cân đối, rất hợp với dáng người mảnh hoặc chữ nhật.',
    colorRule: 'Kẻ Sọc Đen Trắng Cổ Điển + Xám Nâu Wash Bụi',
    proportionRule: 'Áo Len Rộng Thoải Mái + Quần Jeans Ống Suông Đứng Phom',
    garmentSpecs: {
      shoulderScale: 1.08,
      waistTaper: 0.95,
      hipDrape: 1.05,
      lengthType: 'trench_coat',
      primaryColor: '#27272A',
      secondaryColor: '#52525B',
      accentColor: '#F4F4F5',
    },
    baseMeasurements: {
      S: { bust: [84, 90], waist: [68, 74], hip: [88, 94], height: [162, 170] },
      M: { bust: [91, 97], waist: [75, 81], hip: [95, 101], height: [168, 176] },
      L: { bust: [98, 105], waist: [82, 88], hip: [102, 108], height: [174, 183] },
      XL: { bust: [106, 114], waist: [89, 97], hip: [109, 116], height: [178, 190] },
    },
  },
  {
    id: 'outfit_khaki_overshirt_set_11',
    name: 'Set Áo Khoác Sơ Mi Kaki Nâu Be & Quần Ống Suông Đen Tối Giản',
    subtitle: 'Áo sơ mi Kaki túi hộp khoác ngoài áo thun trắng tinh gọn phối cùng quần ống rộng đen và Sneaker màu kem',
    category: 'Công sở thanh lịch',
    styleTags: ['minimalist_office', 'parisian_chic', 'resort_linen'],
    targetGenders: ['male', 'neutral'],
    imageUrl: '/assets/outfits/outfit_set_05_khaki_overshirt.png',
    fabric: 'Cotton Twill Kaki Mềm & Quần Dệt Chéo Đứng Phom',
    season: 'Bốn mùa · Đi làm, Đi học & Dạo phố',
    idealRatioNote: 'Tông màu trung tính Nâu Be - Trắng - Đen dễ mặc, lịch sự và phù hợp với mọi tông da.',
    colorRule: 'Tam sắc Trung Tính (Nâu Kaki Ấm + Trắng + Đen)',
    proportionRule: 'Áo Khoác Sơ Mi Đứng Phom + Quần Âu Ống Rộng Suông Thẳng',
    garmentSpecs: {
      shoulderScale: 1.06,
      waistTaper: 0.93,
      hipDrape: 1.04,
      lengthType: 'blazer_set',
      primaryColor: '#8C7A6B',
      secondaryColor: '#18181B',
      accentColor: '#F5F5F4',
    },
    baseMeasurements: {
      S: { bust: [84, 90], waist: [68, 74], hip: [88, 94], height: [162, 170] },
      M: { bust: [91, 97], waist: [75, 81], hip: [95, 101], height: [168, 176] },
      L: { bust: [98, 105], waist: [82, 88], hip: [102, 108], height: [174, 183] },
      XL: { bust: [106, 114], waist: [89, 97], hip: [109, 116], height: [178, 190] },
    },
  },
  {
    id: 'outfit_washed_sweater_set_12',
    name: 'Set Sweater Nỉ Wash Xám Tro & Quần Jeans Baggy Đen Tuyền',
    subtitle: 'Áo Sweater cổ tròn wash loang bụi bặm kết hợp quần Jeans ống suông rộng và giày Chunky Sneaker đen',
    category: 'Thu Đông cổ điển',
    styleTags: ['streetwear_denim', 'vintage_retro', 'classic_autumn'],
    targetGenders: ['male', 'neutral'],
    imageUrl: '/assets/outfits/outfit_set_02_washed_sweater.png',
    fabric: 'Nỉ Acid-Wash 400gsm & Heavyweight Denim',
    season: 'Thu Đông · Dạo phố cá tính',
    idealRatioNote: 'Bo gấu áo sweater dừng ngay thắt lưng kết hợp quần cạp cao giúp tổng thể gọn gàng, khỏe khoắn.',
    colorRule: 'Monochrome Chuyển Sắc (Xám Tro Acid-Wash + Đen Tuyền)',
    proportionRule: 'Áo Sweater Bo Gấu Gọn Gàng + Quần Jeans Baggy Suông Dài',
    garmentSpecs: {
      shoulderScale: 1.09,
      waistTaper: 0.95,
      hipDrape: 1.06,
      lengthType: 'denim_jacket',
      primaryColor: '#52525B',
      secondaryColor: '#27272A',
      accentColor: '#A1A1AA',
    },
    baseMeasurements: {
      S: { bust: [84, 90], waist: [68, 74], hip: [88, 94], height: [162, 170] },
      M: { bust: [91, 97], waist: [75, 81], hip: [95, 101], height: [168, 176] },
      L: { bust: [98, 105], waist: [82, 88], hip: [102, 108], height: [174, 183] },
      XL: { bust: [106, 114], waist: [89, 97], hip: [109, 116], height: [178, 190] },
    },
  },
];

export function calculateOutfitFit(
  outfit: OutfitItem,
  profile: Pick<UserProfile, 'heightCm' | 'weightKg' | 'bustCm' | 'waistCm' | 'hipCm'>
): {
  recommendedSize: 'S' | 'M' | 'L' | 'XL';
  fitScore: number;
  fitNotes: string;
} {
  const sizes: ('S' | 'M' | 'L' | 'XL')[] = ['S', 'M', 'L', 'XL'];
  let bestSize: 'S' | 'M' | 'L' | 'XL' = 'M';
  let minPenalty = Infinity;

  for (const sz of sizes) {
    const spec = outfit.baseMeasurements[sz];
    const bustMid = (spec.bust[0] + spec.bust[1]) / 2;
    const waistMid = (spec.waist[0] + spec.waist[1]) / 2;
    const hipMid = (spec.hip[0] + spec.hip[1]) / 2;
    const heightMid = (spec.height[0] + spec.height[1]) / 2;

    const penalty =
      Math.abs(profile.bustCm - bustMid) * 1.2 +
      Math.abs(profile.waistCm - waistMid) * 1.5 +
      Math.abs(profile.hipCm - hipMid) * 1.2 +
      Math.abs(profile.heightCm - heightMid) * 0.4;

    if (penalty < minPenalty) {
      minPenalty = penalty;
      bestSize = sz;
    }
  }

  const rawScore = Math.max(76, Math.min(99, Math.round(100 - minPenalty * 0.85)));
  const spec = outfit.baseMeasurements[bestSize];

  let fitNotes = `Vừa vặn chuẩn xác với Size ${bestSize} theo số đo ${profile.bustCm}-${profile.waistCm}-${profile.hipCm} cm.`;
  if (profile.waistCm < spec.waist[0]) {
    fitNotes = `Size ${bestSize} ôm vừa vòng ngực và hông; phần eo hơi thoải mái (+${Math.round(spec.waist[0] - profile.waistCm)}cm), có thể thắt nhẹ đai.`;
  } else if (profile.waistCm > spec.waist[1]) {
    fitNotes = `Size ${bestSize} tôn dáng cơ thể; phần eo ôm sát gợi cảm.`;
  }

  return {
    recommendedSize: bestSize,
    fitScore: rawScore,
    fitNotes,
  };
}
