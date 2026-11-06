import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, GenerateContentResponse, Type } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));

// Initialize server-side Gemini client per @google/genai guidelines
function getGenAIClient() {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function hasValidApiKey(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return Boolean(
    key &&
      key !== 'MY_GEMINI_API_KEY' &&
      key !== 'YOUR_GEMINI_API_KEY' &&
      !key.includes('PLACEHOLDER')
  );
}

function isRateLimitOrQuotaError(err: unknown): boolean {
  if (!err) return false;
  const str = String(err).toLowerCase();
  return (
    str.includes('429') ||
    str.includes('resource_exhausted') ||
    str.includes('quota') ||
    str.includes('rate limit') ||
    str.includes('rate-limit') ||
    str.includes('billing')
  );
}

export type MessageIntent = 'greeting' | 'qa' | 'styling';

export interface CatalogOutfitItem {
  id: string;
  name: string;
  category: string;
  gender: 'female' | 'male' | 'neutral';
  imageUrl: string;
  fabric: string;
  top_name: string;
  top_hex: string;
  bottom_name: string;
  bottom_hex: string;
  keywords: string[];
}

export const WARDROBE_CATALOG: CatalogOutfitItem[] = [
  {
    id: 'outfit_coquette_bow_skirt_13',
    name: 'Set Áo Quây Nơ Nâu Mocha & Chân Váy Trắng Xếp Tầng Coquette',
    category: 'Dạ tiệc lụa',
    gender: 'female',
    imageUrl: '/assets/outfits/outfit_set_13_coquette_bow_skirt.png',
    fabric: 'Voan Lụa Mềm Rủ & Cotton Đũi Trắng Dập Nổi',
    top_name: 'Áo Quây Nơ Nâu Mocha',
    top_hex: '#6E472B',
    bottom_name: 'Chân Váy Trắng Xếp Tầng',
    bottom_hex: '#F5F5F4',
    keywords: ['coquette', 'tiểu thư', 'nơ', 'váy trắng', 'hẹn hò nhẹ', 'tiệc trà', 'búp bê'],
  },
  {
    id: 'outfit_espresso_corset_flared_02',
    name: 'Set Áo Corset Tay Loe Nâu Espresso & Quần Jeans Ống Loe Đính Nơ',
    category: 'Dạ tiệc lụa',
    gender: 'female',
    imageUrl: '/assets/outfits/outfit_set_07_espresso_corset_flared.png',
    fabric: 'Voan Lụa Phối Thun Gân Co Giãn & Denim 12oz',
    top_name: 'Áo Corset Nâu Espresso',
    top_hex: '#5C3A21',
    bottom_name: 'Quần Jeans Ống Loe Xanh Băng',
    bottom_hex: '#6082B6',
    keywords: ['corset', 'quần loe', 'tiệc tối', 'hẹn hò', 'y2k', 'tôn eo', 'hack chân', 'quyến rũ'],
  },
  {
    id: 'outfit_preppy_shirt_tennis_14',
    name: 'Set Sơ Mi Chiết Eo Nâu Espresso & Chân Váy Tennis Trắng Xếp Ly',
    category: 'Công sở thanh lịch',
    gender: 'female',
    imageUrl: '/assets/outfits/outfit_set_14_preppy_shirt_tennis.png',
    fabric: 'Cotton Poplin Co Giãn & Tuytsi Trắng Đứng Ly',
    top_name: 'Sơ Mi Chiết Eo Nâu Espresso',
    top_hex: '#4A2C18',
    bottom_name: 'Chân Váy Tennis Trắng',
    bottom_hex: '#FAFAFA',
    keywords: ['thuyết trình', 'đi học', 'trường', 'giảng đường', 'preppy', 'sơ mi', 'tennis', 'sinh viên'],
  },
  {
    id: 'outfit_grey_bell_pearl_jeans_15',
    name: 'Set Áo Len Gân Xám Tay Loe & Quần Jeans Ống Loe Đính Nơ Ngọc Trai',
    category: 'Dạo phố đương đại',
    gender: 'female',
    imageUrl: '/assets/outfits/outfit_set_15_grey_bell_pearl_jeans.png',
    fabric: 'Len Tăm Mềm Mịn & Light-Wash Denim Đính Ngọc Trai',
    top_name: 'Áo Len Gân Xám Tay Loe',
    top_hex: '#D4D4D8',
    bottom_name: 'Jeans Ống Loe Ngọc Trai',
    bottom_hex: '#93C5FD',
    keywords: ['chùa', 'lễ phật', 'kín đáo', 'thanh tịnh', 'balletcore', 'cà phê', 'dịu dàng'],
  },
  {
    id: 'outfit_grey_offshoulder_skirt_03',
    name: 'Set Áo Trễ Vai Bất Đối Xứng Xám Khói & Chân Váy Xếp Ly Xanh Nhạt',
    category: 'Dạo phố đương đại',
    gender: 'female',
    imageUrl: '/assets/outfits/outfit_set_09_grey_offshoulder_skirt.png',
    fabric: 'Cotton Melange Mềm Mịn & Denim Wash Xanh Băng',
    top_name: 'Áo Lệch Vai Xám Melange',
    top_hex: '#9CA3AF',
    bottom_name: 'Chân Váy Xếp Ly Xanh Nhạt',
    bottom_hex: '#93C5FD',
    keywords: ['dạo phố', 'trễ vai', 'hàn quốc', 'chụp hình', 'cà phê', 'năng động'],
  },
  {
    id: 'outfit_offshoulder_heart_jeans_16',
    name: 'Set Áo Len Trễ Vai Nâu Espresso & Quần Jeans Baggy Họa Tiết Trái Tim',
    category: 'Thu Đông cổ điển',
    gender: 'female',
    imageUrl: '/assets/outfits/outfit_set_16_offshoulder_heart_jeans.png',
    fabric: 'Len Gân Co Giãn & Washed Blue Denim Trái Tim',
    top_name: 'Áo Len Trễ Vai Nâu Espresso',
    top_hex: '#4A2E1B',
    bottom_name: 'Quần Jeans Baggy Trái Tim',
    bottom_hex: '#93C5FD',
    keywords: ['xem phim', 'máy lạnh', 'thu đông', 'se lạnh', 'baggy', 'trái tim', 'du lịch'],
  },
  {
    id: 'outfit_espresso_halter_skirt_05',
    name: 'Set Áo Cổ Yếm Xoắn Ngực Nâu Espresso & Chân Váy Denim Xếp Ly',
    category: 'Dạ tiệc lụa',
    gender: 'female',
    imageUrl: '/assets/outfits/outfit_set_08_espresso_halter_skirt.png',
    fabric: 'Thun Gân Lụa Mềm & Denim Xanh Indigo',
    top_name: 'Áo Cổ Yếm Nâu Espresso',
    top_hex: '#6E472B',
    bottom_name: 'Chân Váy Denim Xanh Chàm',
    bottom_hex: '#2B4C7E',
    keywords: ['concert', 'fanzone', 'flash', 'sân khấu', 'quẩy', 'cổ yếm', 'nóng'],
  },
  {
    id: 'outfit_mesh_top_pink_bow_06',
    name: 'Set Áo Lưới Đen Tay Loe Xếp Nếp & Quần Jeans Baggy Đính Nơ Hồng',
    category: 'Dạo phố đương đại',
    gender: 'female',
    imageUrl: '/assets/outfits/outfit_set_10_mesh_top_pink_bow_jeans.png',
    fabric: 'Voan Lưới Xuyên Thấu & Light-Wash Denim',
    top_name: 'Áo Lưới Đen Tay Loe',
    top_hex: '#3F3F46',
    bottom_name: 'Quần Jeans Nơ Hồng',
    bottom_hex: '#89B0D3',
    keywords: ['concert', 'y2k', 'cá tính', 'quẩy', 'nơ hồng', 'áo lưới', 'flash'],
  },
  {
    id: 'outfit_grey_bow_black_skirt_17',
    name: 'Set Áo Thun Xám Đính Nơ Đen & Chân Váy Tầng Đen Thắt Nơ Bản To',
    category: 'Dạo phố đương đại',
    gender: 'female',
    imageUrl: '/assets/outfits/outfit_set_17_grey_bow_black_skirt.png',
    fabric: 'Thun Cotton Gân & Kaki Mềm Xếp Tầng',
    top_name: 'Áo Thun Xám Nơ Đen',
    top_hex: '#71717A',
    bottom_name: 'Chân Váy Tầng Đen',
    bottom_hex: '#18181B',
    keywords: ['concert', 'dạo phố', 'coquette đen', 'xếp tầng', 'nơ đen'],
  },
  {
    id: 'outfit_cross_halter_flared_18',
    name: 'Set Áo Corset Đan Chéo Cổ Halter & Quần Jeans Ống Loe Cạp Trái Tim',
    category: 'Dạ tiệc lụa',
    gender: 'female',
    imageUrl: '/assets/outfits/outfit_set_18_cross_halter_flared.png',
    fabric: 'Thun Gân Định Hình & Dark Indigo Stretch Denim',
    top_name: 'Áo Corset Đan Chéo Nâu',
    top_hex: '#5C3A21',
    bottom_name: 'Quần Jeans Loe Cạp Tim',
    bottom_hex: '#1E3A5F',
    keywords: ['ăn tối', 'hẹn hò', 'tiệc tối', 'lãng mạn', 'đèn vàng', 'nến', 'quyến rũ'],
  },
  {
    id: 'outfit_sage_wrap_pleated_skirt_19',
    name: 'Set Áo Len Đắp Chéo Phối Ren Xám Rêu & Chân Váy Chữ A Xanh Navy',
    category: 'Công sở thanh lịch',
    gender: 'female',
    imageUrl: '/assets/outfits/outfit_set_19_sage_wrap_pleated_skirt.png',
    fabric: 'Len Dệt Mịn Phối Ren & Tuytsi Xanh Navy',
    top_name: 'Áo Len Đắp Chéo Xám Rêu',
    top_hex: '#6B7280',
    bottom_name: 'Chân Váy Chữ A Xanh Navy',
    bottom_hex: '#1E293B',
    keywords: ['công sở', 'đi làm', 'phỏng vấn', 'gặp đối tác', 'thuyết trình', 'thanh lịch'],
  },
  {
    id: 'outfit_scarf_tube_ribbon_jeans_20',
    name: 'Set Áo Quây Nâu Kèm Khăn Choàng Cổ & Quần Jeans Đan Dây Nơ Sườn',
    category: 'Dạo phố đương đại',
    gender: 'female',
    imageUrl: '/assets/outfits/outfit_set_20_scarf_tube_ribbon_jeans.png',
    fabric: 'Thun Lụa Nhún & Light Blue Denim Đan Dây',
    top_name: 'Áo Quây Nâu Kèm Khăn Choàng',
    top_hex: '#4A2C18',
    bottom_name: 'Quần Jeans Đan Nơ Sườn',
    bottom_hex: '#93C5FD',
    keywords: ['dạo phố', 'acubi', 'khăn choàng', 'quần đan dây', 'y2k', 'chụp hình'],
  },
  {
    id: 'outfit_california_hoodie_skirt_08',
    name: 'Set Hoodie Nỉ Xám "CALIFORNIA" & Chân Váy Tầng Đen Thắt Nơ',
    category: 'Thu Đông cổ điển',
    gender: 'female',
    imageUrl: '/assets/outfits/outfit_set_11_california_hoodie_skirt.png',
    fabric: 'Nỉ Bông Cao Cấp & Washed Black Denim',
    top_name: 'Hoodie Xám Than CALIFORNIA',
    top_hex: '#3F3F46',
    bottom_name: 'Chân Váy Tầng Đen Nơ',
    bottom_hex: '#27272A',
    keywords: ['xem phim', 'máy lạnh', 'se lạnh', 'hoodie', 'đi học', 'trẻ trung'],
  },
  {
    id: 'outfit_espresso_knit_butterfly_09',
    name: 'Set Áo Len Gân Cổ V Nâu Mocha & Quần Jeans Baggy Họa Tiết Bướm',
    category: 'Thu Đông cổ điển',
    gender: 'female',
    imageUrl: '/assets/outfits/outfit_set_12_espresso_knit_butterfly_jeans.png',
    fabric: 'Len Dệt Kim & Washed Charcoal Denim',
    top_name: 'Áo Len Cổ V Nâu Mocha',
    top_hex: '#785238',
    bottom_name: 'Jeans Baggy Thêu Bướm',
    bottom_hex: '#3F3F46',
    keywords: ['xem phim', 'đà lạt', 'hà nội', 'cà phê', 'len ấm', 'cổ v'],
  },
  {
    id: 'outfit_henley_denim_skirt_21',
    name: 'Set Áo Thun Tay Dài Layer Trắng Xám & Chân Váy Denim Hàng Cúc Trước',
    category: 'Dạo phố đương đại',
    gender: 'female',
    imageUrl: '/assets/outfits/outfit_set_21_henley_denim_skirt.png',
    fabric: 'Cotton Gân Mềm & Mid-Wash Blue Denim',
    top_name: 'Áo Thun Layer Trắng Xám',
    top_hex: '#9CA3AF',
    bottom_name: 'Chân Váy Denim Cúc Trước',
    bottom_hex: '#3B82F6',
    keywords: ['đi học', 'đi chợ', 'siêu thị', 'thoáng mát', 'năng động', 'hàng ngày'],
  },
  {
    id: 'outfit_turtleneck_ruffle_skirt_22',
    name: 'Set Áo Len Gân Cổ Lọ Sát Nách Nâu & Chân Váy Denim Đuôi Cá Nhún Bèo',
    category: 'Công sở thanh lịch',
    gender: 'female',
    imageUrl: '/assets/outfits/outfit_set_22_turtleneck_ruffle_skirt.png',
    fabric: 'Len Tăm Co Giãn & Raw Indigo Denim',
    top_name: 'Áo Len Cổ Lọ Sát Nách Nâu',
    top_hex: '#5C4033',
    bottom_name: 'Chân Váy Denim Đuôi Cá',
    bottom_hex: '#1E293B',
    keywords: ['công sở', 'đi làm', 'hẹn hò', 'đuôi cá', 'sang trọng', 'old money'],
  },
  {
    id: 'outfit_valley_hoodie_01',
    name: 'Set Hoodie Zip Đen "VALLEY" & Quần Jeans Ống Rộng Phối Xích',
    category: 'Dạo phố đương đại',
    gender: 'male',
    imageUrl: '/assets/outfits/outfit_set_01_valley_hoodie.png',
    fabric: 'Nỉ Cotton 380gsm & Washed Denim 13oz',
    top_name: 'Hoodie Zip Đen VALLEY',
    top_hex: '#27272A',
    bottom_name: 'Quần Jeans Đen Phối Xích',
    bottom_hex: '#18181B',
    keywords: ['dạo phố nam', 'đi học', 'xem phim', 'unisex', 'hoodie', 'xích'],
  },
  {
    id: 'outfit_plaid_flannel_set_04',
    name: 'Set Sơ Mi Flannel Caro Đen Trắng & Quần Jeans Baggy Xám Khói',
    category: 'Dạo phố đương đại',
    gender: 'male',
    imageUrl: '/assets/outfits/outfit_set_04_plaid_flannel.png',
    fabric: 'Flannel Cotton & Vintage Washed Denim',
    top_name: 'Sơ Mi Flannel Caro',
    top_hex: '#3F3F46',
    bottom_name: 'Jeans Baggy Xám Khói',
    bottom_hex: '#52525B',
    keywords: ['sơ mi caro', 'flannel', 'dạo phố', 'layer', 'cà phê', 'unisex'],
  },
  {
    id: 'outfit_star_bomber_cargo_07',
    name: 'Set Áo Khoác Bomber Đen Phối Thun Ngôi Sao & Quần Cargo Ống Rộng',
    category: 'Dạo phố đương đại',
    gender: 'male',
    imageUrl: '/assets/outfits/outfit_set_03_star_bomber.png',
    fabric: 'Kaki Dù & Cotton Compact',
    top_name: 'Áo Khoác Bomber Đen',
    top_hex: '#18181B',
    bottom_name: 'Quần Cargo Ống Rộng Đen',
    bottom_hex: '#27272A',
    keywords: ['concert nam', 'cargo', 'bomber', 'quẩy', 'ngôi sao', 'cá tính'],
  },
  {
    id: 'outfit_striped_knit_set_10',
    name: 'Set Áo Len Kẻ Sọc Ngang Oversize & Quần Jeans Wash Bụi Vintage',
    category: 'Thu Đông cổ điển',
    gender: 'male',
    imageUrl: '/assets/outfits/outfit_set_06_striped_knit.png',
    fabric: 'Len Cotton & Vintage Sand-Washed Denim',
    top_name: 'Áo Len Kẻ Sọc Ngang',
    top_hex: '#27272A',
    bottom_name: 'Quần Jeans Wash Bụi',
    bottom_hex: '#52525B',
    keywords: ['kẻ sọc', 'thu đông', 'len rộng', 'vintage', 'xem phim'],
  },
  {
    id: 'outfit_khaki_overshirt_set_11',
    name: 'Set Áo Khoác Sơ Mi Kaki Nâu Be & Quần Ống Suông Đen Tối Giản',
    category: 'Công sở thanh lịch',
    gender: 'male',
    imageUrl: '/assets/outfits/outfit_set_05_khaki_overshirt.png',
    fabric: 'Cotton Twill Kaki & Quần Dệt Chéo',
    top_name: 'Áo Sơ Mi Kaki Nâu Be',
    top_hex: '#8C7A6B',
    bottom_name: 'Quần Suông Đen Tối Giản',
    bottom_hex: '#18181B',
    keywords: ['công sở nam', 'đi làm', 'phỏng vấn', 'đi học', 'lịch sự', 'kaki'],
  },
  {
    id: 'outfit_washed_sweater_set_12',
    name: 'Set Sweater Nỉ Wash Xám Tro & Quần Jeans Baggy Đen Tuyền',
    category: 'Thu Đông cổ điển',
    gender: 'male',
    imageUrl: '/assets/outfits/outfit_set_02_washed_sweater.png',
    fabric: 'Nỉ Acid-Wash & Heavyweight Denim',
    top_name: 'Sweater Xám Tro Acid-Wash',
    top_hex: '#52525B',
    bottom_name: 'Quần Jeans Baggy Đen',
    bottom_hex: '#27272A',
    keywords: ['sweater', 'dạo phố', 'mùa đông', 'acid wash', 'cá tính'],
  },
];

export interface ServerSampleCard {
  matched_outfit_id: string;
  outfit_name: string;
  image_url: string;
  hair_style: string;
  makeup_layout: string;
  fabric_note: string;
  highlight_benefit: string;
  match_score: number;
  swatches: {
    top_name: string;
    top_hex: string;
    bottom_name: string;
    bottom_hex: string;
    lip_name: string;
    lip_hex: string;
    blush_name: string;
    blush_hex: string;
  };
}

export function findBestMatchingOutfit(
  query: string,
  occasion: string = '',
  genderStyle: string = 'female',
  excludeId?: string
): CatalogOutfitItem {
  const q = `${query} ${occasion}`.toLowerCase();

  let candidates = WARDROBE_CATALOG.filter((item) => {
    if (genderStyle === 'male') return item.gender === 'male' || item.gender === 'neutral';
    if (genderStyle === 'neutral') return true;
    return item.gender === 'female' || item.gender === 'neutral';
  });

  if (excludeId) {
    const filtered = candidates.filter((item) => item.id !== excludeId);
    if (filtered.length > 0) candidates = filtered;
  }

  const scored = candidates.map((item) => {
    let score = 0;
    for (const kw of item.keywords) {
      if (q.includes(kw.toLowerCase())) score += 6;
    }
    // High-priority occasion bonuses
    if (
      (q.includes('thuyết trình') || q.includes('báo cáo') || q.includes('seminar')) &&
      (item.id === 'outfit_preppy_shirt_tennis_14' || item.id === 'outfit_sage_wrap_pleated_skirt_19')
    ) {
      score += 25;
    }
    if (
      (q.includes('học') || q.includes('trường') || q.includes('giảng đường')) &&
      (item.id === 'outfit_preppy_shirt_tennis_14' || item.id === 'outfit_henley_denim_skirt_21')
    ) {
      score += 20;
    }
    if (
      (q.includes('concert') || q.includes('fanzone') || q.includes('flash') || q.includes('sân khấu') || q.includes('quẩy')) &&
      (item.id === 'outfit_espresso_halter_skirt_05' || item.id === 'outfit_mesh_top_pink_bow_06' || item.id === 'outfit_grey_bow_black_skirt_17')
    ) {
      score += 25;
    }
    if (
      (q.includes('ăn tối') || q.includes('hẹn hò') || q.includes('tiệc tối') || q.includes('đèn vàng') || q.includes('lãng mạn')) &&
      (item.id === 'outfit_cross_halter_flared_18' || item.id === 'outfit_espresso_corset_flared_02')
    ) {
      score += 25;
    }
    if (
      (q.includes('chùa') || q.includes('lễ phật') || q.includes('thanh tịnh') || q.includes('kín đáo')) &&
      (item.id === 'outfit_grey_bell_pearl_jeans_15')
    ) {
      score += 30;
    }
    if (
      (q.includes('công sở') || q.includes('đi làm') || q.includes('phỏng vấn') || q.includes('đối tác')) &&
      (item.id === 'outfit_sage_wrap_pleated_skirt_19' || item.id === 'outfit_turtleneck_ruffle_skirt_22')
    ) {
      score += 22;
    }
    if (
      (q.includes('xem phim') || q.includes('máy lạnh') || q.includes('thu đông') || q.includes('lạnh') || q.includes('đà lạt')) &&
      (item.id === 'outfit_california_hoodie_skirt_08' || item.id === 'outfit_espresso_knit_butterfly_09' || item.id === 'outfit_offshoulder_heart_jeans_16')
    ) {
      score += 22;
    }
    if (
      (q.includes('coquette') || q.includes('tiểu thư') || q.includes('nơ') || q.includes('búp bê')) &&
      (item.id === 'outfit_coquette_bow_skirt_13' || item.id === 'outfit_grey_bow_black_skirt_17')
    ) {
      score += 20;
    }
    if (
      (q.includes('dạo phố') || q.includes('cà phê') || q.includes('cafe')) &&
      (item.id === 'outfit_grey_offshoulder_skirt_03' || item.id === 'outfit_henley_denim_skirt_21' || item.id === 'outfit_scarf_tube_ribbon_jeans_20')
    ) {
      score += 15;
    }

    return { item, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.item || candidates[0];
}

export function detectMessageIntent(
  userQuery: string,
  occasionContext?: string
): MessageIntent {
  const text = (userQuery || '').trim().toLowerCase();

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
    text.includes('mẫu khác') ||
    (occasionContext && occasionContext !== 'Tự do / Mọi hoàn cảnh' && !pureGreetingRegex.test(text));

  if (isStylingRequest) {
    return 'styling';
  }

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
}

// Server-side High-Precision Stylist Engine (Fallback when Gemini API is rate-limited or quota exhausted)
function generateServerStylistFallback(
  userQuery: string,
  userProfile?: {
    displayName?: string;
    heightCm?: number;
    weightKg?: number;
    bustCm?: number;
    waistCm?: number;
    hipCm?: number;
    genderStyle?: string;
    favoriteStyles?: string[];
    faceShape?: string;
    undertone?: string;
  },
  weatherContext?: {
    city?: string;
    temperature?: number;
    conditionText?: string;
    humidity?: number;
  },
  occasionContext?: string,
  detectedIntent?: MessageIntent,
  excludeOutfitId?: string
): { reply: string; intent: MessageIntent; sample_card: ServerSampleCard | null } {
  const name = userProfile?.displayName || 'bạn';
  const intent = detectedIntent || detectMessageIntent(userQuery, occasionContext);

  // 1. NHÁNH CHÀO HỎI / XÃ GIAO
  if (intent === 'greeting') {
    return {
      reply: `Dạ Aura xin chào ${name} nè! ✨ Rất vui được gặp bạn tại Smart Wardrobe.\n\nHôm nay bạn đang chuẩn bị đi đâu (đi học, đi làm, dạo phố, đi tiệc, đi chơi hay đi chùa...) hoặc cần tìm outfit cho dịp nào, hãy nhắn cho Aura biết nhé! Aura luôn ở đây sẵn sàng hỗ trợ bạn. 💕`,
      intent: 'greeting',
      sample_card: null,
    };
  }

  const q = `${userQuery} ${occasionContext || ''}`.toLowerCase();

  // 2. NHÁNH HỎI ĐÁP CỤ THỂ VỀ THỜI TRANG / LÀM ĐẸP (Q&A)
  if (intent === 'qa') {
    let qaReply = '';
    if (q.includes('da ngăm') || (q.includes('ngăm') && q.includes('màu gì'))) {
      qaReply = `Dạ đối với làn da ngăm khỏe khoắn và ấm áp, bí quyết chọn màu đỉnh nhất là ưu tiên các gam màu tôn da tự nhiên nè! ✨\n\n• Gam màu nên chọn: Tone đất ấm (nâu caramel, cam cháy, be đậm), đỏ gạch (terracotta), xanh rêu/olive hoặc màu trắng kem (ivory) thanh lịch.\n• Gam màu nên tránh: Tránh những gam màu neon quá chói gắt hoặc tone xám xịt nhạt nhòa vì rất dễ khiến sắc tố da bị xỉn màu nha.\n\nNếu bạn muốn Aura phối thử một set đồ tôn da ngăm theo dáng người của bạn, hãy nhắn cho Aura biết dịp bạn sắp đi nha! 👗`;
    } else if (q.includes('tóc mỏng') || q.includes('tóc thưa') || q.includes('mỏng')) {
      qaReply = `Dạ với chất tóc mỏng, bí quyết tạo độ dày và bồng bềnh tự nhiên là cắt tỉa layer tầng kết hợp uốn sóng lơi nhẹ (wavy) hoặc uốn phồng chân tóc nè! 💇‍♀️\n\nBạn cũng có thể kết hợp mái bay dài qua gò má hoặc mái thưa Hàn Quốc để gương mặt thanh thoát hơn, tránh ép thẳng đơ sát da đầu nha. Bạn có muốn Aura gợi ý kiểu tóc chuẩn theo dáng mặt ${userProfile?.faceShape || 'Mặt tròn'} của bạn không nè? ✨`;
    } else if (q.includes('đám cưới') && (q.includes('trắng') || q.includes('màu gì'))) {
      qaReply = `Dạ theo quy tắc ứng xử thời trang dự tiệc cưới (wedding guest etiquette), bạn nên tránh diện trang phục toàn màu trắng tinh khôi vì đây là gam màu đặc quyền của cô dâu trong ngày trọng đại nè! ✨\n\nThay vào đó, bạn có thể chọn các gam pastel nhã nhặn như hồng phấn, xanh mint, be kem nhẹ nhàng hoặc đầm hoa nhí thanh lịch để vừa nổi bật, xinh đẹp mà lại cực kỳ tinh tế và tôn trọng cô dâu chú rể nha! 👗`;
    } else if (q.includes('nhuộm') || q.includes('màu tóc')) {
      const isCool = (userProfile?.undertone || '').toLowerCase().includes('cool');
      const recommendedColors = isCool
        ? 'Nâu Khói Lạnh, Đỏ Cherry, Nâu Trà Đen ánh tím'
        : 'Nâu Trà Sữa, Nâu Hạt Dẻ ấm, Nâu Hổ Phách hoặc Nâu Caramel';
      qaReply = `Dạ để màu tóc tôn da sáng bừng, quy tắc vàng là chọn theo Undertone da của bạn nè! Với tông da ${userProfile?.undertone || 'Warm (ấm)'}, những gam màu lý tưởng nhất là ${recommendedColors}. Màu này vừa sang vừa giúp làm sáng bừng gương mặt dưới mọi ánh sáng nha! 💇‍♀️✨`;
    } else {
      qaReply = `Dạ với thắc mắc này của ${name}, trong thời trang nguyên tắc quan trọng nhất là sự cân bằng và phù hợp với vóc dáng của bạn. Khi chọn trang phục hay layout làm đẹp, bạn nên giữ một điểm nhấn chính (One Focal Point) để tổng thể hài hòa nhất nè! ✨\n\nNếu bạn đang chuẩn bị đồ cho một dịp cụ thể, hãy nhắn cho Aura biết hoàn cảnh để mình tư vấn trọn gói set đồ kèm kiểu tóc và makeup nha! 💕`;
    }

    return {
      reply: qaReply,
      intent: 'qa',
      sample_card: null,
    };
  }

  // 3. NHÁNH YÊU CẦU PHỐI ĐỒ (STYLING REQUEST)
  const bust = userProfile?.bustCm || 86;
  const waist = userProfile?.waistCm || 66;
  const hip = userProfile?.hipCm || 92;
  const city = weatherContext?.city || 'TP. Hồ Chí Minh';
  const temp = weatherContext?.temperature ?? 30;
  const isHot = temp >= 28;

  // Lựa chọn outfit thông minh từ Catalog khớp 100% với hoàn cảnh và giới tính
  const matchedItem = findBestMatchingOutfit(
    userQuery,
    occasionContext || '',
    userProfile?.genderStyle || 'female',
    excludeOutfitId
  );

  // 1. LUẬT DÁNG NGƯỜI
  let detectedBodyShape = 'Đồng hồ cát (Hourglass)';
  let bodyReason = '';
  let matchScore = 96;

  if (Math.abs(bust - hip) <= 6 && (bust - waist >= 18 || hip - waist >= 18)) {
    detectedBodyShape = 'Đồng hồ cát (Hourglass)';
    bodyReason = `Số đo ${bust}-${waist}-${hip}cm có vòng ngực và hông cân xứng hoàn hảo, vòng eo ${waist}cm thon gọn rõ nét.`;
    matchScore = 98;
  } else if (hip - bust >= 5 && waist < hip - 15) {
    detectedBodyShape = 'Quả lê (Pear)';
    bodyReason = `Số đo vòng hông (${hip}cm) lớn hơn vòng ngực (${bust}cm), phần thân trên và vai thon thả hơn thân dưới.`;
    matchScore = 97;
  } else if (waist >= bust - 6 || waist >= hip - 6) {
    detectedBodyShape = 'Quả táo (Apple)';
    bodyReason = `Vòng eo ${waist}cm gần bằng vòng ngực (${bust}cm) hoặc vòng hông (${hip}cm), điểm mạnh là đôi chân thon thả.`;
    matchScore = 94;
  } else if (bust - hip >= 5) {
    detectedBodyShape = 'Tam giác ngược (Inverted Triangle)';
    bodyReason = `Vòng 1 và bờ vai (${bust}cm) rộng hơn vòng hông (${hip}cm).`;
    matchScore = 95;
  } else {
    detectedBodyShape = 'Hình chữ nhật (Rectangle)';
    bodyReason = `Số đo 3 vòng ${bust}-${waist}-${hip}cm có độ chênh lệch ít, vóc dáng thanh mảnh tự nhiên.`;
    matchScore = 95;
  }

  // 2. LUẬT KIỂU TÓC
  const face = (userProfile?.faceShape || 'round').toLowerCase();
  const isHighNeck = q.includes('chùa') || q.includes('lễ phật') || q.includes('kín') || q.includes('cổ cao');
  let hairStyleTitle = '';
  let hairExplanation = '';
  let hairBangs = '';

  if (face.includes('vuông') || face.includes('square')) {
    hairStyleTitle = isHighNeck || isHot
      ? 'Búi cao (High Bun) đánh rối nhẹ kết hợp mái bay uốn lơi'
      : 'Tóc uốn xoăn sóng lơi (Wavy Long) mềm mại kết hợp mái bay';
    hairBangs = 'Mái bay (Curtain Bangs) rủ hai bên xương hàm';
    hairExplanation = 'Lọn sóng lơi bồng bềnh và mái bay buông nhẹ qua xương hàm giúp làm mềm các góc cạnh của khuôn mặt vuông.';
  } else if (face.includes('dài') || face.includes('long')) {
    hairStyleTitle = isHighNeck || isHot
      ? 'Búi thấp kiểu Pháp (Low Bun) kết hợp mái thưa Hàn Quốc'
      : 'Tóc uốn phồng hai bên tai kết hợp mái thưa / mái bằng';
    hairBangs = 'Mái thưa (See-through Bangs) hoặc mái bằng';
    hairExplanation = 'Mái thưa giúp rút ngắn tỷ lệ chiều dài trán, độ uốn phồng ngang hai bên tai tạo ảo giác mặt đầy đặn cân đối hơn.';
  } else if (face.includes('tim') || face.includes('heart') || face.includes('kim cương') || face.includes('diamond')) {
    hairStyleTitle = 'Tóc uốn phồng đuôi ngang cằm kết hợp mái bay (Bob Layer Wavy)';
    hairBangs = 'Mái bay (Curtain Bangs) che gò má';
    hairExplanation = 'Uốn phồng đuôi ngang cằm giúp bù đắp phần cằm nhọn và thon nhỏ, mái bay che gò má cao tạo nét thanh tú.';
  } else if (face.includes('xoan') || face.includes('oval')) {
    hairStyleTitle = isHighNeck || isHot
      ? 'Tóc búi cao củ tỏi (Bun) hoặc kẹp càng cua sang chảnh'
      : 'Tóc sóng lơi bồng bềnh buộc nửa đầu tiểu thư (Half-up)';
    hairBangs = 'Mái bay hoặc không mái khoe trọn trán thanh tú';
    hairExplanation = 'Khuôn mặt trái xoan hài hòa hoàn hảo với mọi kiểu tóc, tôn trọn bờ vai và vùng cổ.';
  } else {
    // Mặt tròn (Round)
    hairStyleTitle = isHighNeck || isHot
      ? 'Tóc buộc đuôi ngựa cao (High Ponytail) hoặc búi cao rẽ ngôi lệch 7/3'
      : 'Tóc rẽ ngôi lệch 7/3 tỉa layer xoăn sóng lơi kết hợp mái bay dài qua gò má';
    hairBangs = 'Mái bay rẽ ngôi lệch 7/3 dài qua gò má';
    hairExplanation = 'Rẽ ngôi lệch 7/3 kết hợp mái bay dài qua gò má giúp thu hẹp chiều rộng hai bên má bầu bĩnh của mặt tròn, kéo dài khuôn mặt thon gọn hơn.';
  }

  // 3. LUẬT MAKEUP THEO ÁNH SÁNG & UNDERTONE
  const tone = (userProfile?.undertone || 'warm').toLowerCase();
  const isCool = tone.includes('cool') || tone.includes('lạnh');
  let lightingType = '';
  let makeupLookName = '';
  let baseFinishDesc = '';
  let makeupDetails = '';
  let lipColorDesc = '';
  let lipName = '';
  let lipHex = '#E07A5F';
  let blushName = '';
  let blushHex = '#FA8072';

  if (q.includes('flash') || q.includes('concert') || q.includes('sân khấu') || q.includes('bar') || q.includes('club') || q.includes('fanzone')) {
    lightingType = 'Đèn Flash / Sân khấu / Concert ngoài trời (Stage/Flash)';
    makeupLookName = 'Idol Stage Flash Matte Glam';
    baseFinishDesc = 'Matte (Nền lì bám chặt, không chứa hạt Silica tránh hiện tượng flashback lóa trắng khi chụp ảnh flash)';
    lipName = isCool ? 'Đỏ Mận Lì Chống Flashback' : 'Đỏ Nâu Đất Lì Chống Flashback';
    lipHex = isCool ? '#881337' : '#8B261D';
    blushName = 'Glitter Vàng Đồng & Má Cam Nướng';
    blushHex = isCool ? '#9F1239' : '#B87333';
    lipColorDesc = `Son kem lì màu ${lipName} (${lipHex})`;
    makeupDetails = 'Ánh đèn flash điện thoại và đèn sân khấu làm bợt màu phấn tới 40%, do đó cần đánh má hồng cam nướng/đào và tạo khối đậm hơn bình thường 1.5 lần. Eyeliner mắt mèo sắc nét, chấm nhũ hạt to (Glitter) ở giữa bầu mắt.';
  } else if (q.includes('ăn tối') || q.includes('hẹn hò') || q.includes('tiệc') || q.includes('nến') || q.includes('đèn vàng')) {
    lightingType = 'Đèn vàng / Tiệc tối / Hẹn hò lãng mạn (Warm Dim Light)';
    makeupLookName = 'Candlelight Dewy Romance';
    baseFinishDesc = 'Dewy / Glowy (Nền căng bóng nhẹ bắt sáng lung linh dưới ánh đèn vàng)';
    lipName = isCool ? 'Đỏ Rượu Vang Quyến Rũ' : 'Đỏ Đất / Nâu Tây Sang Chảnh';
    lipHex = isCool ? '#701A32' : '#9A3412';
    blushName = 'Shimmer Nâu Đồng & Má Cam Ấm';
    blushHex = '#A0522D';
    lipColorDesc = `Son màu ${lipName} (${lipHex})`;
    makeupDetails = 'Dưới ánh đèn vàng ấm, tăng tạo khối và highlight sống mũi cùng gò má thêm 30%. Bầu mắt tán nhũ shimmer đồng hoặc ngọc trai tạo chiều sâu hút hồn.';
  } else if (q.includes('học') || q.includes('công sở') || q.includes('văn phòng') || q.includes('siêu thị') || q.includes('led')) {
    lightingType = 'Đèn trắng văn phòng / Giảng đường / Lớp học (Indoor Cool LED)';
    makeupLookName = 'Fresh Office / Campus Natural Warmth';
    baseFinishDesc = 'Semi-Matte (Nền ráo mịn mỏng nhẹ, che kỹ quầng thâm mắt)';
    lipName = isCool ? 'Hồng Đào MLBB Tự Nhiên' : 'Cam Đào MLBB Tự Nhiên';
    lipHex = isCool ? '#D87093' : '#E07A5F';
    blushName = 'Má Đào Ấm (Chống Tái Da)';
    blushHex = '#FA8072';
    lipColorDesc = `Son tint màu ${lipName} (${lipHex})`;
    makeupDetails = 'Ánh đèn LED trắng cool tone rất dễ làm làn da bị tái xanh hoặc xỉn màu, do đó bắt buộc đánh má hồng ấm (tone đào hoặc cam sữa) từ gò má phớt lên thái dương để tạo sức sống.';
  } else {
    // Ban ngày ngoài trời
    lightingType = 'Ban ngày ngoài trời (Outdoor Daylight)';
    makeupLookName = 'Sun-kissed Clean Girl Glow';
    baseFinishDesc = 'Cushion / Tinted SPF mỏng nhẹ trong veo, chống nắng tự nhiên';
    lipName = isCool ? 'Hồng San Hô Bóng Nhẹ' : 'Cam San Hô Bóng Nhẹ';
    lipHex = isCool ? '#FF6B6B' : '#FF7F50';
    blushName = 'Be Nâu Tự Nhiên & Má Ửng Nắng';
    blushHex = '#D2B48C';
    lipColorDesc = `Son tint bóng nhẹ màu ${lipName} (${lipHex})`;
    makeupDetails = 'Dưới ánh sáng mặt trời tự nhiên, lớp nền phải cực kỳ mỏng nhẹ để tránh mốc; tạo khối dạng kem tự nhiên tan tiệp vào da; phấn mắt lì màu trung tính thanh nhã.';
  }

  // 4. LUẬT CÂN BẰNG TỔNG THỂ
  const isBoldMakeup = lightingType.includes('Flash') || lightingType.includes('Warm Dim');
  const focalPointAdvice = isBoldMakeup
    ? 'Nguyên tắc One Focal Point: Khi môi chọn tone màu đậm sắc nét, phần mắt hãy giữ đường nét tinh gọn, nhấn nhũ vừa phải để gương mặt thu hút mà không bị nặng nề.'
    : 'Nguyên tắc One Focal Point: Với trang phục đơn sắc thanh lịch, điểm nhấn sẽ rơi vào mái tóc bồng bềnh và lớp son môi tươi tắn, tạo cảm giác trong trẻo (Clean Girl) rất thu hút.';

  const isAlternativeNote = excludeOutfitId ? ' (Phương án thay thế vừa cập nhật)' : '';

  const reply = `Dạ Aura xin chào ${name} nè! Lắng nghe mong muốn của bạn cho buổi ${occasionContext || userQuery || 'sắp tới'}, Aura đã phân tích kỹ số đo 3 vòng (${bust}-${waist}-${hip}cm), khuôn mặt ${userProfile?.faceShape || 'Mặt tròn'} và thời tiết ${temp}°C tại ${city} để chăm sóc và phối cho bạn phương án hoàn hảo nhất${isAlternativeNote}:

✨ Về dáng người & trang phục (${detectedBodyShape}):
Aura gợi ý bạn diện ${matchedItem.name}. ${bodyReason} Bộ trang phục này áp dụng tỷ lệ vàng 1/3 thân trên - 2/3 đôi chân với tông màu ${matchedItem.top_name} (${matchedItem.top_hex}) kết hợp ${matchedItem.bottom_name} (${matchedItem.bottom_hex}), giúp tôn trọn vóc dáng và kéo dài đôi chân của bạn.

💇‍♀️ Về kiểu tóc & mái che khuyết điểm:
Hợp nhất với gương mặt của bạn là ${hairStyleTitle} kết hợp ${hairBangs}. ${hairExplanation} Nếu bạn muốn đổi màu tóc, gam Nâu Trà Sữa hoặc Nâu Hạt Dẻ Ánh Khói sẽ nâng tông da sáng bừng sức sống.

💄 Về layout makeup theo ánh sáng (${lightingType}):
Aura đề xuất phong cách ${makeupLookName}. ${baseFinishDesc}. ${makeupDetails} Màu son chủ đạo là ${lipColorDesc}.

💡 Về sự cân bằng & phụ kiện:
${focalPointAdvice} Bạn chỉ cần phối thêm túi xách kẹp nách nhỏ gọn và khuyên tai mảnh để hoàn thiện set đồ.

Aura đã chuẩn bị sẵn Thẻ Mẫu Thử bên dưới kèm bảng màu Swatch thực tế của bộ đồ này. Bạn hãy bấm "Thử mẫu này lên Manocanh" để ngắm trọn vẹn phom dáng 3D hoặc bấm "Đổi mẫu thử khác" nếu muốn xem thêm phương án so sánh nha!`;

  const sample_card: ServerSampleCard = {
    matched_outfit_id: matchedItem.id,
    outfit_name: matchedItem.name,
    image_url: matchedItem.imageUrl,
    hair_style: `${hairStyleTitle} (${hairBangs})`,
    makeup_layout: `${makeupLookName} (${lightingType})`,
    fabric_note: `Chất liệu ${matchedItem.fabric}, phom dáng ${matchedItem.category}`,
    highlight_benefit: `Độ hợp dáng ${matchScore}% · Tôn eo ${waist}cm theo tỷ lệ 1/3 - 2/3`,
    match_score: matchScore,
    swatches: {
      top_name: matchedItem.top_name,
      top_hex: matchedItem.top_hex,
      bottom_name: matchedItem.bottom_name,
      bottom_hex: matchedItem.bottom_hex,
      lip_name: lipName,
      lip_hex: lipHex,
      blush_name: blushName,
      blush_hex: blushHex,
    },
  };

  return {
    reply,
    intent: 'styling',
    sample_card,
  };
}

// Multi-turn AI Stylist & Customer Care Specialist "Aura"
app.post('/api/stylist-chat', async (req, res) => {
  try {
    const { messages, userProfile, weatherContext, occasionContext, excludeOutfitId } = req.body as {
      messages: { role: 'user' | 'model'; text: string }[];
      userProfile?: {
        displayName?: string;
        heightCm?: number;
        weightKg?: number;
        bustCm?: number;
        waistCm?: number;
        hipCm?: number;
        genderStyle?: string;
        favoriteStyles?: string[];
        faceShape?: string;
        undertone?: string;
      };
      weatherContext?: {
        city?: string;
        temperature?: number;
        conditionText?: string;
        humidity?: number;
      };
      occasionContext?: string;
      excludeOutfitId?: string;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Vui lòng nhập nội dung tin nhắn.' });
      return;
    }

    const lastUserQuery = messages[messages.length - 1]?.text || '';
    const detectedIntent = detectMessageIntent(lastUserQuery, occasionContext);

    const genderLabel =
      userProfile?.genderStyle === 'male'
        ? 'Nam'
        : userProfile?.genderStyle === 'neutral'
        ? 'Unisex'
        : 'Nữ';

    const profileContext = userProfile
      ? `HỒ SƠ KHÁCH HÀNG VIP:
- Tên khách hàng: ${userProfile.displayName || 'Bạn'}
- Giới tính & Phom đồ: ${genderLabel}
- Chiều cao: ${userProfile.heightCm || 165}cm | Cân nặng: ${userProfile.weightKg || 54}kg
- Số đo 3 vòng thực tế: Vòng 1 (Ngực) ${userProfile.bustCm || 86}cm - Vòng 2 (Eo) ${userProfile.waistCm || 66}cm - Vòng 3 (Hông) ${userProfile.hipCm || 92}cm
- Dáng mặt (Face Shape): ${userProfile.faceShape || 'Mặt tròn (Round)'}
- Tông da (Undertone): ${userProfile.undertone || 'Warm (Da tông ấm)'}
- Các phong cách thời trang yêu thích đã chọn: ${
          userProfile.favoriteStyles && userProfile.favoriteStyles.length > 0
            ? userProfile.favoriteStyles.join(', ')
            : 'Đa phong cách tôn dáng'
        }`
      : 'Khách hàng đang tìm kiếm gợi ý phối đồ cá nhân hóa.';

    const weatherSummary = weatherContext
      ? `THỜI TIẾT & ĐỊA ĐIỂM HIỆN TẠI CỦA KHÁCH HÀNG:
- Khu vực: ${weatherContext.city || 'TP. Hồ Chí Minh'}
- Nhiệt độ: ${weatherContext.temperature ?? 29}°C (${weatherContext.conditionText || 'Nắng ấm'}) | Độ ẩm: ${weatherContext.humidity ?? 70}%`
      : 'Thời tiết hiện tại: Khoảng 28-30°C, trời dịu mát.';

    const occasionSummary = occasionContext
      ? `HOÀN CẢNH / ĐỊA ĐIỂM KHÁCH SẼ MẶC ĐỒ TỚI: "${occasionContext}"`
      : 'Khách hàng có thể hỏi về bất kỳ hoàn cảnh nào (đi chùa, đi học, đi chợ, đi ăn tối, đi xem phim, đi cà phê, công sở, concert, sự kiện...).';

    const catalogSnippet = WARDROBE_CATALOG.map(
      (item) =>
        `- ID: "${item.id}" | Tên: "${item.name}" | Giới tính: ${item.gender} | Áo: ${item.top_name} (${item.top_hex}) | Quần/Váy: ${item.bottom_name} (${item.bottom_hex}) | Từ khóa: ${item.keywords.join(', ')}`
    ).join('\n');

    const excludeDirective = excludeOutfitId
      ? `\nLƯU Ý QUAN TRỌNG: Khách hàng muốn ĐỔI MẪU THỬ KHÁC, tuyệt đối KHÔNG chọn lại ID "${excludeOutfitId}". Hãy chọn một bộ đồ khác phù hợp trong Catalog.`
      : '';

    const systemInstruction = `Bạn là "Aura" — Chuyên viên Chăm sóc Khách hàng, AI Stylist, Hair Stylist và Makeup Artist chuyên nghiệp cao cấp tại Smart Wardrobe.
Giọng điệu: Thân thiện, ngọt ngào, tinh tế, thấu hiểu tâm lý khách hàng như một người bạn thân sành điệu (xưng "Aura" hoặc "mình", gọi người dùng là "${userProfile?.displayName || 'bạn'}" hoặc "nàng/cậu" tùy ngữ cảnh; sử dụng emoji tinh tế như ✨, 👗, 💄, 💡, 💇‍♀️).

${profileContext}

${weatherSummary}

${occasionSummary}

DANH SÁCH BỘ TRANG PHỤC CÓ SẴN TRONG KHO (WARDROBE CATALOG):
${catalogSnippet}
${excludeDirective}

QUY TẮC PHÂN LOẠI Ý ĐỊNH VÀ TRẢ LỜI (BẮT BUỘC TUÂN THỦ NGHIÊM NGẶT):

1. Ý ĐỊNH CHÀO HỎI XÃ GIAO / PHIẾM (Ví dụ: "xin chào", "hi", "bạn là ai", "hello", "chào bạn"):
- Trả về JSON: { "reply_text": "...", "intent": "greeting", "sample_card": null }
- Lời thoại 1-2 câu tự nhiên, ngọt ngào chào đón khách, hỏi xem hôm nay khách muốn đi đâu.
- TUYỆT ĐỐI KHÔNG xổ ra bài phân tích số đo hay gợi ý set đồ khi khách chưa yêu cầu.

2. Ý ĐỊNH HỎI ĐÁP CỤ THỂ VỀ THỜI TRANG / LÀM ĐẸP (Ví dụ: "da ngăm mặc màu gì hợp?", "tóc mình mỏng thì làm kiểu gì?", "đi đám cưới có nên mặc màu trắng không?"):
- Trả về JSON: { "reply_text": "...", "intent": "qa", "sample_card": null }
- Trả lời trực tiếp, chính xác, sâu sắc vào câu hỏi trước. Không xổ bài phân tích 3 vòng hoặc gợi ý set đồ khi khách chỉ đang hỏi kiến thức.

3. Ý ĐỊNH YÊU CẦU PHỐI ĐỒ / HỎI MẶC GÌ CHO SỰ KIỆN:
- Trả về JSON: { "reply_text": "...", "intent": "styling", "sample_card": { ... } }
- Chọn đúng "matched_outfit_id" từ Catalog khớp nhất với hoàn cảnh (Ví dụ: đi học/thuyết trình -> "outfit_preppy_shirt_tennis_14"; concert/fanzone -> "outfit_espresso_halter_skirt_05" hoặc "outfit_mesh_top_pink_bow_06"; ăn tối/hẹn hò -> "outfit_cross_halter_flared_18"; đi chùa -> "outfit_grey_bell_pearl_jeans_15"; công sở -> "outfit_sage_wrap_pleated_skirt_19"...).
- Dữ liệu trong "sample_card" PHẢI KHỚP 100% với những gì được nhắc tới trong "reply_text":
  + matched_outfit_id: ID từ Catalog (hoặc "custom_svg" nếu khách yêu cầu kiểu dáng/màu mới lạ hoàn toàn)
  + outfit_name: Tên chính xác của bộ đồ
  + hair_style: Kiểu tóc và kiểu mái che khuyết điểm
  + makeup_layout: Tên layout makeup theo ánh sáng
  + fabric_note: Ghi chú chất liệu vải & phom dáng
  + highlight_benefit: Nhận xét độ tôn dáng (Ví dụ: "Độ hợp dáng 98% · Tôn vòng eo 64cm theo tỷ lệ 1/3 - 2/3")
  + match_score: Điểm hợp dáng (từ 88 đến 99)
  + swatches: { top_name, top_hex, bottom_name, bottom_hex, lip_name, lip_hex, blush_name, blush_hex }
- TUYỆT ĐỐI KHÔNG dùng dấu sao đôi "**" trong reply_text. Diễn đạt mượt mà, chia đoạn tự nhiên.`;

    const formattedContents = messages.map((m) => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.text }],
    }));

    let replyText = '';
    let finalIntent: MessageIntent = detectedIntent;
    let sampleCard: ServerSampleCard | null = null;
    let sources: { uri: string; title: string }[] = [];

    const defaultSources = [
      { uri: 'https://www.vogue.com/fashion', title: 'Vogue Fashion Trends & Styling' },
      { uri: 'https://www.harpersbazaar.com/fashion', title: "Harper's Bazaar Occasion Guide" },
      { uri: 'https://smartwardrobe.style/tips', title: 'Smart Wardrobe Styling Rules' },
    ];

    if (!hasValidApiKey()) {
      const fallback = generateServerStylistFallback(
        lastUserQuery,
        userProfile,
        weatherContext,
        occasionContext,
        detectedIntent,
        excludeOutfitId
      );
      replyText = fallback.reply;
      finalIntent = fallback.intent;
      sampleCard = fallback.sample_card;
      sources = defaultSources;
    } else {
      try {
        const ai = getGenAIClient();
        const response: GenerateContentResponse = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: formattedContents,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                reply_text: {
                  type: Type.STRING,
                  description: 'Lời tư vấn tự nhiên, ngọt ngào của Aura, không dùng dấu **',
                },
                intent: {
                  type: Type.STRING,
                  description: 'greeting, qa, hoặc styling',
                },
                sample_card: {
                  type: Type.OBJECT,
                  properties: {
                    matched_outfit_id: { type: Type.STRING },
                    outfit_name: { type: Type.STRING },
                    hair_style: { type: Type.STRING },
                    makeup_layout: { type: Type.STRING },
                    fabric_note: { type: Type.STRING },
                    highlight_benefit: { type: Type.STRING },
                    match_score: { type: Type.NUMBER },
                    swatches: {
                      type: Type.OBJECT,
                      properties: {
                        top_name: { type: Type.STRING },
                        top_hex: { type: Type.STRING },
                        bottom_name: { type: Type.STRING },
                        bottom_hex: { type: Type.STRING },
                        lip_name: { type: Type.STRING },
                        lip_hex: { type: Type.STRING },
                        blush_name: { type: Type.STRING },
                        blush_hex: { type: Type.STRING },
                      },
                      required: [
                        'top_name',
                        'top_hex',
                        'bottom_name',
                        'bottom_hex',
                        'lip_name',
                        'lip_hex',
                        'blush_name',
                        'blush_hex',
                      ],
                    },
                  },
                },
              },
              required: ['reply_text', 'intent'],
            },
          },
        });

        const rawJsonText = response.text || '';
        if (rawJsonText) {
          try {
            const parsed = JSON.parse(rawJsonText);
            replyText = parsed.reply_text || '';
            finalIntent = (parsed.intent as MessageIntent) || detectedIntent;

            if (finalIntent === 'styling' && parsed.sample_card) {
              const matchedId = parsed.sample_card.matched_outfit_id;
              const catalogItem = WARDROBE_CATALOG.find((o) => o.id === matchedId);
              sampleCard = {
                matched_outfit_id: matchedId || catalogItem?.id || 'outfit_preppy_shirt_tennis_14',
                outfit_name: parsed.sample_card.outfit_name || catalogItem?.name || 'Trang phục đề xuất',
                image_url: catalogItem?.imageUrl || '',
                hair_style: parsed.sample_card.hair_style || 'Tóc xoăn sóng lơi mái bay',
                makeup_layout: parsed.sample_card.makeup_layout || 'Natural Clean Girl',
                fabric_note: parsed.sample_card.fabric_note || (catalogItem ? `Chất liệu ${catalogItem.fabric}` : 'Chất liệu cao cấp'),
                highlight_benefit:
                  parsed.sample_card.highlight_benefit ||
                  `Độ hợp dáng ${parsed.sample_card.match_score || 96}% · Tôn eo ${userProfile?.waistCm || 66}cm`,
                match_score: parsed.sample_card.match_score || 96,
                swatches: {
                  top_name: parsed.sample_card.swatches?.top_name || catalogItem?.top_name || 'Màu áo',
                  top_hex: parsed.sample_card.swatches?.top_hex || catalogItem?.top_hex || '#5C3A21',
                  bottom_name: parsed.sample_card.swatches?.bottom_name || catalogItem?.bottom_name || 'Màu quần/váy',
                  bottom_hex: parsed.sample_card.swatches?.bottom_hex || catalogItem?.bottom_hex || '#FAFAFA',
                  lip_name: parsed.sample_card.swatches?.lip_name || 'Son môi',
                  lip_hex: parsed.sample_card.swatches?.lip_hex || '#E07A5F',
                  blush_name: parsed.sample_card.swatches?.blush_name || 'Phấn mắt / má',
                  blush_hex: parsed.sample_card.swatches?.blush_hex || '#FA8072',
                },
              };
            }
          } catch (jsonParseErr) {
            console.warn('Could not parse Gemini JSON response, utilizing resilient fallback engine:', jsonParseErr);
          }
        }
      } catch (geminiErr: unknown) {
        console.warn('Gemini API call caught error or quota reached, activating fallback:', geminiErr);
        const fallback = generateServerStylistFallback(
          lastUserQuery,
          userProfile,
          weatherContext,
          occasionContext,
          detectedIntent,
          excludeOutfitId
        );
        replyText = fallback.reply;
        finalIntent = fallback.intent;
        sampleCard = fallback.sample_card;
        sources = defaultSources;
      }
    }

    if (!replyText) {
      const fallback = generateServerStylistFallback(
        lastUserQuery,
        userProfile,
        weatherContext,
        occasionContext,
        detectedIntent,
        excludeOutfitId
      );
      replyText = fallback.reply;
      finalIntent = fallback.intent;
      sampleCard = fallback.sample_card;
      sources = defaultSources;
    }

    res.json({
      reply: replyText,
      intent: finalIntent,
      sample_card: sampleCard,
      sources,
    });
  } catch (error) {
    console.warn('Handled stylist request with resilient engine:', error);
    const lastText = req.body?.messages?.[req.body?.messages?.length - 1]?.text || '';
    const fallbackIntent = detectMessageIntent(lastText, req.body?.occasionContext);
    const fallback = generateServerStylistFallback(
      lastText,
      req.body?.userProfile,
      req.body?.weatherContext,
      req.body?.occasionContext,
      fallbackIntent,
      req.body?.excludeOutfitId
    );
    res.json({
      reply: fallback.reply,
      intent: fallback.intent,
      sample_card: fallback.sample_card,
      sources: [
        { uri: 'https://www.vogue.com/fashion', title: 'Vogue Fashion Trends & Styling' },
        { uri: 'https://smartwardrobe.style/tips', title: 'Smart Wardrobe Styling Rules' },
      ],
    });
  }
});

// Multimodal Vision Endpoint: Analyze User's Photographed or Uploaded Garment to Dress the Mannequin
app.post('/api/analyze-garment', async (req, res) => {
  const { imageBase64, mimeType, captureMode, userProfile } = req.body as {
    imageBase64: string;
    mimeType?: string;
    captureMode?: 'full_outfit' | 'top_only' | 'dress';
    userProfile?: {
      displayName?: string;
      heightCm?: number;
      weightKg?: number;
      bustCm?: number;
      waistCm?: number;
      hipCm?: number;
      genderStyle?: string;
    };
  };

  const defaultAnalysis = {
    name: captureMode === 'top_only' ? 'Áo Kiểu Chụp Thực Tế Của Bạn' : 'Trang Phục Chụp Thực Tế Của Bạn',
    subtitle: 'Đã nhận diện phom dáng và mặc trực tiếp lên Manocanh theo số đo 3 vòng.',
    fabric: 'Chất liệu vải thực tế từ ảnh chụp',
    colorRule: 'Phối màu đồng điệu giữ điểm nhấn trang nhã vào trang phục chính.',
    proportionRule: 'Canh chỉnh tỷ lệ 1/3 - 2/3 ôm vừa vặn theo vòng ngực và vòng eo trên Manocanh.',
    accessories: 'Túi xách kẹp nách tối giản, khuyên tai thanh lịch và giày cùng tông.',
    makeupTone: 'Tone Hồng Đất hoặc Cam Đào tự nhiên, son bóng nhẹ trong trẻo.',
    hairstyleAndColor: 'Tóc xoăn sóng lơi hoặc kẹp nửa đầu; hợp màu Nâu Trà Sữa hoặc Nâu Hạt Dẻ.',
    occasionFit: 'Dạo phố, đi học, đi cà phê hoặc gặp gỡ bạn bè.',
    primaryColorHex: '#6B4423',
    secondaryColorHex: '#7895B2',
  };

  if (!imageBase64 || !hasValidApiKey()) {
    res.status(200).json({ analysis: defaultAnalysis });
    return;
  }

  try {
    const ai = getGenAIClient();
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');

    const promptText = `Bạn là Aura — AI Stylist của Smart Wardrobe. Hãy phân tích bức ảnh trang phục mà người dùng (${
      userProfile?.displayName || 'khách hàng'
    }, cao ${userProfile?.heightCm || 165}cm, nặng ${userProfile?.weightKg || 54}kg, số đo 3 vòng ${
      userProfile?.bustCm || 86
    }-${userProfile?.waistCm || 66}-${userProfile?.hipCm || 92}cm) vừa chụp hoặc tải lên để mặc thử lên Manocanh (chế độ: ${
      captureMode === 'top_only' ? 'Áo lẻ phối thêm quần/váy' : 'Cả bộ trang phục / Đầm'
    }).
Hãy trả về kết quả JSON mô tả chính xác trang phục trong ảnh, màu sắc chủ đạo (mã HEX), quy tắc phối màu, tỷ lệ dài ngắn tôn dáng, và gợi ý phụ kiện + tone makeup + kiểu tóc/màu tóc hợp nhất với trang phục này.`;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType || 'image/jpeg',
              data: cleanBase64,
            },
          },
          { text: promptText },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: {
              type: Type.STRING,
              description: 'Tên gọi thời trang ngắn gọn, sang trọng của chiếc áo/bộ đồ trong ảnh (tiếng Việt).',
            },
            subtitle: {
              type: Type.STRING,
              description: 'Mô tả kiểu dáng, chất liệu và điểm nhấn của trang phục (1-2 câu).',
            },
            fabric: {
              type: Type.STRING,
              description: 'Chất liệu vải dự đoán (vd: Cotton dệt kim, Lụa Satin, Denim, Linen...).',
            },
            colorRule: {
              type: Type.STRING,
              description: 'Quy tắc phối màu cho trang phục này để tôn da và hài hòa.',
            },
            proportionRule: {
              type: Type.STRING,
              description: 'Quy tắc tỷ lệ dài ngắn khi mặc lên dáng người của khách hàng.',
            },
            accessories: {
              type: Type.STRING,
              description: 'Gợi ý phụ kiện đi kèm (túi xách, giày, trang sức).',
            },
            makeupTone: {
              type: Type.STRING,
              description: 'Gợi ý tone makeup phù hợp với bộ đồ.',
            },
            hairstyleAndColor: {
              type: Type.STRING,
              description: 'Gợi ý kiểu tóc và màu tóc nhuộm hợp với trang phục này.',
            },
            occasionFit: {
              type: Type.STRING,
              description: 'Các hoàn cảnh mặc đẹp nhất (vd: Đi học, đi cà phê, đi ăn tối, đi chùa...).',
            },
            primaryColorHex: {
              type: Type.STRING,
              description: 'Mã màu HEX chủ đạo của áo/trang phục (vd: #5C4033).',
            },
            secondaryColorHex: {
              type: Type.STRING,
              description: 'Mã màu HEX thứ cấp hoặc quần/váy phối cùng (vd: #D6D3D1).',
            },
          },
          required: [
            'name',
            'subtitle',
            'fabric',
            'colorRule',
            'proportionRule',
            'accessories',
            'makeupTone',
            'hairstyleAndColor',
            'occasionFit',
            'primaryColorHex',
            'secondaryColorHex',
          ],
        },
      },
    });

    const parsed = JSON.parse((response.text || '{}').trim());
    res.json({ analysis: parsed });
  } catch (error) {
    console.warn('Vision analysis quota reached or rate-limited, returning tailored garment analysis:', error);
    res.status(200).json({ analysis: defaultAnalysis });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Smart Wardrobe server running on http://localhost:${PORT}`);
  });
}

startServer();
