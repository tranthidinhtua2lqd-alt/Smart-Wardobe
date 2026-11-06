import { AuraLearnedContext, UserProfile } from '../types';

const STORAGE_KEY_MEMORY = 'smart_wardrobe_aura_memory';
const STORAGE_KEY_CHAT = 'smart_wardrobe_aura_chat_history';

export function loadAuraMemory(): AuraLearnedContext | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MEMORY);
    if (!raw) return null;
    return JSON.parse(raw) as AuraLearnedContext;
  } catch {
    return null;
  }
}

export function saveAuraMemory(context: AuraLearnedContext): void {
  try {
    localStorage.setItem(STORAGE_KEY_MEMORY, JSON.stringify(context));
  } catch (err) {
    console.warn('Could not save Aura memory to localStorage', err);
  }
}

export function clearAuraMemory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_MEMORY);
  } catch (err) {
    console.warn('Could not clear Aura memory', err);
  }
}

export function loadChatHistory(): unknown[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CHAT);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveChatHistory(history: unknown[]): void {
  try {
    // Keep max 30 recent messages to avoid quota bloat
    const trimmed = history.slice(-30);
    localStorage.setItem(STORAGE_KEY_CHAT, JSON.stringify(trimmed));
  } catch (err) {
    console.warn('Could not save chat history to localStorage', err);
  }
}

/**
 * AI Context Analyzer: Trích xuất thói quen, hoàn cảnh và khuyết điểm từ tin nhắn của người dùng
 */
export function analyzeChatMessageContext(
  userText: string,
  existingContext: AuraLearnedContext | null,
  profile: UserProfile
): AuraLearnedContext {
  const text = userText.toLowerCase();

  const prevEvents = existingContext?.recentEvent ? [existingContext.recentEvent] : [];
  const prevPreferredColors = new Set(existingContext?.preferredColors || []);
  const prevDislikedColors = new Set(existingContext?.dislikedColors || []);
  const prevBodyConcerns = new Set(existingContext?.bodyConcerns || []);
  const prevStyles = new Set(existingContext?.preferredStyles || []);

  let detectedEvent = existingContext?.recentEvent || '';
  let detectedEventKey = existingContext?.eventKey || '';

  // 1. Phân tích Sự kiện / Hoàn cảnh
  if (text.includes('thuyết trình') || text.includes('báo cáo') || text.includes('seminar') || text.includes('trình bày')) {
    detectedEvent = 'Thuyết trình trên trường';
    detectedEventKey = 'thuyet_trinh';
    prevStyles.add('preppy_school');
    prevStyles.add('clean_minimal');
  } else if (text.includes('đi học') || text.includes('đến trường') || text.includes('giảng đường') || text.includes('lớp')) {
    detectedEvent = 'Đi học / Giảng đường';
    detectedEventKey = 'di_hoc';
    prevStyles.add('preppy_school');
    prevStyles.add('korean_casual');
  } else if (text.includes('đi chùa') || text.includes('lễ phật') || text.includes('chùa') || text.includes('thanh tịnh')) {
    detectedEvent = 'Đi chùa / Lễ Phật';
    detectedEventKey = 'di_chua';
    prevStyles.add('minimal_chic');
  } else if (text.includes('đi chợ') || text.includes('siêu thị') || text.includes('mua sắm')) {
    detectedEvent = 'Đi chợ / Siêu thị';
    detectedEventKey = 'di_cho';
    prevStyles.add('korean_casual');
    prevStyles.add('athleisure_sporty');
  } else if (text.includes('concert') || text.includes('fanzone') || text.includes('sân khấu') || text.includes('flash') || text.includes('quẩy')) {
    detectedEvent = 'Concert / Fanzone ca nhạc';
    detectedEventKey = 'concert';
    prevStyles.add('y2k_acubi');
    prevStyles.add('athleisure_sporty');
  } else if (text.includes('ăn tối') || text.includes('hẹn hò') || text.includes('date') || text.includes('tiệc tối') || text.includes('đèn vàng')) {
    detectedEvent = 'Đi ăn tối / Hẹn hò lãng mạn';
    detectedEventKey = 'di_an_toi';
    prevStyles.add('quiet_luxury');
    prevStyles.add('old_money_vintage');
  } else if (text.includes('xem phim') || text.includes('rạp') || text.includes('cà phê') || text.includes('cafe')) {
    detectedEvent = 'Đi xem phim / Cà phê';
    detectedEventKey = 'di_xem_phim';
    prevStyles.add('korean_casual');
    prevStyles.add('y2k_acubi');
  } else if (text.includes('công sở') || text.includes('đi làm') || text.includes('văn phòng') || text.includes('phỏng vấn')) {
    detectedEvent = 'Đi làm công sở / Phỏng vấn';
    detectedEventKey = 'cong_so';
    prevStyles.add('clean_minimal');
    prevStyles.add('preppy_school');
  } else if (text.includes('đi biển') || text.includes('du lịch') || text.includes('resort')) {
    detectedEvent = 'Du lịch / Đi biển';
    detectedEventKey = 'di_bien';
    prevStyles.add('boho_chic');
    prevStyles.add('coquette_babydoll');
  }

  // 2. Phân tích Màu sắc thích / ghét
  if (text.includes('không thích màu tối') || text.includes('không thích mặc màu tối') || text.includes('tránh màu tối') || text.includes('không mặc đen') || text.includes('tránh màu đen')) {
    prevDislikedColors.add('màu tối');
    prevDislikedColors.add('đen');
    prevPreferredColors.add('sáng màu');
    prevPreferredColors.add('trắng kem / pastel');
  }
  if (text.includes('không thích màu sáng') || text.includes('tránh màu chói') || text.includes('không mặc sáng')) {
    prevDislikedColors.add('màu sáng chói');
    prevPreferredColors.add('tối màu / trầm');
  }
  if (text.includes('thích màu sáng') || text.includes('màu sáng') || text.includes('màu trắng') || text.includes('màu kem') || text.includes('pastel')) {
    prevPreferredColors.add('sáng màu');
    prevPreferredColors.add('kem / pastel');
  }
  if (text.includes('màu hồng') || text.includes('tone hồng')) {
    prevPreferredColors.add('hồng pastel');
  }
  if (text.includes('màu nâu') || text.includes('tone nâu') || text.includes('nâu tây') || text.includes('caramel')) {
    prevPreferredColors.add('nâu đất / caramel');
  }
  if (text.includes('màu đỏ') || text.includes('đỏ gạch')) {
    prevPreferredColors.add('đỏ gạch');
  }

  // 3. Phân tích Khuyết điểm muốn che & mong muốn tôn dáng
  if (text.includes('hông to') || text.includes('che hông') || text.includes('mông to') || text.includes('đùi to') || text.includes('che đùi')) {
    prevBodyConcerns.add('che khuyết điểm hông & đùi');
  }
  if (text.includes('bắp tay') || text.includes('che tay') || text.includes('tay to')) {
    prevBodyConcerns.add('che bắp tay');
  }
  if (text.includes('tôn eo') || text.includes('eo thon') || text.includes('khoe eo') || text.includes('chiết eo')) {
    prevBodyConcerns.add('tôn vòng eo ' + profile.waistCm + 'cm');
  }
  if (text.includes('chân ngắn') || text.includes('kéo dài chân') || text.includes('hack chân') || text.includes('chân thon')) {
    prevBodyConcerns.add('kéo dài đôi chân');
  }
  if (text.includes('che bụng') || text.includes('bụng bự') || text.includes('mỡ bụng') || text.includes('vòng 2')) {
    prevBodyConcerns.add('che khuyết điểm vòng bụng');
  }
  if (text.includes('không nóng') || text.includes('thoáng mát') || text.includes('mát mẻ') || text.includes('sợ nóng')) {
    prevBodyConcerns.add('chất vải thoáng mát');
  }

  // Xây dựng lý do tổng quát
  const eventLabel = detectedEvent || 'nhu cầu gần nhất của bạn';
  const concernsList = Array.from(prevBodyConcerns);
  let benefitReason = 'tôn vóc dáng chuẩn của bạn';
  if (concernsList.length > 0) {
    benefitReason = concernsList.slice(0, 2).join(' & ');
  } else {
    benefitReason = 'tôn vòng eo ' + profile.waistCm + 'cm và đôi chân theo tỷ lệ 1/3 - 2/3';
  }

  const customReasonTemplate = `Phù hợp với buổi ${eventLabel} & giúp ${benefitReason}`;

  return {
    recentEvent: detectedEvent || existingContext?.recentEvent || 'Dạo phố / Cuộc sống hàng ngày',
    eventKey: detectedEventKey || existingContext?.eventKey || 'hang_ngay',
    preferredColors: Array.from(prevPreferredColors),
    dislikedColors: Array.from(prevDislikedColors),
    bodyConcerns: concernsList,
    preferredStyles: Array.from(prevStyles),
    customReasonTemplate,
    timestamp: Date.now(),
  };
}
