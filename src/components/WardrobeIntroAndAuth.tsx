import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  KeyRound,
  Mail,
  Lock,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Info,
  Eye,
  EyeOff,
  DoorOpen,
} from 'lucide-react';
import emailjs from '@emailjs/browser';
import { signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import { DEFAULT_AVATARS, UserProfile } from '../types';

// EmailJS Configuration from Environment Variables (configured in .env)
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || '';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';

interface WardrobeIntroAndAuthProps {
  onAuthenticated: (profile: UserProfile, isCloudSynced: boolean) => void;
}

type WardrobeStage = 'closed' | 'bursting' | 'auth_ready';
type AuthTab = 'login' | 'register';
type RegisterStep = 1 | 2 | 3;

interface BurstingClothingItem {
  id: string;
  imageUrl: string;
  packedX: number;
  packedY: number;
  packedRotate: number;
  burstX: number;
  burstY: number;
  burstRotate: number;
  scale: number;
}

// 12 photorealistic transparent-background garments extracted from the 5 reference collections,
// flying out into two balanced 2x3 wings on the left (-355px to -560px) and right (+355px to +560px)
// sides outside the wardrobe with no text labels underneath.
const BURSTING_CLOTHES: BurstingClothingItem[] = [
  // ================= LEFT WING (6 GARMENTS OUTSIDE LEFT OF WARDROBE: -355px to -560px) =================
  {
    id: 'garment_01_espresso_corset',
    imageUrl: '/assets/outfits/garment_01_espresso_corset.png',
    packedX: -25,
    packedY: -60,
    packedRotate: -6,
    burstX: -355,
    burstY: -185,
    burstRotate: -8,
    scale: 1.05,
  },
  {
    id: 'garment_02_espresso_halter',
    imageUrl: '/assets/outfits/garment_02_espresso_halter.png',
    packedX: -42,
    packedY: -50,
    packedRotate: -12,
    burstX: -540,
    burstY: -165,
    burstRotate: -13,
    scale: 1.02,
  },
  {
    id: 'garment_07_flared_bow_jeans',
    imageUrl: '/assets/outfits/garment_07_flared_bow_jeans.png',
    packedX: -30,
    packedY: -10,
    packedRotate: -8,
    burstX: -380,
    burstY: 5,
    burstRotate: -6,
    scale: 1.08,
  },
  {
    id: 'garment_12_flannel_shirt',
    imageUrl: '/assets/outfits/garment_12_flannel_shirt.png',
    packedX: -45,
    packedY: -5,
    packedRotate: -10,
    burstX: -560,
    burstY: 10,
    burstRotate: -11,
    scale: 1.06,
  },
  {
    id: 'garment_09_pleated_denim_skirt',
    imageUrl: '/assets/outfits/garment_09_pleated_denim_skirt.png',
    packedX: -22,
    packedY: 35,
    packedRotate: -5,
    burstX: -355,
    burstY: 185,
    burstRotate: -8,
    scale: 1.02,
  },
  {
    id: 'garment_05_mesh_bell_top',
    imageUrl: '/assets/outfits/garment_05_mesh_bell_top.png',
    packedX: -38,
    packedY: 40,
    packedRotate: -11,
    burstX: -535,
    burstY: 180,
    burstRotate: -12,
    scale: 1.04,
  },

  // ================= RIGHT WING (6 GARMENTS OUTSIDE RIGHT OF WARDROBE: +355px to +560px) =================
  {
    id: 'garment_04_grey_offshoulder',
    imageUrl: '/assets/outfits/garment_04_grey_offshoulder.png',
    packedX: 25,
    packedY: -60,
    packedRotate: 6,
    burstX: 355,
    burstY: -185,
    burstRotate: 8,
    scale: 1.05,
  },
  {
    id: 'garment_03_espresso_knit',
    imageUrl: '/assets/outfits/garment_03_espresso_knit.png',
    packedX: 42,
    packedY: -50,
    packedRotate: 12,
    burstX: 540,
    burstY: -165,
    burstRotate: 13,
    scale: 1.02,
  },
  {
    id: 'garment_11_valley_hoodie',
    imageUrl: '/assets/outfits/garment_11_valley_hoodie.png',
    packedX: 30,
    packedY: -10,
    packedRotate: 8,
    burstX: 380,
    burstY: 5,
    burstRotate: 6,
    scale: 1.06,
  },
  {
    id: 'garment_08_pink_bow_baggy',
    imageUrl: '/assets/outfits/garment_08_pink_bow_baggy.png',
    packedX: 45,
    packedY: -5,
    packedRotate: 10,
    burstX: 560,
    burstY: 10,
    burstRotate: 11,
    scale: 1.08,
  },
  {
    id: 'garment_10_black_bow_skirt',
    imageUrl: '/assets/outfits/garment_10_black_bow_skirt.png',
    packedX: 22,
    packedY: 35,
    packedRotate: 5,
    burstX: 355,
    burstY: 185,
    burstRotate: 8,
    scale: 1.02,
  },
  {
    id: 'garment_06_california_hoodie',
    imageUrl: '/assets/outfits/garment_06_california_hoodie.png',
    packedX: 38,
    packedY: 40,
    packedRotate: 11,
    burstX: 535,
    burstY: 180,
    burstRotate: 12,
    scale: 1.04,
  },
];

// Photorealistic Hanger-Free Garment Cutouts (No text labels underneath)
const RealisticGarmentSVG: React.FC<{ item: BurstingClothingItem }> = ({ item }) => {
  return (
    <div className="flex items-center justify-center drop-shadow-[0_24px_30px_rgba(0,0,0,0.82)]">
      <img
        src={item.imageUrl}
        alt=""
        draggable={false}
        className="w-32 h-36 sm:w-40 sm:h-44 object-contain select-none pointer-events-none"
      />
    </div>
  );
};

// Deterministic SHA-256 helper for client-side password hashing
async function hashPassword(plain: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain + '_atelier_aura_salt_2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const WardrobeIntroAndAuth: React.FC<WardrobeIntroAndAuthProps> = ({ onAuthenticated }) => {
  const [stage, setStage] = useState<WardrobeStage>('closed');
  const [authTab, setAuthTab] = useState<AuthTab>('login');
  const [regStep, setRegStep] = useState<RegisterStep>(1);

  // Registration & Login fields
  const [contactInput, setContactInput] = useState('');
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status & security guide
  const [statusMessage, setStatusMessage] = useState<{ type: 'info' | 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSecurityGuide, setShowSecurityGuide] = useState(true);

  const handleOpenWardrobe = () => {
    if (stage !== 'closed') return;
    setStage('bursting');
    setTimeout(() => {
      setStage('auth_ready');
    }, 2300);
  };

  useEffect(() => {
    const savedContact = localStorage.getItem('atelier_aura_last_contact');
    if (savedContact) {
      setContactInput(savedContact);
    }
  }, []);

  // Step 1 -> Step 2: Validate Gmail & Dispatch 6-Digit Random OTP via @emailjs/browser
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = contactInput.trim();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);

    if (!isEmail) {
      setStatusMessage({
        type: 'error',
        text: 'Vui lòng nhập địa chỉ Gmail hợp lệ (vd: tenban@gmail.com) để nhận mã OTP.',
      });
      return;
    }

    if (!displayNameInput.trim()) {
      setStatusMessage({
        type: 'error',
        text: 'Vui lòng nhập tên hiển thị của bạn để cá nhân hóa tủ đồ.',
      });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    // Generate random 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(otpCode);

    if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
      setStatusMessage({
        type: 'error',
        text: 'Chưa cấu hình biến môi trường EmailJS (VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, VITE_EMAILJS_PUBLIC_KEY) trong file .env.',
      });
      setIsSubmitting(false);
      return;
    }

    try {
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          to_email: trimmed,
          email: trimmed,
          user_email: trimmed,
          recipient: trimmed,
          reply_to: trimmed,
          to_name: displayNameInput.trim(),
          user_name: displayNameInput.trim(),
          name: displayNameInput.trim(),
          otp_code: otpCode,
          passcode: otpCode,
          otp: otpCode,
          code: otpCode,
          time: '5 phút',
        },
        {
          publicKey: EMAILJS_PUBLIC_KEY,
        }
      );

      setOtpInput('');
      setRegStep(2);
      setStatusMessage({
        type: 'info',
        text: `Mã xác thực OTP 6 chữ số đã được gửi về Gmail "${trimmed}". Vui lòng kiểm tra Hộp thư đến (hoặc mục Spam) của bạn.`,
      });
    } catch (error) {
      const errorDetail =
        error && typeof error === 'object' && 'text' in error
          ? String((error as { text: unknown }).text)
          : error instanceof Error
          ? error.message
          : 'Không thể gửi email qua EmailJS.';

      setStatusMessage({
        type: 'error',
        text: `Không thể gửi mã OTP qua EmailJS (${errorDetail}). Vui lòng kiểm tra lại địa chỉ Gmail hoặc thử lại sau.`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2 -> Step 3: Verify OTP entered by user against generated otp_code
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const entered = otpInput.trim();

    if (entered.length !== 6) {
      setStatusMessage({
        type: 'error',
        text: 'Vui lòng nhập đủ 6 chữ số mã OTP đã nhận trong hộp thư Gmail của bạn.',
      });
      return;
    }

    if (!generatedOtp || entered !== generatedOtp) {
      setStatusMessage({
        type: 'error',
        text: 'Mã OTP chưa chính xác. Vui lòng kiểm tra lại email trong hộp thư Gmail của bạn.',
      });
      return;
    }

    setRegStep(3);
    setStatusMessage({
      type: 'success',
      text: 'Xác thực mã OTP thành công! Bước cuối: Thiết lập mật khẩu bảo mật cho tài khoản của bạn.',
    });
  };

  // Step 3: Create Password & Sync to Firebase Cloud
  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput.length < 6) {
      setStatusMessage({
        type: 'error',
        text: 'Mật khẩu cần tối thiểu 6 ký tự để đảm bảo an toàn bảo mật.',
      });
      return;
    }
    if (passwordInput !== confirmPasswordInput) {
      setStatusMessage({
        type: 'error',
        text: 'Mật khẩu xác nhận không khớp. Vui lòng nhập lại.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const trimmedContact = contactInput.trim().toLowerCase();
      const isEmail = trimmedContact.includes('@');
      const pwdHash = await hashPassword(passwordInput);

      const localAccountsRaw = localStorage.getItem('atelier_aura_accounts') || '{}';
      const localAccounts = JSON.parse(localAccountsRaw);

      const firebaseUser = auth.currentUser;
      const uid = firebaseUser?.uid || `user_${trimmedContact.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const newProfile: UserProfile = {
        uid,
        displayName: (
          displayNameInput.trim() ||
          firebaseUser?.displayName ||
          'Khách hàng Smart Wardrobe'
        ).slice(0, 100),
        avatarUrl: (firebaseUser?.photoURL || DEFAULT_AVATARS[0]).slice(0, 2000),
        heightCm: 165,
        weightKg: 54,
        bustCm: 86,
        waistCm: 66,
        hipCm: 92,
        genderStyle: 'female',
        favoriteStyles: [],
        onboardingCompleted: false,
      };

      localAccounts[trimmedContact] = {
        contactIdentifier: trimmedContact,
        contactType: isEmail ? 'email' : 'phone',
        passwordHash: pwdHash,
        otpVerified: true,
        profile: newProfile,
      };
      localStorage.setItem('atelier_aura_accounts', JSON.stringify(localAccounts));
      localStorage.setItem('atelier_aura_last_contact', trimmedContact);

      let syncedToCloud = false;
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        try {
          const existingSnap = await getDoc(userDocRef);
          const existingData = existingSnap.exists() ? existingSnap.data() : null;

          await setDoc(userDocRef, {
            uid: firebaseUser.uid,
            displayName: newProfile.displayName.slice(0, 100),
            avatarUrl: newProfile.avatarUrl.slice(0, 2000),
            heightCm: newProfile.heightCm,
            weightKg: newProfile.weightKg,
            bustCm: newProfile.bustCm,
            waistCm: newProfile.waistCm,
            hipCm: newProfile.hipCm,
            genderStyle: newProfile.genderStyle,
            favoriteStyles: [],
            onboardingCompleted: false,
            createdAt: existingData?.createdAt || serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          const privateDocRef = doc(db, 'users', firebaseUser.uid, 'private', 'credentials');
          await setDoc(privateDocRef, {
            uid: firebaseUser.uid,
            contactIdentifier: trimmedContact.slice(0, 160),
            contactType: isEmail ? 'email' : 'phone',
            passwordHash: pwdHash,
            otpVerified: true,
            updatedAt: serverTimestamp(),
          });
          syncedToCloud = true;
        } catch (err) {
          console.warn('Cloud registration sync warning (saved locally):', err);
        }
      }

      onAuthenticated(newProfile, syncedToCloud);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to ensure any profile loaded from Cloud or LocalStorage has complete, valid fields
  const normalizeLoadedProfile = (
    raw: Partial<UserProfile> | Record<string, unknown> | undefined,
    fallbackUid: string,
    fallbackName?: string | null,
    fallbackAvatar?: string | null
  ): UserProfile => {
    const data = raw || {};
    const gender =
      data.genderStyle === 'female' || data.genderStyle === 'male' || data.genderStyle === 'neutral'
        ? data.genderStyle
        : 'female';
    const favs = Array.isArray(data.favoriteStyles)
      ? data.favoriteStyles.filter((s): s is string => typeof s === 'string').slice(0, 12)
      : [];
    return {
      uid: typeof data.uid === 'string' && data.uid ? data.uid : fallbackUid,
      displayName: (
        typeof data.displayName === 'string' && data.displayName.trim()
          ? data.displayName.trim()
          : fallbackName || 'Thành viên Smart Wardrobe'
      ).slice(0, 100),
      avatarUrl: (
        typeof data.avatarUrl === 'string' && data.avatarUrl.trim()
          ? data.avatarUrl.trim()
          : fallbackAvatar || DEFAULT_AVATARS[0]
      ).slice(0, 2000),
      heightCm: Number.isFinite(Number(data.heightCm))
        ? Math.max(100, Math.min(250, Number(data.heightCm)))
        : 165,
      weightKg: Number.isFinite(Number(data.weightKg))
        ? Math.max(25, Math.min(250, Number(data.weightKg)))
        : 54,
      bustCm: Number.isFinite(Number(data.bustCm))
        ? Math.max(50, Math.min(180, Number(data.bustCm)))
        : 86,
      waistCm: Number.isFinite(Number(data.waistCm))
        ? Math.max(40, Math.min(180, Number(data.waistCm)))
        : 66,
      hipCm: Number.isFinite(Number(data.hipCm))
        ? Math.max(50, Math.min(180, Number(data.hipCm)))
        : 92,
      genderStyle: gender,
      favoriteStyles: favs,
      faceShape: typeof data.faceShape === 'string' && data.faceShape ? data.faceShape : 'round',
      undertone: typeof data.undertone === 'string' && data.undertone ? data.undertone : 'warm',
      onboardingCompleted: Boolean(data.onboardingCompleted),
    };
  };

  // Standard Login with saved Gmail / Phone + Password
  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedContact = contactInput.trim().toLowerCase();
    if (!trimmedContact || !passwordInput) {
      setStatusMessage({
        type: 'error',
        text: 'Vui lòng nhập đầy đủ Gmail / Số điện thoại và Mật khẩu.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const pwdHash = await hashPassword(passwordInput);
      const localAccountsRaw = localStorage.getItem('atelier_aura_accounts') || '{}';
      const localAccounts = JSON.parse(localAccountsRaw);
      const record = localAccounts[trimmedContact];

      if (!record || record.passwordHash !== pwdHash) {
        setStatusMessage({
          type: 'error',
          text: 'Thông tin Gmail/SĐT hoặc mật khẩu chưa đúng, hoặc bạn chưa đăng ký tài khoản này. Hãy chuyển sang tab Đăng ký hoặc chọn Đăng nhập Google.',
        });
        setIsSubmitting(false);
        return;
      }

      localStorage.setItem('atelier_aura_last_contact', trimmedContact);

      if (auth.currentUser) {
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        try {
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const cloudProfile = normalizeLoadedProfile(
              snap.data() as Record<string, unknown>,
              auth.currentUser.uid,
              auth.currentUser.displayName,
              auth.currentUser.photoURL
            );
            onAuthenticated(cloudProfile, true);
            return;
          }
        } catch (err) {
          console.warn('Cloud profile read warning (using local profile):', err);
        }
      }

      const fallbackProfile = normalizeLoadedProfile(
        record.profile,
        record.profile?.uid || `user_${trimmedContact.replace(/[^a-zA-Z0-9]/g, '_')}`
      );
      onAuthenticated(fallbackProfile, Boolean(auth.currentUser));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Direct Google Firebase Login / Registration
  const handleGoogleFirebaseLogin = async () => {
    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const userDocRef = doc(db, 'users', user.uid);

      const defaultProfile = normalizeLoadedProfile(
        undefined,
        user.uid,
        user.displayName,
        user.photoURL
      );

      try {
        const snap = await getDoc(userDocRef);
        if (snap.exists()) {
          const existingProfile = normalizeLoadedProfile(
            snap.data() as Record<string, unknown>,
            user.uid,
            user.displayName,
            user.photoURL
          );
          if (user.email) {
            localStorage.setItem('atelier_aura_last_contact', user.email.toLowerCase());
          }
          onAuthenticated(existingProfile, true);
          return;
        } else {
          await setDoc(userDocRef, {
            ...defaultProfile,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          if (user.email) {
            localStorage.setItem('atelier_aura_last_contact', user.email.toLowerCase());
          }
          onAuthenticated(defaultProfile, true);
          return;
        }
      } catch (err) {
        console.warn('Cloud Google login sync warning (continuing with session profile):', err);
        if (user.email) {
          localStorage.setItem('atelier_aura_last_contact', user.email.toLowerCase());
        }
        onAuthenticated(defaultProfile, false);
      }
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text:
          error instanceof Error
            ? `Không thể hoàn tất đăng nhập Google: ${error.message}`
            : 'Đã huỷ cửa sổ đăng nhập Google Firebase.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#161412] text-[#FAF8F5] flex flex-col justify-between select-none">
      {/* Subtle Ambient Warm Spotlight */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 42%, rgba(212, 163, 115, 0.24) 0%, rgba(28, 25, 23, 0.88) 55%, rgba(16, 14, 12, 1) 100%)',
        }}
      />

      {/* Minimal Header */}
      <header className="relative z-30 flex items-center justify-between px-8 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="font-serif-display text-2xl font-bold tracking-wider text-[#FAF8F5]">
            SMART WARDROBE
          </span>
        </div>

        {stage !== 'auth_ready' && (
          <button
            type="button"
            onClick={() => setStage('auth_ready')}
            className="px-4 py-2 text-xs font-medium text-stone-200 border border-white/15 rounded-lg hover:bg-white/10 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Bỏ qua hiệu ứng mở tủ
          </button>
        )}
      </header>

      {/* Main Interactive Wardrobe Stage */}
      <main className="relative z-20 flex-1 flex items-center justify-center px-4 py-8">
        {/* Bursting Clothes Layer: Hidden when closed, spreads out around wardrobe when bursting, and disappears completely once Login/Register appears */}
        <AnimatePresence>
          {stage !== 'auth_ready' && (
            <motion.div
              key="bursting-clothes-ring"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.15 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-visible"
            >
              {BURSTING_CLOTHES.map((garment, idx) => {
                const isClosed = stage === 'closed';
                return (
                  <motion.div
                    key={garment.id}
                    initial={{
                      opacity: 0,
                      scale: 0.45,
                      x: garment.packedX,
                      y: garment.packedY,
                      rotate: garment.packedRotate,
                    }}
                    animate={
                      isClosed
                        ? {
                            // Hidden strictly inside the closed cabinet behind the doors
                            opacity: 0,
                            scale: 0.45,
                            x: garment.packedX,
                            y: garment.packedY,
                            rotate: garment.packedRotate,
                          }
                        : {
                            // Bursting out from inside the cabinet in a balanced, moderate layout around the doors
                            opacity: 1,
                            scale: garment.scale,
                            x: garment.burstX,
                            y: garment.burstY,
                            rotate: garment.burstRotate,
                          }
                    }
                    transition={{
                      type: 'spring',
                      stiffness: 58,
                      damping: 12,
                      delay: isClosed ? 0 : 0.08 + idx * 0.04,
                    }}
                    className={`absolute ${isClosed ? 'z-10' : 'z-35'}`}
                  >
                    <RealisticGarmentSVG item={garment} />
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* STAGE 1: Standing Honey-Oak Wardrobe Cabinet Matching Reference Image (2 Tall Doors + 2 Stacked Bottom Drawers + Top Crown + Recessed Plinth) */}
        <AnimatePresence mode="wait">
          {stage !== 'auth_ready' && (
            <motion.div
              key="wardrobe-cabinet"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{
                opacity: 1,
                scale: stage === 'bursting' ? 0.94 : 1,
              }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.45 }}
              className="relative z-25 w-full max-w-[350px] sm:max-w-[405px] perspective-1600 flex flex-col items-center justify-center"
            >
              {/* 1. 3D Perspective Trapezoid Top Roof / Crown */}
              <div
                className="w-[98%] h-5 sm:h-6 -mb-1 relative z-20"
                style={{
                  clipPath: 'polygon(7% 0%, 93% 0%, 100% 100%, 0% 100%)',
                  background:
                    'linear-gradient(180deg, #8A5425 0%, #B77C43 75%, #75451C 100%)',
                  boxShadow: 'inset 0 2px 3px rgba(255,232,200,0.45)',
                }}
              >
                <svg viewBox="0 0 400 24" className="w-full h-full opacity-35" preserveAspectRatio="none">
                  <path d="M 20 8 Q 200 4 380 8 M 10 16 Q 200 13 390 16" stroke="#5A3210" strokeWidth="1.5" fill="none" />
                </svg>
              </div>

              {/* 2. Main Outer Honey-Oak Wooden Cabinet Body */}
              <div
                className="relative w-full rounded-[18px] p-3.5 sm:p-4 flex flex-col gap-3 border-[3px] border-[#6E3F17] preserve-3d"
                style={{
                  background:
                    'linear-gradient(180deg, #BD8248 0%, #AA6F37 52%, #925B28 100%)',
                  boxShadow:
                    'inset 0 2px 4px rgba(255,235,205,0.55), inset 0 -4px 8px rgba(60,30,8,0.65), 0 32px 80px rgba(0,0,0,0.85)',
                }}
              >
                {/* Subtle Outer Frame Wood Grain Lines */}
                <svg
                  viewBox="0 0 400 540"
                  className="pointer-events-none absolute inset-0 w-full h-full rounded-[15px] opacity-25"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M 6 20 Q 10 270 6 520 M 394 20 Q 390 270 394 520 M 30 378 Q 200 374 370 378"
                    stroke="#59310E"
                    strokeWidth="2"
                    fill="none"
                  />
                </svg>

                {/* 2A. UPPER SECTION: Recessed Double-Door Cavity (Clothes sit inside here behind doors) */}
                <div className="relative w-full h-[315px] sm:h-[360px] rounded-[12px] bg-[#211309] border-[3px] border-[#5E3411] shadow-[inset_0_10px_28px_rgba(0,0,0,0.85)] flex preserve-3d">
                  {/* Interior Back Wall, Hanging Rod & Shelves (Visible when doors swing open) */}
                  <div className="absolute inset-0 z-10 rounded-[9px] overflow-hidden flex flex-col justify-between p-5 bg-gradient-to-b from-[#3A2210] via-[#26160A] to-[#160C05]">
                    {/* Wooden Hanging Rod */}
                    <div className="w-full h-2.5 rounded-full bg-gradient-to-b from-[#C88E55] to-[#7A471D] border-b border-amber-200/25 shadow-md mt-2" />
                    <div className="my-auto text-center">
                      <p className="font-serif-display text-2xl sm:text-3xl font-bold tracking-wider text-amber-100/90 drop-shadow">
                        SMART WARDROBE
                      </p>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-[#4D2C12] border-t border-amber-200/15" />
                  </div>

                  {/* Left Tall Honey-Oak Wardrobe Door */}
                  <motion.div
                    animate={
                      stage === 'bursting'
                        ? { rotateY: -135 }
                        : { rotateY: [0, -2.2, 0, -1.2, 0] }
                    }
                    transition={
                      stage === 'bursting'
                        ? { duration: 0.82, ease: [0.16, 1, 0.3, 1] }
                        : { duration: 2.3, repeat: Infinity, ease: 'easeInOut' }
                    }
                    style={{
                      transformOrigin: 'left center',
                      background:
                        'linear-gradient(180deg, #C78C52 0%, #B4783E 52%, #9E642D 100%)',
                      boxShadow:
                        'inset 2px 2px 4px rgba(255,235,205,0.5), inset -3px -3px 6px rgba(78,42,12,0.6), 4px 0 12px rgba(0,0,0,0.35)',
                    }}
                    onClick={handleOpenWardrobe}
                    className="relative z-30 w-1/2 h-full rounded-l-[9px] rounded-r-[3px] border-r-2 border-[#59310E] cursor-pointer group overflow-hidden"
                  >
                    {/* Organic Wood Grain SVG Illustration on Left Door */}
                    <svg
                      viewBox="0 0 180 360"
                      className="pointer-events-none absolute inset-0 w-full h-full opacity-35"
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M 24 0 C 18 110, 32 220, 22 360 M 54 0 C 68 95, 42 210, 58 360 M 88 0 C 74 120, 102 185, 86 360 M 118 0 C 132 130, 108 240, 124 360 M 152 0 C 142 110, 160 230, 148 360"
                        stroke="#6E3D14"
                        strokeWidth="1.6"
                        fill="none"
                      />
                      <path
                        d="M 38 70 C 48 110, 34 160, 44 210 M 102 130 C 90 175, 114 215, 98 265 M 68 230 C 56 265, 76 300, 64 335"
                        stroke="#7B4619"
                        strokeWidth="1.2"
                        fill="none"
                      />
                      <ellipse cx="45" cy="245" rx="7" ry="18" stroke="#6E3D14" strokeWidth="1.2" fill="none" />
                    </svg>

                    {/* Inner Soft Bevel Frame */}
                    <div className="pointer-events-none absolute inset-1.5 rounded-[6px] border border-amber-100/25" />

                    {/* Round 3D Wooden Knob on Left Door (Right-center edge, matching reference image) */}
                    <div
                      className="absolute right-3.5 top-[53%] -translate-y-1/2 w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-[#5A3210] group-hover:scale-110 transition-transform"
                      style={{
                        background:
                          'radial-gradient(circle at 35% 30%, #ECC08D 0%, #BD7F42 55%, #744115 100%)',
                        boxShadow:
                          '0 3px 6px rgba(45,20,4,0.7), inset 0 1px 2px rgba(255,242,220,0.65)',
                      }}
                    />
                  </motion.div>

                  {/* Right Tall Honey-Oak Wardrobe Door */}
                  <motion.div
                    animate={
                      stage === 'bursting'
                        ? { rotateY: 135 }
                        : { rotateY: [0, 2.2, 0, 1.2, 0] }
                    }
                    transition={
                      stage === 'bursting'
                        ? { duration: 0.82, ease: [0.16, 1, 0.3, 1] }
                        : { duration: 2.3, repeat: Infinity, ease: 'easeInOut' }
                    }
                    style={{
                      transformOrigin: 'right center',
                      background:
                        'linear-gradient(180deg, #C78C52 0%, #B4783E 52%, #9E642D 100%)',
                      boxShadow:
                        'inset 2px 2px 4px rgba(255,235,205,0.5), inset -3px -3px 6px rgba(78,42,12,0.6), -4px 0 12px rgba(0,0,0,0.35)',
                    }}
                    onClick={handleOpenWardrobe}
                    className="relative z-30 w-1/2 h-full rounded-r-[9px] rounded-l-[3px] border-l-2 border-[#59310E] cursor-pointer group overflow-hidden"
                  >
                    {/* Organic Wood Grain SVG Illustration on Right Door */}
                    <svg
                      viewBox="0 0 180 360"
                      className="pointer-events-none absolute inset-0 w-full h-full opacity-35"
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M 26 0 C 38 115, 18 225, 30 360 M 58 0 C 44 105, 72 215, 56 360 M 94 0 C 108 125, 82 205, 96 360 M 128 0 C 114 135, 140 235, 126 360 M 156 0 C 164 115, 146 235, 158 360"
                        stroke="#6E3D14"
                        strokeWidth="1.6"
                        fill="none"
                      />
                      <path
                        d="M 135 85 C 120 130, 148 175, 130 220 M 48 250 C 64 285, 38 320, 52 350"
                        stroke="#7B4619"
                        strokeWidth="1.3"
                        fill="none"
                      />
                      <ellipse cx="142" cy="145" rx="8" ry="20" stroke="#6E3D14" strokeWidth="1.2" fill="none" />
                    </svg>

                    {/* Inner Soft Bevel Frame */}
                    <div className="pointer-events-none absolute inset-1.5 rounded-[6px] border border-amber-100/25" />

                    {/* Round 3D Wooden Knob on Right Door (Left-center edge, matching reference image) */}
                    <div
                      className="absolute left-3.5 top-[53%] -translate-y-1/2 w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-[#5A3210] group-hover:scale-110 transition-transform"
                      style={{
                        background:
                          'radial-gradient(circle at 35% 30%, #ECC08D 0%, #BD7F42 55%, #744115 100%)',
                        boxShadow:
                          '0 3px 6px rgba(45,20,4,0.7), inset 0 1px 2px rgba(255,242,220,0.65)',
                      }}
                    />
                  </motion.div>

                  {/* Center Interactive Trigger Button when Closed */}
                  {stage === 'closed' && (
                    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center pointer-events-none">
                      <motion.button
                        type="button"
                        onClick={handleOpenWardrobe}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.96 }}
                        className="pointer-events-auto px-5 py-3 rounded-xl bg-[#FAF8F5] text-[#18181B] font-semibold text-xs sm:text-sm shadow-[0_10px_35px_rgba(0,0,0,0.65)] flex items-center gap-2 cursor-pointer border-2 border-amber-500"
                      >
                        <DoorOpen className="w-4 h-4 text-amber-700" />
                        <span>Mở Tủ Đồ</span>
                      </motion.button>
                    </div>
                  )}
                </div>

                {/* 2B. LOWER SECTION: Two Stacked Horizontal Full-Width Wooden Drawers (Matching Reference Image) */}
                <div className="w-full h-[126px] sm:h-[142px] rounded-[11px] bg-[#5B3210] p-[3px] flex flex-col gap-[4px] border-2 border-[#5E3411] shadow-inner">
                  {[0, 1].map((drawerIdx) => (
                    <div
                      key={drawerIdx}
                      onClick={handleOpenWardrobe}
                      className="relative flex-1 w-full rounded-[7px] flex items-center justify-center overflow-hidden cursor-pointer group"
                      style={{
                        background:
                          'linear-gradient(180deg, #C68B52 0%, #B1763D 54%, #975F2A 100%)',
                        boxShadow:
                          'inset 2px 2px 4px rgba(255,235,205,0.5), inset -2px -3px 5px rgba(75,38,10,0.6)',
                      }}
                    >
                      {/* Horizontal Wood Grain SVG Lines on Drawer */}
                      <svg
                        viewBox="0 0 360 65"
                        className="pointer-events-none absolute inset-0 w-full h-full opacity-35"
                        preserveAspectRatio="none"
                      >
                        <path
                          d={
                            drawerIdx === 0
                              ? 'M 0 14 Q 110 8, 220 16 T 360 12 M 0 32 Q 140 26, 260 35 T 360 30 M 0 50 Q 95 56, 210 48 T 360 52'
                              : 'M 0 16 Q 130 22, 240 12 T 360 18 M 0 34 Q 100 28, 220 38 T 360 32 M 0 52 Q 150 46, 270 54 T 360 49'
                          }
                          stroke="#6E3D14"
                          strokeWidth="1.5"
                          fill="none"
                        />
                      </svg>

                      {/* Inner Drawer Bevel Highlight */}
                      <div className="pointer-events-none absolute inset-1 rounded-[5px] border border-amber-100/20" />

                      {/* Centered Round 3D Wooden Knob on Each Drawer */}
                      <div
                        className="relative z-10 w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-[#5A3210] group-hover:scale-110 transition-transform"
                        style={{
                          background:
                            'radial-gradient(circle at 35% 30%, #ECC08D 0%, #BD7F42 55%, #744115 100%)',
                          boxShadow:
                            '0 3px 6px rgba(45,20,4,0.7), inset 0 1px 2px rgba(255,242,220,0.65)',
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Bottom Recessed Wooden Base Plinth / Foot */}
              <div
                className="w-[91%] h-3.5 sm:h-4 rounded-b-[10px] border-x-2 border-b-2 border-[#4A270B] relative z-10"
                style={{
                  background:
                    'linear-gradient(180deg, #6E3E16 0%, #8B5323 50%, #58300F 100%)',
                  boxShadow: '0 18px 36px rgba(0,0,0,0.9)',
                }}
              />
            </motion.div>
          )}

          {/* STAGE 2: Smooth Transition to Login / Registration Inside the Opened Wardrobe */}
          {stage === 'auth_ready' && (
            <motion.div
              key="auth-vault-panel"
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-30 w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 rounded-2xl overflow-hidden border border-white/15 bg-theme-canvas text-[#18181B] shadow-[0_32px_96px_rgba(0,0,0,0.75)]"
            >
              {/* Left Column: Security Architecture & OTP Verification Notes */}
              <div className="lg:col-span-5 bg-theme-surface p-6 sm:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-stone-200/80">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-theme-primary">
                      Cổng Xác Thực Bảo Mật
                    </span>
                    <button
                      type="button"
                      onClick={() => setStage('closed')}
                      className="text-xs font-medium text-stone-700 hover:text-stone-900 underline cursor-pointer"
                    >
                      Đóng tủ & Xem lại
                    </button>
                  </div>

                  <h1 className="font-serif-display text-3xl sm:text-4xl font-bold text-stone-900 mt-2 leading-tight">
                    Không Gian Thử Đồ Cá Nhân Hóa
                  </h1>
                  <p className="text-xs sm:text-sm text-stone-600 mt-2 leading-relaxed">
                    Đăng nhập hoặc đăng ký tài khoản để lưu thông số cơ thể và trải nghiệm phối đồ thực tế tăng cường AR.
                  </p>

                  {/* Detailed Security & Verification Steps Box */}
                  <div className="mt-5 rounded-xl bg-white/95 border border-stone-200/90 p-4 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setShowSecurityGuide(!showSecurityGuide)}
                      className="w-full flex items-center justify-between text-left font-semibold text-xs text-stone-900 cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span>Quy trình xác thực bảo mật 3 bước (Ghi chú hệ thống)</span>
                      </span>
                      <span className="text-[11px] text-theme-primary underline">
                        {showSecurityGuide ? 'Thu gọn' : 'Xem chi tiết'}
                      </span>
                    </button>

                    {showSecurityGuide && (
                      <ol className="mt-3 space-y-2.5 text-xs text-stone-600 leading-relaxed">
                        <li>
                          <strong className="text-stone-900">Bước 1 · Định danh Gmail / SĐT:</strong> Hệ thống kiểm tra định dạng hợp lệ của địa chỉ Gmail hoặc Số điện thoại người dùng nhập vào để chống giả mạo tài khoản.
                        </li>
                        <li>
                          <strong className="text-stone-900">Bước 2 · Cấp & Xác thực mã OTP 6 số:</strong> Gửi mã OTP một lần (One-Time Password) về kênh liên hệ đã đăng ký. Người dùng nhập đúng mã OTP để chứng minh quyền sở hữu trước khi kích hoạt.
                        </li>
                        <li>
                          <strong className="text-stone-900">Bước 3 · Khởi tạo mật khẩu băm SHA-256 & Lưu Cloud:</strong> Mật khẩu được băm bảo mật (SHA-256) và cô lập thông tin nhạy cảm (PII) trên Firestore. Từ lần đăng nhập sau, hệ thống tự động nhớ Gmail/SĐT để bạn chỉ cần nhập mật khẩu vào thẳng tủ đồ.
                        </li>
                      </ol>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Interactive Login / Registration Form */}
              <div className="lg:col-span-7 p-6 sm:p-8 bg-theme-canvas flex flex-col justify-between">
                <div>
                  {/* Segmented Mode Switch: Đăng nhập vs Đăng ký */}
                  <div className="flex items-center gap-1 p-1 bg-stone-200/80 rounded-lg mb-6">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthTab('login');
                        setStatusMessage(null);
                      }}
                      className={`flex-1 py-2 px-4 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                        authTab === 'login'
                          ? 'bg-white text-stone-900 shadow-sm'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      Đăng nhập (Đã có tài khoản)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthTab('register');
                        setRegStep(1);
                        setStatusMessage(null);
                      }}
                      className={`flex-1 py-2 px-4 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                        authTab === 'register'
                          ? 'bg-white text-stone-900 shadow-sm'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      Đăng ký mới (Xác thực OTP)
                    </button>
                  </div>

                  {/* Status / Email Dispatch Notification Banner (Never displays raw OTP on UI) */}
                  {statusMessage && (
                    <div
                      className={`mb-5 p-3.5 rounded-lg border text-xs leading-relaxed flex items-start gap-2.5 ${
                        statusMessage.type === 'error'
                          ? 'bg-red-50 border-red-200 text-red-900'
                          : statusMessage.type === 'success'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : 'bg-amber-50 border-amber-300 text-amber-950'
                      }`}
                    >
                      <Info className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p>{statusMessage.text}</p>
                      </div>
                    </div>
                  )}

                  {/* LOGIN VIEW */}
                  {authTab === 'login' ? (
                    <form onSubmit={handleStandardLogin} className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-stone-700 mb-1.5">
                          Gmail hoặc Số điện thoại đã đăng ký
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={contactInput}
                            onChange={(e) => setContactInput(e.target.value)}
                            placeholder="nhap@gmail.com hoặc 0912345678"
                            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-stone-900 text-stone-900"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-stone-700 mb-1.5">
                          Mật khẩu
                        </label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={passwordInput}
                            onChange={(e) => setPasswordInput(e.target.value)}
                            placeholder="Nhập mật khẩu của bạn"
                            className="w-full pl-10 pr-10 py-2.5 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-stone-900 text-stone-900"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-2.5 px-4 bg-theme-primary text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <span>Vào Tủ Đồ Thông Minh</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </form>
                  ) : (
                    /* REGISTER VIEW (3-Step OTP via Gmail + Password Flow) */
                    <div>
                      <div className="flex items-center justify-between text-xs text-stone-500 mb-5 pb-3 border-b border-stone-200">
                        <span className={regStep >= 1 ? 'font-semibold text-stone-900' : ''}>
                          01. Nhập Gmail
                        </span>
                        <span>·</span>
                        <span className={regStep >= 2 ? 'font-semibold text-stone-900' : ''}>
                          02. Xác nhận OTP qua Gmail
                        </span>
                        <span>·</span>
                        <span className={regStep >= 3 ? 'font-semibold text-stone-900' : ''}>
                          03. Tạo mật khẩu
                        </span>
                      </div>

                      {regStep === 1 && (
                        <form onSubmit={handleSendOtp} className="space-y-4">
                          <div>
                            <label className="block text-xs font-medium text-stone-700 mb-1.5">
                              Tên hiển thị của bạn
                            </label>
                            <input
                              type="text"
                              value={displayNameInput}
                              onChange={(e) => setDisplayNameInput(e.target.value)}
                              placeholder="VD: Minh Anh"
                              className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-stone-900 text-stone-900"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-stone-700 mb-1.5">
                              Địa chỉ Gmail nhận mã xác thực OTP
                            </label>
                            <div className="relative">
                              <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                              <input
                                type="email"
                                value={contactInput}
                                onChange={(e) => setContactInput(e.target.value)}
                                placeholder="tenban@gmail.com"
                                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-stone-900 text-stone-900"
                                required
                              />
                            </div>
                          </div>

                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-2.5 px-4 bg-theme-primary text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            {isSubmitting ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <KeyRound className="w-4 h-4" />
                            )}
                            <span>{isSubmitting ? 'Đang gửi mã OTP về Gmail...' : 'Gửi Mã OTP Về Gmail'}</span>
                          </button>
                        </form>
                      )}

                      {regStep === 2 && (
                        <form onSubmit={handleVerifyOtp} className="space-y-4">
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="block text-xs font-medium text-stone-700">
                                Nhập mã OTP (6 chữ số đã gửi về hộp thư {contactInput})
                              </label>
                              <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={() => handleSendOtp()}
                                className="text-xs font-semibold text-theme-primary hover:underline cursor-pointer disabled:opacity-50"
                              >
                                Gửi lại mã
                              </button>
                            </div>
                            <input
                              type="text"
                              maxLength={6}
                              value={otpInput}
                              onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                              placeholder="••••••"
                              className="w-full px-4 py-3 text-center font-mono-tabular text-lg tracking-[0.5em] font-semibold bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-stone-900 text-stone-900"
                              required
                            />
                            <p className="mt-1.5 text-[11px] text-stone-500">
                              Hãy kiểm tra Hộp thư đến (Inbox) hoặc mục Thư rác (Spam) trên Gmail của bạn để lấy mã 6 số.
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setRegStep(1)}
                              className="py-2.5 px-4 text-xs font-medium text-stone-700 border border-stone-300 rounded-lg hover:bg-stone-100 cursor-pointer"
                            >
                              Đổi Gmail
                            </button>
                            <button
                              type="submit"
                              disabled={isSubmitting}
                              className="flex-1 py-2.5 px-4 bg-theme-primary text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                              {isSubmitting ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-4 h-4" />
                              )}
                              <span>Xác Nhận Mã OTP</span>
                            </button>
                          </div>
                        </form>
                      )}

                      {regStep === 3 && (
                        <form onSubmit={handleCompleteRegistration} className="space-y-4">
                          <div>
                            <label className="block text-xs font-medium text-stone-700 mb-1.5">
                              Tạo mật khẩu đăng nhập (Tối thiểu 6 ký tự)
                            </label>
                            <input
                              type={showPassword ? 'text' : 'password'}
                              value={passwordInput}
                              onChange={(e) => setPasswordInput(e.target.value)}
                              placeholder="Nhập mật khẩu mới"
                              className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-stone-900 text-stone-900"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-stone-700 mb-1.5">
                              Xác nhận lại mật khẩu
                            </label>
                            <input
                              type={showPassword ? 'text' : 'password'}
                              value={confirmPasswordInput}
                              onChange={(e) => setConfirmPasswordInput(e.target.value)}
                              placeholder="Nhập lại mật khẩu"
                              className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-stone-900 text-stone-900"
                              required
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-2.5 px-4 bg-theme-primary text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            {isSubmitting ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4" />
                            )}
                            <span>Hoàn Tất Đăng Ký & Lưu Thông Tin</span>
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </div>

                {/* Divider & Direct Google Firebase Auth */}
                <div className="mt-6 pt-5 border-t border-stone-200">
                  <p className="text-xs text-stone-500 text-center mb-3">
                    Hoặc xác thực nhanh qua tài khoản Google Firebase
                  </p>
                  <button
                    type="button"
                    onClick={handleGoogleFirebaseLogin}
                    disabled={isSubmitting}
                    className="w-full py-2.5 px-4 bg-white hover:bg-stone-50 text-stone-900 border border-stone-300 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-2.5 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    <span>Tiếp tục với tài khoản Gmail (Google Firebase)</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Quiet Footer */}
      <footer className="relative z-30 px-8 py-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-400 gap-2">
        <span>© 2026 Smart Wardrobe</span>
        <span>Trợ lý Phối đồ AI: Aura · Google Firebase</span>
      </footer>
    </div>
  );
};
