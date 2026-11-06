/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  onSnapshot,
  deleteDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  Camera,
  Sparkles,
  Trash2,
  UserCheck,
  Clock,
  Sliders,
  Palette,
  Check,
  Brain,
  RotateCcw,
} from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import {
  CURATED_OUTFITS,
  FASHION_STYLE_OPTIONS,
  OutfitItem,
  THEME_PALETTES,
  ThemePalette,
  TryOnHistoryItem,
  UserProfile,
  AuraLearnedContext,
  calculateOutfitFit,
} from './types';
import { loadAuraMemory, clearAuraMemory } from './utils/auraMemory';
import {
  getOrSeedUserHistory,
  initializeLocalStorageWithMockData,
} from './data/mockData';
import { WardrobeIntroAndAuth } from './components/WardrobeIntroAndAuth';
import { MannequinStudio } from './components/MannequinStudio';
import { ArCameraTryOnModal } from './components/ArCameraTryOnModal';
import { ProfileDrawerModal } from './components/ProfileDrawerModal';
import { AiStylistChatBox } from './components/AiStylistChatBox';
import { StyleOnboardingModal } from './components/StyleOnboardingModal';
import { WeatherWidgetBar } from './components/WeatherWidgetBar';

type MainSection = 'suggestions' | 'mannequin' | 'history';

export default function App() {
  // Always start on the Wardrobe Opening + Login/Register screen on every page visit
  const [hasEnteredWardrobeSession, setHasEnteredWardrobeSession] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isCloudSynced, setIsCloudSynced] = useState(false);

  // Onboarding modal state (automatically opens on first login if !profile.onboardingCompleted)
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  // Theme Primary Color State
  const [activeTheme, setActiveTheme] = useState<ThemePalette>(() => {
    const savedId = localStorage.getItem('atelier_aura_theme_id');
    return THEME_PALETTES.find((t) => t.id === savedId) || THEME_PALETTES[0];
  });
  const [customPrimaryColor, setCustomPrimaryColor] = useState<string>(() => {
    return localStorage.getItem('atelier_aura_custom_hex') || THEME_PALETTES[0].primary;
  });

  // Apply CSS variables to :root whenever theme or custom hex changes
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--theme-primary', customPrimaryColor);
    root.style.setProperty('--theme-primary-hover', activeTheme.primaryHover);
    root.style.setProperty('--theme-primary-soft', activeTheme.primarySoft);
    root.style.setProperty('--theme-primary-border', activeTheme.primaryBorder);
    root.style.setProperty('--theme-canvas', activeTheme.canvas);
    root.style.setProperty('--theme-surface', activeTheme.surface);
  }, [activeTheme, customPrimaryColor]);

  const handleSelectThemePalette = (palette: ThemePalette) => {
    setActiveTheme(palette);
    setCustomPrimaryColor(palette.primary);
    localStorage.setItem('atelier_aura_theme_id', palette.id);
    localStorage.setItem('atelier_aura_custom_hex', palette.primary);
  };

  const handleSelectCustomHex = (hex: string) => {
    setCustomPrimaryColor(hex);
    document.documentElement.style.setProperty('--theme-primary-hover', hex);
    localStorage.setItem('atelier_aura_custom_hex', hex);
  };

  // Navigation & Active States
  const [activeSection, setActiveSection] = useState<MainSection>('suggestions');
  const [categoryFilter, setCategoryFilter] = useState<string>('Theo phong cách đã chọn');
  const [styleTabFilter, setStyleTabFilter] = useState<string>('all');
  const [selectedOutfit, setSelectedOutfit] = useState<OutfitItem>(
    CURATED_OUTFITS.find((o) => o.targetGenders.includes('female')) || CURATED_OUTFITS[1]
  );

  // Modals
  const [isArModalOpen, setIsArModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // User's Custom Photographed / Uploaded Garments
  const [customCapturedOutfits, setCustomCapturedOutfits] = useState<OutfitItem[]>([]);

  // Personal Try-On History (Cloud + Local Fallback)
  const [historyItems, setHistoryItems] = useState<TryOnHistoryItem[]>([]);

  // AI Dynamic Context Memory from Chatbot Aura
  const [learnedContext, setLearnedContext] = useState<AuraLearnedContext | null>(() => loadAuraMemory());

  const handleResetAiFilter = () => {
    clearAuraMemory();
    setLearnedContext(null);
  };

  useEffect(() => {
    initializeLocalStorageWithMockData();
  }, []);

  // Real-time Cloud Synchronization for Personal Outfit History once user logs in this session
  useEffect(() => {
    if (!hasEnteredWardrobeSession || !profile) return;

    const loadLocalHistory = () => {
      const items = getOrSeedUserHistory(profile.uid);
      setHistoryItems(items);
    };

    if (auth.currentUser && isCloudSynced) {
      const currentUid = auth.currentUser.uid;
      const historyPath = `users/${currentUid}/tryOnHistory`;
      const q = query(
        collection(db, historyPath),
        where('userId', '==', currentUid)
      );
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const items: TryOnHistoryItem[] = snapshot.docs
            .map((d) => {
              const data = d.data();
              return {
                id: d.id,
                userId: data.userId,
                outfitId: data.outfitId,
                outfitName: data.outfitName,
                category: data.category,
                imageUrl: data.imageUrl,
                tryOnMode: data.tryOnMode,
                recommendedSize: data.recommendedSize,
                fitScore: data.fitScore,
                snapshotMeasurements: data.snapshotMeasurements,
                notes: data.notes,
                createdAtMs: data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now(),
              };
            })
            .sort((a, b) => b.createdAtMs - a.createdAtMs);
          setHistoryItems(items);
        },
        (err) => {
          console.warn('Cloud history listener warning (using local history):', err);
          loadLocalHistory();
        }
      );
      return () => unsubscribe();
    } else {
      loadLocalHistory();
    }
  }, [hasEnteredWardrobeSession, profile, isCloudSynced]);

  // Save or Update User Profile, Body Measurements & Fashion Style Preferences
  const handleSaveProfile = async (updatedProfile: UserProfile) => {
    setProfile(updatedProfile);

    // Automatically ensure selectedOutfit matches the user's gender & favorite styles
    const genderOutfits =
      updatedProfile.genderStyle === 'neutral'
        ? CURATED_OUTFITS
        : CURATED_OUTFITS.filter((o) => o.targetGenders.includes(updatedProfile.genderStyle));
    const favs = updatedProfile.favoriteStyles || [];
    const bestMatch =
      genderOutfits.find((o) => o.styleTags.some((t) => favs.includes(t))) || genderOutfits[0];
    if (bestMatch && !selectedOutfit.targetGenders.includes(updatedProfile.genderStyle)) {
      setSelectedOutfit(bestMatch);
    }

    try {
      const lastContact = localStorage.getItem('atelier_aura_last_contact');
      if (lastContact) {
        const localAccountsRaw = localStorage.getItem('atelier_aura_accounts') || '{}';
        const localAccounts = JSON.parse(localAccountsRaw);
        if (localAccounts[lastContact]) {
          localAccounts[lastContact].profile = updatedProfile;
          localStorage.setItem('atelier_aura_accounts', JSON.stringify(localAccounts));
        }
      }
    } catch (e) {
      console.warn('Local account persistence warning:', e);
    }

    if (auth.currentUser) {
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      try {
        const existingSnap = await getDoc(userDocRef);
        const existingData = existingSnap.exists() ? existingSnap.data() : null;
        await setDoc(userDocRef, {
          uid: auth.currentUser.uid,
          displayName: (updatedProfile.displayName || 'Thành viên Smart Wardrobe').slice(0, 100),
          avatarUrl: (updatedProfile.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80').slice(0, 2000),
          heightCm: Math.max(100, Math.min(250, Number(updatedProfile.heightCm) || 165)),
          weightKg: Math.max(25, Math.min(250, Number(updatedProfile.weightKg) || 54)),
          bustCm: Math.max(50, Math.min(180, Number(updatedProfile.bustCm) || 86)),
          waistCm: Math.max(40, Math.min(180, Number(updatedProfile.waistCm) || 66)),
          hipCm: Math.max(50, Math.min(180, Number(updatedProfile.hipCm) || 92)),
          genderStyle: updatedProfile.genderStyle || 'female',
          favoriteStyles: (updatedProfile.favoriteStyles || []).slice(0, 12),
          faceShape: (updatedProfile.faceShape || 'round').slice(0, 40),
          undertone: (updatedProfile.undertone || 'warm').slice(0, 40),
          onboardingCompleted: Boolean(updatedProfile.onboardingCompleted),
          createdAt: existingData?.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setIsCloudSynced(true);
      } catch (err) {
        console.warn('Cloud profile sync warning (saved locally):', err);
      }
    }
  };

  // Complete 2-Step First-Login Onboarding (Step 1: Gender, Step 2: Fashion Styles)
  const handleCompleteOnboarding = async (
    genderStyle: UserProfile['genderStyle'],
    favoriteStyles: string[]
  ) => {
    if (!profile) return;

    // Adjust default measurements sensibly if user selected 'male' on first-time setup
    const adjustedMeasurements =
      !profile.onboardingCompleted && genderStyle === 'male' && profile.heightCm === 165
        ? { heightCm: 175, weightKg: 68, bustCm: 96, waistCm: 78, hipCm: 95 }
        : {};

    const updated: UserProfile = {
      ...profile,
      ...adjustedMeasurements,
      genderStyle,
      favoriteStyles: favoriteStyles.slice(0, 12),
      onboardingCompleted: true,
    };

    await handleSaveProfile(updated);
    setCategoryFilter('Theo phong cách đã chọn');
    setStyleTabFilter('all');

    // Automatically select the top matching outfit for their chosen gender & style
    const genderOutfits =
      genderStyle === 'neutral'
        ? CURATED_OUTFITS
        : CURATED_OUTFITS.filter((o) => o.targetGenders.includes(genderStyle));
    const topMatch =
      genderOutfits.find((o) => o.styleTags.some((tag) => favoriteStyles.includes(tag))) ||
      genderOutfits[0];
    if (topMatch) {
      setSelectedOutfit(topMatch);
    }

    setIsOnboardingOpen(false);
  };

  // Record a Virtual Try-On Session (AR Camera, 3D Mannequin, or Curated Match)
  const handleRecordTryOn = async (
    outfit: OutfitItem,
    mode: 'ar_camera' | 'mannequin_3d' | 'curated_match',
    notes: string
  ) => {
    if (!profile) return;
    const fitInfo = calculateOutfitFit(outfit, profile);
    const historyId = `tryon_${Date.now()}`;
    const snapshotMeasurements = `${profile.heightCm}cm · ${profile.weightKg}kg · 3V: ${profile.bustCm}-${profile.waistCm}-${profile.hipCm}`;

    const newItem: TryOnHistoryItem = {
      id: historyId,
      userId: profile.uid,
      outfitId: outfit.id,
      outfitName: outfit.name,
      category: outfit.category,
      imageUrl: outfit.imageUrl,
      tryOnMode: mode,
      recommendedSize: fitInfo.recommendedSize,
      fitScore: fitInfo.fitScore,
      snapshotMeasurements,
      notes: notes || fitInfo.fitNotes,
      createdAtMs: Date.now(),
    };
    const nextList = [newItem, ...historyItems];
    setHistoryItems(nextList);
    localStorage.setItem(`atelier_history_${profile.uid}`, JSON.stringify(nextList));

    if (auth.currentUser) {
      const safeCloudImageUrl =
        outfit.imageUrl.length <= 1950
          ? outfit.imageUrl
          : '/assets/outfits/outfit_set_13_coquette_bow_skirt.png';
      try {
        await setDoc(doc(db, 'users', auth.currentUser.uid, 'tryOnHistory', historyId), {
          userId: auth.currentUser.uid,
          outfitId: outfit.id.slice(0, 64),
          outfitName: outfit.name.slice(0, 120),
          category: outfit.category.slice(0, 60),
          imageUrl: safeCloudImageUrl,
          tryOnMode: mode,
          recommendedSize: fitInfo.recommendedSize,
          fitScore: fitInfo.fitScore,
          snapshotMeasurements: snapshotMeasurements.slice(0, 120),
          notes: (notes || fitInfo.fitNotes).slice(0, 500),
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn('Cloud tryOnHistory write warning (saved locally):', err);
      }
    }
  };

  const handleDeleteHistoryItem = async (id: string) => {
    if (!profile) return;
    const filtered = historyItems.filter((item) => item.id !== id);
    setHistoryItems(filtered);
    localStorage.setItem(`atelier_history_${profile.uid}`, JSON.stringify(filtered));

    if (auth.currentUser) {
      try {
        await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'tryOnHistory', id));
      } catch (err) {
        console.warn('Cloud tryOnHistory delete warning:', err);
      }
    }
  };

  const handleLogout = async () => {
    setIsProfileModalOpen(false);
    if (auth.currentUser) {
      await signOut(auth);
    }
    setHasEnteredWardrobeSession(false);
    setProfile(null);
  };

  // 1. ALWAYS show Wardrobe Burst Intro & Login/Register screen first on every visit
  if (!hasEnteredWardrobeSession || !profile) {
    return (
      <WardrobeIntroAndAuth
        onAuthenticated={(loggedInProfile, synced) => {
          setProfile(loggedInProfile);
          setIsCloudSynced(synced);
          setHasEnteredWardrobeSession(true);
          // Match initial selectedOutfit to loggedInProfile gender
          const pool =
            loggedInProfile.genderStyle === 'neutral'
              ? CURATED_OUTFITS
              : CURATED_OUTFITS.filter((o) =>
                  o.targetGenders.includes(loggedInProfile.genderStyle)
                );
          if (pool[0]) {
            setSelectedOutfit(pool[0]);
          }
          // Trigger 2-step Gender & Fashion Style Onboarding if first time!
          if (!loggedInProfile.onboardingCompleted || !loggedInProfile.favoriteStyles?.length) {
            setIsOnboardingOpen(true);
          }
        }}
      />
    );
  }

  // Compute user's selected style labels
  const userSelectedStyleObjects = FASHION_STYLE_OPTIONS.filter((opt) =>
    (profile.favoriteStyles || []).includes(opt.id)
  );

  // Gender-appropriate outfit pool + any custom garments photographed/uploaded by the user
  const baseGenderPool =
    profile.genderStyle === 'neutral'
      ? CURATED_OUTFITS
      : CURATED_OUTFITS.filter((item) => item.targetGenders.includes(profile.genderStyle));
  const genderOutfitsPool = [...customCapturedOutfits, ...baseGenderPool];

  // Filter and sort outfits based on user's chosen styles, style tab, and category
  const categories = [
    'Theo phong cách đã chọn',
    'Tất cả',
    'Công sở thanh lịch',
    'Dạ tiệc lụa',
    'Dạo phố đương đại',
    'Thu Đông cổ điển',
  ];

  const filteredOutfits = (() => {
    let baseList = [...genderOutfitsPool];

    // If user clicked a specific style tab pill, filter to that style
    if (styleTabFilter !== 'all') {
      baseList = baseList.filter((item) => item.styleTags.includes(styleTabFilter));
    }

    if (categoryFilter !== 'Theo phong cách đã chọn' && categoryFilter !== 'Tất cả') {
      baseList = baseList.filter((item) => item.category === categoryFilter);
    }

    // AI Dynamic Learning Wardrobe Sync: Prioritize items based on chat history & memory
    if (learnedContext) {
      const dislikedColors = (learnedContext.dislikedColors || []).map((c) => c.toLowerCase());
      const preferredColors = (learnedContext.preferredColors || []).map((c) => c.toLowerCase());
      const preferredStyles = learnedContext.preferredStyles || [];
      const concerns = (learnedContext.bodyConcerns || []).join(' ').toLowerCase();

      return baseList.sort((a, b) => {
        let scoreA = 0;
        let scoreB = 0;

        const aColors = `${a.garmentSpecs.primaryColor} ${a.garmentSpecs.secondaryColor} ${a.colorRule}`.toLowerCase();
        const bColors = `${b.garmentSpecs.primaryColor} ${b.garmentSpecs.secondaryColor} ${b.colorRule}`.toLowerCase();

        // Penalty for disliked colors (e.g., "màu tối", "đen")
        dislikedColors.forEach((d) => {
          if (d.includes('tối') || d.includes('đen')) {
            if (aColors.includes('#2b2b2b') || aColors.includes('đen') || aColors.includes('charcoal')) scoreA -= 35;
            if (bColors.includes('#2b2b2b') || bColors.includes('đen') || bColors.includes('charcoal')) scoreB -= 35;
          }
        });

        // Boost for preferred colors (e.g. bright, cream, pastel)
        preferredColors.forEach((p) => {
          if (p.includes('sáng') || p.includes('kem') || p.includes('trắng')) {
            if (aColors.includes('trắng') || aColors.includes('kem') || aColors.includes('sáng') || aColors.includes('#f5f5dc')) scoreA += 25;
            if (bColors.includes('trắng') || bColors.includes('kem') || bColors.includes('sáng') || bColors.includes('#f5f5dc')) scoreB += 25;
          }
        });

        // Boost for styles matching recent event
        preferredStyles.forEach((s) => {
          if (a.styleTags.includes(s)) scoreA += 35;
          if (b.styleTags.includes(s)) scoreB += 35;
        });

        // Boost for body concerns (che hông to, che bắp tay, tôn eo...)
        if (concerns.includes('hông')) {
          if (a.proportionRule.toLowerCase().includes('suông') || a.proportionRule.toLowerCase().includes('chữ a') || a.name.toLowerCase().includes('ống rộng')) scoreA += 25;
          if (b.proportionRule.toLowerCase().includes('suông') || b.proportionRule.toLowerCase().includes('chữ a') || b.name.toLowerCase().includes('ống rộng')) scoreB += 25;
        }
        if (concerns.includes('eo')) {
          if (a.proportionRule.toLowerCase().includes('eo') || a.proportionRule.toLowerCase().includes('cạp cao')) scoreA += 20;
          if (b.proportionRule.toLowerCase().includes('eo') || b.proportionRule.toLowerCase().includes('cạp cao')) scoreB += 20;
        }

        return scoreB - scoreA;
      });
    }

    if (categoryFilter === 'Theo phong cách đã chọn') {
      const userStyles = profile.favoriteStyles || [];
      if (userStyles.length === 0) return baseList;

      // Sort outfits by how many styleTags match the user's chosen favoriteStyles
      return baseList.sort((a, b) => {
        const aMatches = a.styleTags.filter((t) => userStyles.includes(t)).length;
        const bMatches = b.styleTags.filter((t) => userStyles.includes(t)).length;
        return bMatches - aMatches;
      });
    }

    return baseList;
  })();

  const getOutfitAuraReason = (outfit: OutfitItem) => {
    if (learnedContext) {
      const event = learnedContext.recentEvent || 'nhu cầu gần nhất của bạn';
      let benefit = 'tôn vòng eo ' + profile.waistCm + 'cm';
      if (learnedContext.bodyConcerns && learnedContext.bodyConcerns.length > 0) {
        benefit = learnedContext.bodyConcerns[0];
      }
      return `Phù hợp với buổi ${event} & giúp ${benefit}`;
    }
    return `Thiết kế chuẩn tỷ lệ 1/3 - 2/3 & giúp tôn vòng eo ${profile.waistCm}cm của bạn`;
  };

  const genderLabel =
    profile.genderStyle === 'female'
      ? 'Nữ'
      : profile.genderStyle === 'male'
      ? 'Nam'
      : 'Unisex';

  return (
    <div className="min-h-screen flex flex-col bg-theme-canvas text-[#18181B]">
      {/* Strict 3-Zone Top Bar Contract with Circular Avatar on Top-Left */}
      <header className="sticky top-0 z-40 bg-theme-canvas/95 backdrop-blur-xs border-b border-stone-200/90 px-6 lg:px-12 py-3.5 flex items-center justify-between gap-8">
        {/* Zone 1: Circular Avatar on Top-Left */}
        <button
          type="button"
          onClick={() => setIsProfileModalOpen(true)}
          className="flex items-center gap-3 text-left group cursor-pointer whitespace-nowrap shrink-0"
          title="Nhấn để xem thông tin người dùng, đổi Avatar, số đo cơ thể & màu chủ đạo"
        >
          <img
            src={profile.avatarUrl}
            alt={profile.displayName}
            referrerPolicy="no-referrer"
            className="w-10 h-10 rounded-full object-cover border-2 border-theme-primary group-hover:scale-105 transition-transform"
          />
          <span className="font-serif-display text-xl font-bold tracking-tight text-stone-900">
            SMART WARDROBE
          </span>
        </button>

        {/* Zone 2: Main Navigation Links */}
        <nav className="flex items-center gap-6 text-sm font-medium text-stone-600 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveSection('suggestions')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSection === 'suggestions'
                ? 'text-theme-primary font-semibold border-b-2 border-theme-primary'
                : 'hover:text-stone-900'
            }`}
          >
            Gợi ý phối
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('mannequin')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSection === 'mannequin'
                ? 'text-theme-primary font-semibold border-b-2 border-theme-primary'
                : 'hover:text-stone-900'
            }`}
          >
            Manocanh thử đồ
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('history')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSection === 'history'
                ? 'text-theme-primary font-semibold border-b-2 border-theme-primary'
                : 'hover:text-stone-900'
            }`}
          >
            Lịch sử phối đồ ({historyItems.length})
          </button>
        </nav>

        {/* Zone 3: Primary Action CTA (Capture / Upload Garment to Dress Mannequin) */}
        <div className="shrink-0">
          <button
            type="button"
            onClick={() => setIsArModalOpen(true)}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-theme-primary rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
          >
            <Camera className="w-4 h-4" />
            <span>Chụp / Tải Ảnh Áo Ướm Manocanh</span>
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 lg:px-12 py-8">
        {/* Personal Measurement, Selected Styles & Theme Color Bar Summary */}
        <div className="mb-8 p-4 rounded-xl bg-white border border-stone-200/80 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsProfileModalOpen(true)}
              className="relative group cursor-pointer shrink-0"
            >
              <img
                src={profile.avatarUrl}
                alt={profile.displayName}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-full object-cover border-2 border-theme-primary"
              />
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
                <span className="font-semibold text-stone-900 text-sm">{profile.displayName}</span>
                <span>·</span>
                <span>Giới tính: <strong className="text-stone-800">{genderLabel}</strong></span>
                <span>·</span>
                <span>
                  Phong cách:{' '}
                  <strong className="text-theme-primary">
                    {userSelectedStyleObjects.length > 0
                      ? userSelectedStyleObjects.map((s) => s.title).join(', ')
                      : 'Đa phong cách'}
                  </strong>
                </span>
              </div>
              <p className="text-xs font-mono-tabular text-stone-600 mt-0.5">
                Cao: <strong>{profile.heightCm}cm</strong> · Nặng: <strong>{profile.weightKg}kg</strong> · 3 vòng:{' '}
                <strong className="text-theme-primary">
                  {profile.bustCm} - {profile.waistCm} - {profile.hipCm} cm
                </strong>
              </p>
            </div>
          </div>

          {/* Interactive Theme Color Swatches + Style Onboarding Re-open + Profile Edit Action */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-theme-canvas border border-stone-200/90">
              <Palette className="w-3.5 h-3.5 text-theme-primary shrink-0" />
              <span className="text-xs font-medium text-stone-700 whitespace-nowrap">
                Màu chủ đạo:
              </span>
              <div className="flex items-center gap-1.5">
                {THEME_PALETTES.map((palette) => {
                  const isCurrent =
                    activeTheme.id === palette.id && customPrimaryColor === palette.primary;
                  return (
                    <button
                      key={palette.id}
                      type="button"
                      onClick={() => handleSelectThemePalette(palette)}
                      className={`w-5 h-5 rounded-full transition-transform cursor-pointer border ${
                        isCurrent
                          ? 'scale-125 border-stone-900 ring-2 ring-stone-900/20'
                          : 'border-black/20 hover:scale-110'
                      }`}
                      style={{ backgroundColor: palette.primary }}
                      title={palette.name}
                    />
                  );
                })}
                <label
                  className="relative w-5 h-5 rounded-full overflow-hidden border border-stone-400 cursor-pointer flex items-center justify-center"
                  title="Tự chọn màu chủ đạo bất kỳ"
                >
                  <input
                    type="color"
                    value={customPrimaryColor}
                    onChange={(e) => handleSelectCustomHex(e.target.value)}
                    className="absolute inset-0 w-8 h-8 -top-1 -left-1 cursor-pointer opacity-0"
                  />
                  <span
                    className="w-full h-full block"
                    style={{
                      background:
                        'conic-gradient(from 90deg, #ef4444, #f59e0b, #10b981, #3b82f6, #8b5cf6, #ef4444)',
                    }}
                  />
                </label>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOnboardingOpen(true)}
              className="px-3.5 py-2 text-xs font-medium text-stone-800 bg-white hover:bg-stone-100 border border-stone-300 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-theme-primary" />
              <span>Chọn lại Giới tính & Phong cách</span>
            </button>

            <button
              type="button"
              onClick={() => setIsProfileModalOpen(true)}
              className="px-3.5 py-2 text-xs font-medium text-stone-800 bg-theme-canvas hover:bg-stone-200/70 border border-stone-300 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <UserCheck className="w-3.5 h-3.5 text-theme-primary" />
              <span>Đổi Avatar & Số đo 3 vòng</span>
            </button>
          </div>
        </div>

        {/* Live Weather & Location Outfit Bar (GPS Geolocation or City Selector e.g. TP. Hồ Chí Minh) */}
        <WeatherWidgetBar
          genderStyle={profile.genderStyle}
          onSelectWeatherOutfit={(outfit) => {
            setSelectedOutfit(outfit);
            setActiveSection('suggestions');
          }}
        />

        {/* SECTION 1: GỢI Ý PHỐI ĐỒ */}
        {activeSection === 'suggestions' && (
          <div className="space-y-8">
            {/* Editorial Split Hero Banner */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch bg-white border border-stone-200/90 rounded-2xl overflow-hidden shadow-xs">
              <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="text-xs text-stone-500 flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-theme-primary">
                      Gợi ý riêng cho {genderLabel}
                    </span>
                    <span>·</span>
                    <span>
                      {userSelectedStyleObjects.length > 0
                        ? userSelectedStyleObjects.map((s) => s.title).join(' · ')
                        : 'Bộ sưu tập tuyển chọn'}
                    </span>
                  </div>

                  <h1
                    className="font-serif-display font-bold text-stone-900 leading-tight"
                    style={{ fontSize: 'clamp(2.15rem, 3.4vw, 3.2rem)', textWrap: 'balance' }}
                  >
                    Tủ Đồ Gợi Ý Theo Sở Thích Phong Cách & Số Đo Cơ Thể Của Bạn
                  </h1>

                  <p className="text-sm sm:text-base text-stone-600 leading-relaxed max-w-2xl">
                    Dựa trên lựa chọn phong cách cá nhân và chỉ số cơ thể ({profile.heightCm}cm · {profile.weightKg}kg · 3 vòng {profile.bustCm}-{profile.waistCm}-{profile.hipCm}cm), hệ thống đã tuyển chọn những bộ đồ mẫu khớp nhất để bạn thử trực tiếp qua Camera AR hoặc Manocanh.
                  </p>
                </div>

                <div className="pt-6 mt-6 border-t border-stone-200 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsArModalOpen(true);
                    }}
                    className="px-5 py-2.5 bg-theme-primary text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap shadow-xs"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Chụp / Tải Ảnh Áo Mặc Lên Manocanh</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveSection('mannequin')}
                    className="px-5 py-2.5 bg-white hover:bg-stone-100 text-stone-900 border border-stone-300 text-xs sm:text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap"
                  >
                    <Sliders className="w-4 h-4 text-theme-primary" />
                    <span>Vào Phòng Manocanh 3 Vòng</span>
                  </button>
                </div>
              </div>

              <div className="lg:col-span-5 relative min-h-[340px] bg-stone-100">
                <img
                  src={selectedOutfit.imageUrl}
                  alt={selectedOutfit.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6 text-white">
                  <p className="text-xs text-amber-300">Đang chọn thử · {selectedOutfit.category}</p>
                  <p className="font-serif-display text-2xl font-bold mt-0.5">
                    {selectedOutfit.name}
                  </p>
                </div>
              </div>
            </div>

            {/* Real-time Dynamic AI Learned Wardrobe Banner */}
            {learnedContext && (
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-50 via-white to-amber-50/70 border border-amber-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-4 animate-fadeIn">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-amber-500/15 text-amber-800 flex items-center justify-center shrink-0 border border-amber-300 shadow-2xs">
                    <Brain className="w-5 h-5 text-amber-700" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                      <span>🧠 AI đã học từ cuộc trò chuyện với Aura:</span>
                    </p>
                    <p className="text-xs text-stone-700 mt-1 leading-relaxed">
                      Đang ưu tiên gợi ý đồ <strong>{learnedContext.recentEvent || 'theo hoàn cảnh bạn vừa chat'}</strong>
                      {learnedContext.preferredColors && learnedContext.preferredColors.length > 0 && (
                        <> · Tone màu <strong>{learnedContext.preferredColors.join(', ')}</strong></>
                      )}
                      {learnedContext.dislikedColors && learnedContext.dislikedColors.length > 0 && (
                        <> (tránh <strong>{learnedContext.dislikedColors.join(', ')}</strong>)</>
                      )}
                      {learnedContext.bodyConcerns && learnedContext.bodyConcerns.length > 0 && (
                        <> · Ưu tiên <strong>{learnedContext.bodyConcerns.join(', ')}</strong></>
                      )}
                      <> · Phù hợp dáng <strong>{profile.bustCm}-{profile.waistCm}-{profile.hipCm}cm</strong></>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleResetAiFilter}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-stone-500" />
                  <span>Đặt lại bộ lọc AI</span>
                </button>
              </div>
            )}

            {/* Category & Style Filter Bar */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-serif-display text-2xl sm:text-3xl font-bold text-stone-900">
                    Các Bộ Đồ {genderLabel} Phối Theo Quy Tắc Màu Sắc & Tỷ Lệ Dài Ngắn
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Tất cả trang phục đã được tách nền riêng từng bộ, chia theo 12 phong cách và quy tắc tôn dáng ({filteredOutfits.length} bộ phù hợp)
                  </p>
                </div>

                <div className="flex items-center gap-1 p-1 bg-stone-200/75 rounded-lg overflow-x-auto">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        categoryFilter === cat
                          ? 'bg-white text-stone-900 shadow-xs font-semibold'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* 12 Fashion Style Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setStyleTabFilter('all')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer border ${
                    styleTabFilter === 'all'
                      ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                      : 'bg-white text-stone-700 border-stone-300 hover:border-stone-500'
                  }`}
                >
                  Tất cả phong cách ({genderOutfitsPool.length})
                </button>
                {FASHION_STYLE_OPTIONS.map((styleOpt) => {
                  const isUserFav = (profile.favoriteStyles || []).includes(styleOpt.id);
                  const isActiveTab = styleTabFilter === styleOpt.id;
                  const count = genderOutfitsPool.filter((o) =>
                    o.styleTags.includes(styleOpt.id)
                  ).length;
                  if (count === 0) return null;
                  return (
                    <button
                      key={styleOpt.id}
                      type="button"
                      onClick={() =>
                        setStyleTabFilter(isActiveTab ? 'all' : styleOpt.id)
                      }
                      className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap shrink-0 cursor-pointer border flex items-center gap-1.5 ${
                        isActiveTab
                          ? 'bg-theme-primary text-white border-theme-primary shadow-xs font-semibold'
                          : isUserFav
                          ? 'bg-theme-primary/10 text-stone-900 border-theme-primary/40 hover:bg-theme-primary/20 font-semibold'
                          : 'bg-white text-stone-700 border-stone-300 hover:border-stone-500'
                      }`}
                    >
                      {isUserFav && <Sparkles className="w-3 h-3 text-theme-primary shrink-0" />}
                      <span>{styleOpt.title}</span>
                      <span className="text-[10px] opacity-75">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Clean Outfit Suggestions Grid with Hover Scale & Drop Shadow */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
              {filteredOutfits.map((outfit) => {
                const fit = calculateOutfitFit(outfit, profile);
                const matchedUserStyles = FASHION_STYLE_OPTIONS.filter(
                  (opt) =>
                    outfit.styleTags.includes(opt.id) &&
                    (profile.favoriteStyles || []).includes(opt.id)
                );
                const outfitStyleLabels = FASHION_STYLE_OPTIONS.filter((opt) =>
                  outfit.styleTags.includes(opt.id)
                );

                return (
                  <article
                    key={outfit.id}
                    className="group bg-white border border-stone-200/90 hover:border-theme-primary/50 rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-300 ease-out hover:scale-[1.03] hover:-translate-y-1.5 hover:shadow-[0_22px_48px_-12px_rgba(24,24,27,0.22)]"
                  >
                    <div>
                      <div className="aspect-[3/4] w-full overflow-hidden bg-stone-100 relative">
                        <img
                          src={outfit.imageUrl}
                          alt={outfit.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                        />
                        {matchedUserStyles.length > 0 && (
                          <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-xs text-white px-3 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1.5 shadow-sm">
                            <Check className="w-3.5 h-3.5 text-amber-300" />
                            <span>Hợp gu: {matchedUserStyles[0].title}</span>
                          </div>
                        )}
                      </div>

                      <div className="p-4 sm:p-5 space-y-2.5">
                        <div className="flex items-center gap-1.5 text-xs text-stone-500 font-mono-tabular">
                          <span>{outfit.category}</span>
                          <span aria-hidden="true">·</span>
                          <span className="text-stone-900 font-semibold">Size {fit.recommendedSize}</span>
                          <span aria-hidden="true">·</span>
                          <span className="text-theme-primary font-semibold">{fit.fitScore}% hợp dáng</span>
                        </div>

                        <h3 className="text-base font-bold text-stone-900 group-hover:text-theme-primary transition-colors leading-snug">
                          {outfit.name}
                        </h3>

                        <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                          {outfit.subtitle}
                        </p>

                        {/* Style Tags Pills */}
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {outfitStyleLabels.slice(0, 3).map((st) => (
                            <span
                              key={st.id}
                              className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[10px] font-medium"
                            >
                              {st.title}
                            </span>
                          ))}
                        </div>

                        {/* Color & Length/Proportion Styling Rules Box */}
                        <div className="p-2.5 rounded-xl bg-theme-canvas border border-stone-200/80 space-y-1 text-[11px]">
                          <p className="text-stone-700 leading-snug">
                            <strong className="text-stone-900">Quy tắc màu:</strong> {outfit.colorRule}
                          </p>
                          <p className="text-stone-700 leading-snug">
                            <strong className="text-stone-900">Tỷ lệ dài ngắn:</strong> {outfit.proportionRule}
                          </p>
                        </div>

                        {/* Dynamic Reason from Aura */}
                        <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/70 text-[11px] text-amber-950 flex items-start gap-1.5 shadow-2xs">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span className="leading-snug">
                            <strong>✨ Gợi ý từ Aura:</strong> {getOutfitAuraReason(outfit)}
                          </span>
                        </div>

                        <p className="text-[11px] text-stone-500 pt-1 border-t border-stone-100">
                          {fit.fitNotes}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 sm:p-5 pt-0 grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedOutfit(outfit);
                          setActiveSection('mannequin');
                        }}
                        className="py-2.5 px-3 bg-theme-primary text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shadow-2xs"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Mặc Lên Manocanh</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedOutfit(outfit);
                          setIsArModalOpen(true);
                        }}
                        className="py-2.5 px-3 bg-theme-canvas hover:bg-stone-200/70 text-stone-900 border border-stone-300 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <Camera className="w-3.5 h-3.5 text-theme-primary" />
                        <span>Chụp Áo Của Bạn</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}

        {/* SECTION 2: MANOCANH THỬ ĐỒ */}
        {activeSection === 'mannequin' && (
          <MannequinStudio
            profile={profile}
            selectedOutfit={selectedOutfit}
            outfits={genderOutfitsPool}
            onSelectOutfit={(outfit) => setSelectedOutfit(outfit)}
            onUpdateMeasurements={async (measurements) => {
              await handleSaveProfile({
                ...profile,
                ...measurements,
              });
            }}
            onSaveTryOn={handleRecordTryOn}
            onSwitchToAr={(outfit) => {
              setSelectedOutfit(outfit);
              setIsArModalOpen(true);
            }}
          />
        )}

        {/* SECTION 3: LỊCH SỬ PHỐI ĐỒ CÁ NHÂN */}
        {activeSection === 'history' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-stone-200">
              <div>
                <h2 className="font-serif-display text-2xl sm:text-3xl font-bold text-stone-900">
                  Lịch Sử Phối Đồ & Thử Đồ Cá Nhân
                </h2>
                <p className="text-xs text-stone-500 mt-1">
                  Lưu trữ toàn bộ các bộ trang phục bạn đã thử qua Camera AR và Manocanh 3 vòng, đồng bộ hóa đám mây
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveSection('suggestions')}
                className="px-4 py-2 text-xs font-semibold text-white bg-theme-primary rounded-lg cursor-pointer"
              >
                + Thử thêm trang phục mới
              </button>
            </div>

            {/* Real-time sync with Aura learned context in history */}
            {learnedContext && (
              <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/70 text-xs text-amber-950 flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>
                    Aura đang đồng bộ gợi ý lịch sử cho: <strong>{learnedContext.recentEvent}</strong>
                    {learnedContext.bodyConcerns && learnedContext.bodyConcerns.length > 0 && (
                      <> · Ưu tiên {learnedContext.bodyConcerns[0]}</>
                    )}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleResetAiFilter}
                  className="text-[11px] text-amber-800 hover:text-amber-950 font-semibold underline cursor-pointer"
                >
                  Đặt lại
                </button>
              </div>
            )}

            {historyItems.length === 0 ? (
              <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center max-w-xl mx-auto my-8 space-y-4">
                <Clock className="w-10 h-10 text-stone-400 mx-auto" />
                <h3 className="font-serif-display text-2xl font-bold text-stone-900">
                  Chưa có bộ trang phục nào trong lịch sử thử đồ
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                  Hãy chọn một bộ trang phục trong mục <strong>Gợi ý phối</strong> hoặc <strong>Manocanh thử đồ</strong> và nhấn lưu để theo dõi các phong cách yêu thích của bạn trên mọi thiết bị.
                </p>
                <div className="pt-2 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveSection('suggestions')}
                    className="px-5 py-2.5 bg-theme-primary text-white text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    Khám phá Gợi ý phối
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSection('mannequin')}
                    className="px-5 py-2.5 border border-stone-300 text-stone-800 text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    Thử trên Manocanh
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {historyItems.map((item) => {
                  const matchedOutfit =
                    CURATED_OUTFITS.find((o) => o.id === item.outfitId) || CURATED_OUTFITS[0];
                  const modeLabel =
                    item.tryOnMode === 'ar_camera'
                      ? 'Camera AR Thực Tế'
                      : item.tryOnMode === 'mannequin_3d'
                      ? 'Manocanh 3 Vòng'
                      : 'Gợi Ý Phối Đồ';
                  const formattedDate = new Date(item.createdAtMs).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <article
                      key={item.id}
                      className="bg-white border border-stone-200/90 hover:border-theme-primary/50 rounded-2xl overflow-hidden flex flex-col justify-between shadow-2xs transition-all duration-300 ease-out hover:scale-[1.025] hover:-translate-y-1 hover:shadow-xl"
                    >
                      <div>
                        <div className="flex gap-4 p-4">
                          <img
                            src={item.imageUrl}
                            alt={item.outfitName}
                            referrerPolicy="no-referrer"
                            className="w-24 h-32 rounded-lg object-cover shrink-0 border border-stone-200"
                          />
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
                              <span>{modeLabel}</span>
                              <span>·</span>
                              <span>{formattedDate}</span>
                            </div>
                            <h3 className="text-sm font-semibold text-stone-900 leading-snug">
                              {item.outfitName}
                            </h3>
                            <p className="text-xs font-mono-tabular text-theme-primary font-semibold">
                              Size {item.recommendedSize} · Độ khớp {item.fitScore}%
                            </p>
                            <p className="text-[11px] font-mono-tabular text-stone-500">
                              Số đo lúc thử: {item.snapshotMeasurements}
                            </p>
                          </div>
                        </div>

                        <div className="px-4 pb-4">
                          <p className="text-xs text-stone-600 bg-theme-canvas p-3 rounded-lg border border-stone-200/70">
                            {item.notes}
                          </p>
                        </div>
                      </div>

                      <div className="px-4 py-3 bg-stone-50 border-t border-stone-200/80 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOutfit(matchedOutfit);
                              setIsArModalOpen(true);
                            }}
                            className="px-3 py-1.5 bg-theme-primary text-white text-xs font-medium rounded-lg cursor-pointer"
                          >
                            Thử lại AR
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOutfit(matchedOutfit);
                              setActiveSection('mannequin');
                            }}
                            className="px-3 py-1.5 border border-stone-300 bg-white text-stone-800 text-xs font-medium rounded-lg cursor-pointer"
                          >
                            Xem trên Manocanh
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteHistoryItem(item.id)}
                          className="p-1.5 text-stone-400 hover:text-red-600 transition-colors cursor-pointer"
                          title="Xóa khỏi lịch sử"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Clean Footer */}
      <footer className="mt-16 border-t border-stone-200/90 bg-white px-6 lg:px-12 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
        <span>© 2026 Smart Wardrobe · AI Trợ lý Phối đồ Aura</span>
        <span>Google Firebase Cloud Sync</span>
      </footer>

      {/* Circular Left-Corner AI Stylist Chatbox */}
      <AiStylistChatBox
        profile={profile}
        onSelectOutfitForAr={(outfit) => {
          setSelectedOutfit(outfit);
          setIsArModalOpen(true);
        }}
        onSelectOutfitForMannequin={(outfit) => {
          setSelectedOutfit(outfit);
          setActiveSection('mannequin');
        }}
        learnedContext={learnedContext}
        onLearnedContextUpdate={setLearnedContext}
      />

      {/* Garment Camera Capture & Photo Upload Studio to Dress Mannequin */}
      <ArCameraTryOnModal
        isOpen={isArModalOpen}
        onClose={() => setIsArModalOpen(false)}
        outfit={selectedOutfit}
        outfits={genderOutfitsPool}
        onSelectOutfit={(outfit) => setSelectedOutfit(outfit)}
        onApplyCapturedOutfitToMannequin={(capturedOutfit) => {
          setCustomCapturedOutfits((prev) => [
            capturedOutfit,
            ...prev.filter((item) => item.id !== capturedOutfit.id),
          ]);
          setSelectedOutfit(capturedOutfit);
          setActiveSection('mannequin');
        }}
        profile={profile}
        onSaveArTryOn={handleRecordTryOn}
      />

      {/* Top-Left Circular Avatar Profile, Measurements & Theme Color Drawer Modal */}
      <ProfileDrawerModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profile={profile}
        isCloudSynced={isCloudSynced}
        activeTheme={activeTheme}
        customPrimaryColor={customPrimaryColor}
        onSelectTheme={handleSelectThemePalette}
        onSelectCustomColor={handleSelectCustomHex}
        onSaveProfile={handleSaveProfile}
        onLogout={handleLogout}
      />

      {/* 2-Step Gender & Fashion Style Onboarding Overlay Modal */}
      {isOnboardingOpen && (
        <StyleOnboardingModal
          profile={profile}
          onCompleteOnboarding={handleCompleteOnboarding}
          onClose={() => setIsOnboardingOpen(false)}
        />
      )}
    </div>
  );
}
