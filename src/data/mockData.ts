import {
  CURATED_OUTFITS,
  DEFAULT_AVATARS,
  OutfitItem,
  TryOnHistoryItem,
  UserProfile,
  AuraLearnedContext,
} from '../types';

export interface LocalAccountRecord {
  contactIdentifier: string;
  contactType: 'email' | 'phone';
  passwordHash: string;
  plainPasswordHint?: string;
  otpVerified: boolean;
  profile: UserProfile;
}

export interface MockDatabaseSchema {
  outfits: OutfitItem[];
  accounts: Record<string, LocalAccountRecord>;
  tryOnHistory: TryOnHistoryItem[];
  learnedContext: AuraLearnedContext;
}

// SHA-256("123456_atelier_aura_salt_2026")
export const DEMO_PASSWORD_HASH_123456 =
  '254f51f106201053b27848292b285202e3a579850d2a2f768029c97b37735802';

export const DEMO_USER_PROFILE: UserProfile = {
  uid: 'user_demo_gmail_com',
  displayName: 'Minh Thư (Tài Khoản Mẫu)',
  avatarUrl: DEFAULT_AVATARS[0],
  heightCm: 165,
  weightKg: 52,
  bustCm: 86,
  waistCm: 64,
  hipCm: 92,
  genderStyle: 'female',
  favoriteStyles: ['coquette_babydoll', 'korean_casual', 'preppy_school', 'y2k_acubi'],
  faceShape: 'round',
  undertone: 'warm',
  onboardingCompleted: true,
};

export const INITIAL_MOCK_ACCOUNTS: Record<string, LocalAccountRecord> = {
  'demo@gmail.com': {
    contactIdentifier: 'demo@gmail.com',
    contactType: 'email',
    passwordHash: DEMO_PASSWORD_HASH_123456,
    plainPasswordHint: '123456',
    otpVerified: true,
    profile: DEMO_USER_PROFILE,
  },
  'khachhang@gmail.com': {
    contactIdentifier: 'khachhang@gmail.com',
    contactType: 'email',
    passwordHash: DEMO_PASSWORD_HASH_123456,
    plainPasswordHint: '123456',
    otpVerified: true,
    profile: {
      ...DEMO_USER_PROFILE,
      uid: 'user_khachhang_gmail_com',
      displayName: 'Khánh Linh',
    },
  },
  '0901234567': {
    contactIdentifier: '0901234567',
    contactType: 'phone',
    passwordHash: DEMO_PASSWORD_HASH_123456,
    plainPasswordHint: '123456',
    otpVerified: true,
    profile: {
      ...DEMO_USER_PROFILE,
      uid: 'user_0901234567',
      displayName: 'Hoàng Nam',
      genderStyle: 'male',
      heightCm: 175,
      weightKg: 68,
      bustCm: 96,
      waistCm: 78,
      hipCm: 95,
      favoriteStyles: ['korean_casual', 'streetwear_hiphop', 'minimalist_office'],
    },
  },
};

export function createInitialTryOnHistory(userId: string): TryOnHistoryItem[] {
  const now = Date.now();
  return [
    {
      id: `seed_tryon_1_${userId}`,
      userId,
      outfitId: 'outfit_preppy_shirt_tennis_14',
      outfitName: 'Set Sơ Mi Chiết Eo Nâu Espresso & Chân Váy Tennis Trắng Xếp Ly',
      category: 'Công sở thanh lịch',
      imageUrl: '/assets/outfits/outfit_set_14_preppy_shirt_tennis.png',
      tryOnMode: 'mannequin_3d',
      recommendedSize: 'M',
      fitScore: 98,
      snapshotMeasurements: '165cm · 52kg · 3V: 86-64-92',
      notes: 'Tôn vòng eo 64cm cực chuẩn theo tỷ lệ vàng 1/3 - 2/3, phù hợp đi học thuyết trình & công sở.',
      createdAtMs: now - 3600 * 1000 * 12,
    },
    {
      id: `seed_tryon_2_${userId}`,
      userId,
      outfitId: 'outfit_espresso_corset_flared_02',
      outfitName: 'Set Áo Corset Tay Loe Nâu Espresso & Quần Jeans Ống Loe Đính Nơ',
      category: 'Dạ tiệc lụa',
      imageUrl: '/assets/outfits/outfit_set_07_espresso_corset_flared.png',
      tryOnMode: 'ar_camera',
      recommendedSize: 'M',
      fitScore: 96,
      snapshotMeasurements: '165cm · 52kg · 3V: 86-64-92',
      notes: 'Quần jeans ống loe cạp cao giúp kéo dài đôi chân thêm 5-7cm, rất hợp đi hẹn hò tối.',
      createdAtMs: now - 3600 * 1000 * 36,
    },
    {
      id: `seed_tryon_3_${userId}`,
      userId,
      outfitId: 'outfit_henley_denim_skirt_21',
      outfitName: 'Set Áo Thun Tay Dài Layer Trắng Xám & Chân Váy Denim Hàng Cúc Trước',
      category: 'Dạo phố đương đại',
      imageUrl: '/assets/outfits/outfit_set_21_henley_denim_skirt.png',
      tryOnMode: 'curated_match',
      recommendedSize: 'M',
      fitScore: 95,
      snapshotMeasurements: '165cm · 52kg · 3V: 86-64-92',
      notes: 'Chất vải cotton gân mềm thoáng mát, năng động khi đi cà phê dạo phố cuối tuần.',
      createdAtMs: now - 3600 * 1000 * 72,
    },
  ];
}

export const INITIAL_LEARNED_CONTEXT: AuraLearnedContext = {
  recentEvent: 'Đi học / Thuyết trình & Dạo phố',
  eventKey: 'di_hoc',
  preferredColors: ['Nâu Espresso', 'Trắng Kem', 'Xanh Denim'],
  dislikedColors: [],
  bodyConcerns: ['Tôn eo thon 64cm', 'Che khuyết điểm hông'],
  weatherNote: 'Ưu tiên chất liệu Cotton Poplin & Linen thoáng mát cho thời tiết 30-33°C',
  preferredStyles: ['preppy_school', 'korean_casual', 'coquette_babydoll'],
  customReasonTemplate:
    'Được Aura chọn lọc dựa trên số đo 3 vòng và sở thích phối đồ tôn eo chuẩn tỷ lệ 1/3 - 2/3 của bạn.',
  timestamp: Date.now(),
};

export const INITIAL_MOCK_DATABASE: MockDatabaseSchema = {
  outfits: CURATED_OUTFITS,
  accounts: INITIAL_MOCK_ACCOUNTS,
  tryOnHistory: createInitialTryOnHistory(DEMO_USER_PROFILE.uid),
  learnedContext: INITIAL_LEARNED_CONTEXT,
};

/**
 * Tự động khởi tạo dữ liệu mẫu vào LocalStorage của trình duyệt nếu người dùng mới tải code về chạy lần đầu.
 * Hoàn toàn thay thế json-server, không cần mở thêm bất kỳ terminal phụ nào.
 */
export function initializeLocalStorageWithMockData(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    // 1. Seed danh sách tài khoản mẫu vào localStorage (giữ nguyên các tài khoản người dùng đã tự đăng ký)
    const rawAccounts = localStorage.getItem('atelier_aura_accounts');
    const existingAccounts: Record<string, LocalAccountRecord> = rawAccounts
      ? JSON.parse(rawAccounts)
      : {};

    let accountsUpdated = false;
    for (const [key, account] of Object.entries(INITIAL_MOCK_ACCOUNTS)) {
      if (!existingAccounts[key]) {
        existingAccounts[key] = account;
        accountsUpdated = true;
      }
    }

    if (!rawAccounts || accountsUpdated) {
      localStorage.setItem('atelier_aura_accounts', JSON.stringify(existingAccounts));
    }

    // 2. Đặt sẵn gợi ý email đăng nhập mặc định nếu chưa từng đăng nhập
    if (!localStorage.getItem('atelier_aura_last_contact')) {
      localStorage.setItem('atelier_aura_last_contact', 'demo@gmail.com');
    }

    // 3. Seed lịch sử thử đồ mẫu cho tài khoản demo nếu chưa có
    const demoHistoryKey = `atelier_history_${DEMO_USER_PROFILE.uid}`;
    if (!localStorage.getItem(demoHistoryKey)) {
      localStorage.setItem(
        demoHistoryKey,
        JSON.stringify(createInitialTryOnHistory(DEMO_USER_PROFILE.uid))
      );
    }

    // 4. Lưu bản sao danh mục quần áo chuẩn vào localStorage để hoạt động offline 100%
    if (!localStorage.getItem('atelier_aura_outfits_catalog')) {
      localStorage.setItem('atelier_aura_outfits_catalog', JSON.stringify(CURATED_OUTFITS));
    }
  } catch (err) {
    console.warn('LocalStorage mock initialization notice:', err);
  }
}

/**
 * Lấy lịch sử phối đồ từ LocalStorage, nếu chưa có sẽ tự động khởi tạo lịch sử mẫu cho người dùng
 */
export function getOrSeedUserHistory(userId: string): TryOnHistoryItem[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return createInitialTryOnHistory(userId);
  }
  try {
    const key = `atelier_history_${userId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    const seeded = createInitialTryOnHistory(userId);
    localStorage.setItem(key, JSON.stringify(seeded));
    return seeded;
  } catch {
    return createInitialTryOnHistory(userId);
  }
}
