import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbFilePath = path.resolve(__dirname, '..', 'db.json');

const initialDatabase = {
  users: [
    {
      uid: 'user_demo_gmail_com',
      contactIdentifier: 'demo@gmail.com',
      contactType: 'email',
      passwordHash: '254f51f106201053b27848292b285202e3a579850d2a2f768029c97b37735802',
      otpVerified: true,
      displayName: 'Minh Thư (Tài Khoản Mẫu)',
      avatarUrl: '/src/assets/images/avatar_fashion_default_1793893594523.jpg',
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
    },
    {
      uid: 'user_0901234567',
      contactIdentifier: '0901234567',
      contactType: 'phone',
      passwordHash: '254f51f106201053b27848292b285202e3a579850d2a2f768029c97b37735802',
      otpVerified: true,
      displayName: 'Hoàng Nam',
      avatarUrl: 'https://api.dicebear.com/9.x/notionists/svg?seed=MilanVogue&backgroundColor=e8dfd1',
      heightCm: 175,
      weightKg: 68,
      bustCm: 96,
      waistCm: 78,
      hipCm: 95,
      genderStyle: 'male',
      favoriteStyles: ['korean_casual', 'streetwear_hiphop', 'minimalist_office'],
      faceShape: 'square',
      undertone: 'warm',
      onboardingCompleted: true,
    },
  ],
  outfits: [
    {
      id: 'outfit_preppy_shirt_tennis_14',
      name: 'Set Sơ Mi Chiết Eo Nâu Espresso & Chân Váy Tennis Trắng Xếp Ly',
      category: 'Công sở thanh lịch',
      gender: 'female',
      imageUrl: '/assets/outfits/outfit_set_14_preppy_shirt_tennis.png',
      fabric: 'Cotton Poplin Co Giãn & Tuytsi Trắng Đứng Ly',
      primaryColor: '#4A2C18',
      secondaryColor: '#FAFAFA',
    },
    {
      id: 'outfit_espresso_corset_flared_02',
      name: 'Set Áo Corset Tay Loe Nâu Espresso & Quần Jeans Ống Loe Đính Nơ',
      category: 'Dạ tiệc lụa',
      gender: 'female',
      imageUrl: '/assets/outfits/outfit_set_07_espresso_corset_flared.png',
      fabric: 'Voan Lụa Phối Thun Gân Co Giãn & Denim 12oz',
      primaryColor: '#5C3A21',
      secondaryColor: '#6082B6',
    },
    {
      id: 'outfit_henley_denim_skirt_21',
      name: 'Set Áo Thun Tay Dài Layer Trắng Xám & Chân Váy Denim Hàng Cúc Trước',
      category: 'Dạo phố đương đại',
      gender: 'female',
      imageUrl: '/assets/outfits/outfit_set_21_henley_denim_skirt.png',
      fabric: 'Cotton Gân Mềm & Mid-Wash Blue Denim',
      primaryColor: '#9CA3AF',
      secondaryColor: '#3B82F6',
    },
  ],
  tryOnHistory: [
    {
      id: 'seed_tryon_1_user_demo_gmail_com',
      userId: 'user_demo_gmail_com',
      outfitId: 'outfit_preppy_shirt_tennis_14',
      outfitName: 'Set Sơ Mi Chiết Eo Nâu Espresso & Chân Váy Tennis Trắng Xếp Ly',
      category: 'Công sở thanh lịch',
      imageUrl: '/assets/outfits/outfit_set_14_preppy_shirt_tennis.png',
      tryOnMode: 'mannequin_3d',
      recommendedSize: 'M',
      fitScore: 98,
      snapshotMeasurements: '165cm · 52kg · 3V: 86-64-92',
      notes: 'Tôn vòng eo 64cm cực chuẩn theo tỷ lệ vàng 1/3 - 2/3, phù hợp đi học thuyết trình & công sở.',
      createdAtMs: Date.now() - 3600000 * 12,
    },
    {
      id: 'seed_tryon_2_user_demo_gmail_com',
      userId: 'user_demo_gmail_com',
      outfitId: 'outfit_espresso_corset_flared_02',
      outfitName: 'Set Áo Corset Tay Loe Nâu Espresso & Quần Jeans Ống Loe Đính Nơ',
      category: 'Dạ tiệc lụa',
      imageUrl: '/assets/outfits/outfit_set_07_espresso_corset_flared.png',
      tryOnMode: 'ar_camera',
      recommendedSize: 'M',
      fitScore: 96,
      snapshotMeasurements: '165cm · 52kg · 3V: 86-64-92',
      notes: 'Quần jeans ống loe cạp cao giúp kéo dài đôi chân thêm 5-7cm, rất hợp đi hẹn hò tối.',
      createdAtMs: Date.now() - 3600000 * 36,
    },
  ],
};

try {
  if (!fs.existsSync(dbFilePath)) {
    fs.writeFileSync(dbFilePath, JSON.stringify(initialDatabase, null, 2), 'utf-8');
    console.log('[Smart Wardrobe] Đã tự động khởi tạo file db.json với dữ liệu mẫu thành công.');
  }
} catch (err) {
  console.warn('[Smart Wardrobe] Bỏ qua tạo db.json vật lý (sử dụng LocalStorage & bộ nhớ trong):', err);
}
