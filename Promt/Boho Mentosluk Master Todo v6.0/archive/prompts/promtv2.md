# GELIŞTIRICI PANELİ & NAV KOMPAKT — TODO & MİMARİ PROMPT v1.0

    > ** Kapsam:** `App.tsx`(NavItem + activeTab), `AdminPanelModal.tsx`(tam yeniden yazım),
> yeni`developerService.ts`, yeni`useAdminPanel.ts`, Firestore`users` koleksiyonu şeması,
> Firebase Security Rules güncellemesi.
>
> ** UID Tabanlı Süper Admin:** `9z9OAXBXsFU3oPT8AqIxnDSf...`
    > Bu UID dışında hiçbir kullanıcı geliştirici yetkisi talep edemez,
> yetkiyi başkasına veremez veya alamaz.

---

## 0. MEVCUT SORUNLAR — TAM HASAR TESPİTİ

### 0.1 NavItem — Kompaktlık Değil Doğru Layout

    ** İstek:** "Butonları küçült" → Sidebar genişliği değil, butonların içindeki
padding, font - size ve ikon boyutlarının azaltılması.

** Mevcut:**
    ```tsx
// NavItem - desktop'ta ikon + yazı yan yana (flex-row), DOĞRU
// NavItem - mobilde sadece ikon, yazı gizli → YANLIŞ
// Her sayfa için aynı ikonlar (BookOpen tekrarı) → YANLIŞ
// Buton padding py-3 md:py-2.5 → gereksiz büyük
```

    ** Hedef:**
        ```
Masaüstü: [ikon] Yazı          ← flex-row, kompakt padding
Mobil:    [ikon]               ← ikon + yazı alt alta (flex-col), 10px font
           Yazı
```

### 0.2 Admin Panel — Tamamen Sahte

`AdminPanelModal.tsx` şu an:
- `store.isDevMode` toggle → herkese açık
    - `+500 ELO hile` → Kaldırıldı
        - `isMorningBlockerEnabled` → herkese açık
            - UID kontrolü ** YOK ** — herhangi bir kullanıcı`© 2026 Kübra Architecture`
  yazısına tıklayarak açabilir

    ** Güvenlik seviyesi: Sıfır.**

### 0.3 Kullanıcı Yönetimi Sistemi — Mevcut Değil

Hiçbir yerde:
- Kayıtlı kullanıcıların listesi yok
    - UID girip kullanıcı arama yok
        - Rol atama(developer / premium / standard) yok
            - Kullanıcı verisi görüntüleme yok
                - Hesap dondurma / silme yok

---

## 1. SÜPER ADMİN KİMLİK SİSTEMİ

### 1.1 Sabit Kodlanmış Süper Admin UID

    ```typescript
// src/config/admin.ts

export const SUPER_ADMIN_UID = '9z9OAXBXsFU3oPT8AqIxnDSf';

// Bu UID:
// 1. Developer panel erişimi için kontrol edilir
// 2. Diğer kullanıcılara developer yetkisi verebilir
// 3. Developer yetkisi alınamaz (her zaman en üst seviye)
// 4. Firebase Security Rules'ta da hardcode edilir

export type UserRole = 'super_admin' | 'developer' | 'premium' | 'standard' | 'banned';

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 100,
  developer: 80,
  premium: 50,
  standard: 10,
  banned: 0,
};

export function isSuperAdmin(uid: string): boolean {
  return uid === SUPER_ADMIN_UID;
}

export function canManageUser(actorRole: UserRole, targetRole: UserRole): boolean {
  return ROLE_HIERARCHY[actorRole] > ROLE_HIERARCHY[targetRole];
}
```

### 1.2 Firestore `users` Koleksiyonu Şeması

    ```typescript
// Her kullanıcı için /users/{uid} dökümanı

interface FirestoreUser {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: UserRole;
  createdAt: string;          // ISO string
  lastSignedInAt: string;
  eloScore: number;
  streakDays: number;
  totalLogs: number;
  totalExams: number;
  targetUniversity?: string;
  targetMajor?: string;
  examYear?: string;

  // Admin kontrol alanları
  isBanned: boolean;
  banReason?: string;
  bannedAt?: string;
  bannedBy?: string;          // admin UID

  developerGrantedBy?: string; // developer yetkisini veren UID
  developerGrantedAt?: string;

  notes?: string;             // admin notları (kullanıcıya görünmez)
}
```

### 1.3 Firebase Security Rules — Güvenlik Katmanı

    ```javascript
// firestore.rules

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Süper Admin UID — tüm işlemlere tam yetki
    function isSuperAdmin() {
      return request.auth.uid == '9z9OAXBXsFU3oPT8AqIxnDSf';
    }

    // Developer rolü kontrolü
    function isDeveloper() {
      return isSuperAdmin() ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'developer';
    }

    // Kullanıcı kendi verisini yönetir
    match /users/{uid} {
      allow read: if request.auth != null && (request.auth.uid == uid || isDeveloper());
      allow create: if request.auth != null && request.auth.uid == uid;
      // Rol değiştirme sadece developer/superadmin
      allow update: if request.auth != null && (
        (request.auth.uid == uid && !('role' in request.resource.data.diff(resource.data).affectedKeys())) ||
        isDeveloper()
      );
      allow delete: if isSuperAdmin();
    }

    // Kullanıcıların uygulama verileri
    match /userData/{uid} {
      allow read, write: if request.auth != null &&
        (request.auth.uid == uid || isDeveloper()) &&
        !get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isBanned;
    }

    // Admin log kayıtları — sadece developer okur
    match /adminLogs/{logId} {
      allow read: if isDeveloper();
      allow write: if isDeveloper();
    }
  }
}
```

---

## 2. NAVİGASYON — KOMPAKT & MOBİL - FIRST YENİDEN YAZIM

### 2.1 İkon Haritası — Her Sayfaya Özel

    ```typescript
// src/config/navItems.ts

import {
  LayoutDashboard, MessageSquare, Target, Swords,
  BrainCircuit, BookOpen, BarChart2, List,
  CalendarDays, Archive, Map, Telescope,
  Settings, UserCircle, Clock
} from 'lucide-react';

export interface NavItemConfig {
  id: ActiveTab;
  label: string;
  icon: React.ReactNode;
  mobileVisible: boolean;   // Mobil alt bar'da göster
  desktopVisible: boolean;
}

export const NAV_ITEMS: NavItemConfig[] = [
  { id: 'dashboard',  label: 'Ana Sayfa',  icon: <LayoutDashboard size={16} />, mobileVisible: true,  desktopVisible: true  },
  { id: 'coach',      label: 'Koç',        icon: <MessageSquare    size={16} />, mobileVisible: true,  desktopVisible: true  },
  { id: 'countdown',  label: 'Sayaç',      icon: <Clock            size={16} />, mobileVisible: true,  desktopVisible: true  },
  { id: 'war_room',   label: 'Savaş',      icon: <Swords           size={16} />, mobileVisible: true,  desktopVisible: true  },
  { id: 'questions',  label: 'Quiz',       icon: <BrainCircuit     size={16} />, mobileVisible: false, desktopVisible: true  },
  { id: 'explain',    label: 'Anlatım',    icon: <BookOpen         size={16} />, mobileVisible: false, desktopVisible: true  },
  { id: 'exams',      label: 'Deneme',     icon: <BarChart2        size={16} />, mobileVisible: false, desktopVisible: true  },
  { id: 'logs',       label: 'Loglar',     icon: <List             size={16} />, mobileVisible: false, desktopVisible: true  },
  { id: 'agenda',     label: 'Ajanda',     icon: <CalendarDays     size={16} />, mobileVisible: false, desktopVisible: true  },
  { id: 'archive',    label: 'Mezarlık',   icon: <Archive          size={16} />, mobileVisible: false, desktopVisible: true  },
  { id: 'subjects',   label: 'Müfredat',   icon: <Map              size={16} />, mobileVisible: false, desktopVisible: true  },
  { id: 'strategy',   label: 'Strateji',   icon: <Telescope        size={16} />, mobileVisible: false, desktopVisible: true  },
  { id: 'settings',   label: 'Ayarlar',    icon: <Settings         size={16} />, mobileVisible: false, desktopVisible: true  },
  { id: 'profile',    label: 'Profil',     icon: <UserCircle       size={16} />, mobileVisible: true,  desktopVisible: true  },
];

// ActiveTab union type — tüm id'leri içermeli
export type ActiveTab =
  | 'dashboard' | 'coach' | 'countdown' | 'war_room'
  | 'questions' | 'explain' | 'exams' | 'logs'
  | 'agenda' | 'archive' | 'subjects' | 'strategy'
  | 'settings' | 'profile';
```

### 2.2 NavItem Bileşeni — Kompakt & Responsive

    ```tsx
// src/components/NavItem.tsx

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  collapsed?: boolean;        // Sidebar collapse modu (opsiyonel ileri faz)
}

export const NavItem: React.FC<NavItemProps> = ({
  icon, label, active, onClick
}) => (
  <button
    onClick={onClick}
    className={`
      relative flex items - center w - full transition - all duration - 150 select - none
/* Masaüstü: ikon + yazı yan yana, kompakt padding */
md: flex - row md: gap - 2.5 md: px - 4 md: py - 2 md: rounded - lg md: mx - 2 md: w - [calc(100 % -16px)]
/* Mobil: ikon üstte + yazı altta, ortalı */
flex - col gap - 0.5 px - 1 py - 2 flex - 1
      /* Aktif renk */
      ${
    active
        ? 'text-[#C17767] md:bg-[#C17767]/10 md:border-l-2 md:border-[#C17767]'
        : 'text-zinc-500 hover:text-zinc-300 md:hover:bg-zinc-800/50'
}
`}
  >
    {/* Mobil aktif göstergesi */}
    {active && (
      <span className="md:hidden absolute top-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-[#C17767] rounded-b-full" />
    )}

    {/* İkon */}
    <span className={`transition - transform duration - 150 ${ active ? 'scale-110' : '' } `}>
      {icon}
    </span>

    {/* Yazı — masaüstünde normal, mobilde küçük */}
    <span className="
      font-bold tracking-wider uppercase leading-none
      text-[9px] md:text-[10px]
      md:tracking-widest
    ">
      {label}
    </span>
  </button>
);
```

### 2.3 Sidebar Padding & Boyut Güncellemeleri

    ```tsx
// App.tsx — nav bölümü güncellemesi

// MEVCUT:
<nav className="... md:w-56 ...">

// HEDEF:
<nav className="
  fixed bottom-0 left-0 right-0
  md:bottom-auto md:left-auto md:right-auto md:relative md:w-48
  border-t md:border-t-0 md:border-r border-[#EAE6DF] dark:border-zinc-800
  flex flex-row md:flex-col
  bg-white/95 dark:bg-zinc-950/95
  backdrop-blur-xl z-[90]
  pb-[env(safe-area-inset-bottom)]
">
  {/* Header — sadece masaüstü */}
  <div className="hidden md:block px-4 py-3 border-b border-[#EAE6DF] dark:border-zinc-800">
    <h1 className="font-serif italic text-base font-bold text-[#C17767]">Boho Mentosluk</h1>
    <p className="text-[9px] uppercase tracking-widest opacity-40 mt-0.5">YKS OS v5</p>
  </div>

  {/* Nav Items */}
  <div className="flex-1 flex flex-row md:flex-col py-1 md:py-3 md:gap-0.5 justify-around md:justify-start overflow-x-auto md:overflow-visible no-scrollbar">
    {/* Mobilde: sadece mobileVisible olanlar */}
    {/* Masaüstünde: tümü */}
  </div>

  {/* Admin trigger — sadece süper admin görür */}
  {isSuperAdmin(currentUser?.uid) && (
    <div
      className="hidden md:block px-4 py-3 border-t border-zinc-800 cursor-pointer opacity-20 hover:opacity-100 transition-opacity text-[9px] uppercase tracking-widest text-zinc-400"
      onClick={() => setIsAdminPanelOpen(true)}
    >
      ⬡ Dev Console
    </div>
  )}
</nav>
```

### 2.4 Mobil "Daha Fazla" Drawer

    ```tsx
// Mobil alt bar'da 5. buton olarak "Daha Fazla" eklenir
// Tıklayınca BottomSheet açılır, gizli sayfalar listesi gösterilir

// Geçici alert() yerine gerçek bottom sheet:
const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

// Bottom sheet içinde: Anlatım, Deneme, Loglar, Ajanda,
// Mezarlık, Müfredat, Strateji, Ayarlar
```

---

## 3. GELİŞTİRİCİ PANELİ — TAM YENİDEN YAZIM

### 3.1 Erişim Kontrolü — Tek Satır Kural

    ```typescript
// AdminPanelModal'ın ilk satırı:

const { currentUser } = useAuth();
if (!currentUser || !isSuperAdmin(currentUser.uid)) return null;

// Bu kontrol olmadan modal render bile edilmez.
// © footer'a tıklama yerine: sadece authenticated + UID eşleşmesi açar.
```

### 3.2 Panel Sekme Yapısı

    ```
AdminPanelModal
├── Tab 1: Kullanıcı Yönetimi    ← UID arama, rol atama, listeleme
├── Tab 2: Sistem Sağlığı        ← Firestore kullanım, hata logları
├── Tab 3: İçerik Yönetimi       ← Duyuru, global mesaj, soru bankası
├── Tab 4: Geliştirici Araçları  ← ELO hile, sabah kilidi, sıfırlama
└── Tab 5: Audit Log             ← Kim ne zaman ne yaptı
```

### 3.3 Tab 1 — Kullanıcı Yönetimi

#### 3.3.1 UID ile Kullanıcı Arama

    ```tsx
// src/components/admin/UserSearchPanel.tsx

interface UserSearchPanelProps {
  onSelectUser: (user: FirestoreUser) => void;
}

// Özellikler:
// - UID veya email ile arama inputu
// - Firestore /users koleksiyonunda where() sorgusu
// - Sonuçlar: Avatar, İsim, Email, Rol badge, ELO, Son giriş
// - Her kullanıcı satırına tıklayınca UserDetailPanel açılır

const searchUser = async (query: string) => {
  // UID ile tam eşleşme
  if (query.length > 20) {
    const doc = await getDoc(doc(db, 'users', query));
    if (doc.exists()) return [doc.data() as FirestoreUser];
  }
  // Email ile prefix arama
  const q = query(
    collection(db, 'users'),
    where('email', '>=', query),
    where('email', '<=', query + '\uf8ff'),
    limit(10)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as FirestoreUser);
};
```

#### 3.3.2 Kullanıcı Detay Paneli

    ```tsx
// src/components/admin/UserDetailPanel.tsx

// Gösterilecekler:
// ┌─────────────────────────────────────────┐
// │ [Avatar]  senerkadiralper@gmail.com     │
// │           UID: 9z9OAX...               │
// │           Oluşturulma: Mar 31, 2026     │
// ├─────────────────────────────────────────┤
// │ Rol: [standard ▼]  ← dropdown          │
// │ ELO: 1200                              │
// │ Seri: 0 gün                            │
// │ Toplam Log: 0                           │
// │ Toplam Deneme: 0                        │
// │ Hedef: — / —                           │
// ├─────────────────────────────────────────┤
// │ Admin Notu: [textarea]                  │
// ├─────────────────────────────────────────┤
// │ [Developer Ver] [Premium Ver]           │
// │ [Developer Al]  [Hesabı Dondur]        │
// │ [Veriyi Görüntüle] [Hesabı Sil]        │
// └─────────────────────────────────────────┘

// Hesabı Sil: Sadece super_admin yapabilir (isSuperAdmin check)
// Developer Ver/Al: developer rolündekiler de yapabilir (canManageUser check)
```

#### 3.3.3 Rol Yönetimi Fonksiyonları

    ```typescript
// src/services/developerService.ts

import { doc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { SUPER_ADMIN_UID, canManageUser, isSuperAdmin } from '../config/admin';

interface AdminAction {
  actorUid: string;
  actorRole: UserRole;
  targetUid: string;
  action: 'grant_developer' | 'revoke_developer' | 'grant_premium' | 'revoke_premium' | 'ban' | 'unban' | 'delete';
  reason?: string;
}

async function logAdminAction(action: AdminAction) {
  await addDoc(collection(db, 'adminLogs'), {
    ...action,
    timestamp: serverTimestamp(),
  });
}

export async function grantDeveloper(
  actorUid: string,
  actorRole: UserRole,
  targetUid: string
): Promise<{ success: boolean; error?: string }> {
  // Süper admin kendini yönetemez (zaten en yüksek)
  if (targetUid === SUPER_ADMIN_UID) {
    return { success: false, error: 'Süper admin rolü değiştirilemez.' };
  }
  // Aktör developer verebilecek seviyede mi?
  if (!canManageUser(actorRole, 'developer')) {
    return { success: false, error: 'Bu işlem için yetkiniz yok.' };
  }

  await updateDoc(doc(db, 'users', targetUid), {
    role: 'developer',
    developerGrantedBy: actorUid,
    developerGrantedAt: new Date().toISOString(),
  });

  await logAdminAction({
    actorUid, actorRole, targetUid,
    action: 'grant_developer',
  });

  return { success: true };
}

export async function revokeDeveloper(
  actorUid: string,
  actorRole: UserRole,
  targetUid: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSuperAdmin(actorUid)) {
    return { success: false, error: 'Developer yetkisi sadece süper admin tarafından alınabilir.' };
  }
  await updateDoc(doc(db, 'users', targetUid), {
    role: 'standard',
    developerGrantedBy: null,
    developerGrantedAt: null,
  });
  await logAdminAction({ actorUid, actorRole, targetUid, action: 'revoke_developer' });
  return { success: true };
}

export async function banUser(
  actorUid: string,
  actorRole: UserRole,
  targetUid: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  if (!canManageUser(actorRole, 'standard')) {
    return { success: false, error: 'Yetki yetersiz.' };
  }
  await updateDoc(doc(db, 'users', targetUid), {
    isBanned: true,
    banReason: reason,
    bannedAt: new Date().toISOString(),
    bannedBy: actorUid,
  });
  await logAdminAction({ actorUid, actorRole, targetUid, action: 'ban', reason });
  return { success: true };
}

export async function getAllUsers(limit = 50): Promise<FirestoreUser[]> {
  const snap = await getDocs(
    query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(limit))
  );
  return snap.docs.map(d => d.data() as FirestoreUser);
}

export async function getUserByUID(uid: string): Promise<FirestoreUser | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as FirestoreUser) : null;
}

export async function updateAdminNote(
  targetUid: string,
  note: string
): Promise<void> {
  await updateDoc(doc(db, 'users', targetUid), { notes: note });
}
```

### 3.4 Tab 2 — Sistem Sağlığı

    ```tsx
// src/components/admin/SystemHealthPanel.tsx

// Gösterilecekler:
// - Firestore günlük okuma/yazma sayacı (quotaUsage)
// - Aktif kullanıcı sayısı (son 7 günde giriş yapan)
// - Son 10 hata logu (adminLogs'dan type:'error' olanlar)
// - Firebase Auth kullanıcı toplamı (REST API ile)
// - War Room seans sayısı (son 24 saat)

interface SystemStats {
  totalUsers: number;
  activeUsersLast7Days: number;
  totalLogsToday: number;
  firestoreWritesToday: number;
  warRoomSessionsToday: number;
  errorCount: number;
}
```

### 3.5 Tab 3 — İçerik Yönetimi

    ```tsx
// Özellikler:
// - Global duyuru mesajı (tüm kullanıcılarda banner gösterir)
// - Motivasyon quote havuzu (MorningBlocker için AI'a verilir)
// - Soru bankası manuel ekleme (WarRoom için)
// - Bakım modu toggle (tüm kullanıcıları kilitler, sadece admin girer)

interface GlobalAnnouncement {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'success';
  expiresAt: string;
  createdBy: string;
  isActive: boolean;
}
```

### 3.6 Tab 4 — Geliştirici Araçları(Mevcut + Yeni)

    ```tsx
// MEVCUT TUTULACAKLAR:
// ✓ Dev Mode toggle (exam sil/düzenle)
// ✓ Sabah kilidi toggle
// ✓ +500 ELO hile

// YENİ EKLENECEKLER:
// - Belirli kullanıcıya ELO enjekte et (UID + miktar)
// - Tüm kullanıcıların log geçmişini temizle (tehlikeli - confirm x2)
// - Mock soru paketi yükle (internet olmadan War Room test)
// - Firebase cache invalidate
// - Console'a tüm store dump et
// - Theme force override (tüm kullanıcılar için)
```

### 3.7 Tab 5 — Audit Log

    ```tsx
// src/components/admin/AuditLogPanel.tsx

// Firestore /adminLogs koleksiyonundan son 100 kayıt
// Her kayıt:
// - Tarih/saat
// - Aktör: [Avatar] email
// - İşlem: "Developer yetkisi verildi"
// - Hedef: targetUid (kısaltılmış)
// - Sebep (varsa)

// Filtreleme: İşlem türüne göre
// Dışa aktarma: JSON download
```

---

## 4. `useAdminPanel.ts` HOOK'U

    ```typescript
// src/hooks/useAdminPanel.ts

import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { isSuperAdmin } from '../config/admin';
import * as developerService from '../services/developerService';
import type { FirestoreUser, UserRole } from '../types';

export function useAdminPanel() {
  const { currentUser } = useAuth();
  const [searchResults, setSearchResults] = useState<FirestoreUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<FirestoreUser | null>(null);
  const [allUsers, setAllUsers] = useState<FirestoreUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Yetki kontrolü — hook'u kullanan her bileşen için erken çıkış
  const hasAccess = currentUser && isSuperAdmin(currentUser.uid);

  const searchUsers = useCallback(async (query: string) => {
    if (!hasAccess || query.length < 3) return;
    setIsSearching(true);
    try {
      const results = await developerService.searchUsers(query);
      setSearchResults(results);
    } catch (e) {
      setError('Arama başarısız.');
    } finally {
      setIsSearching(false);
    }
  }, [hasAccess]);

  const loadAllUsers = useCallback(async () => {
    if (!hasAccess) return;
    const users = await developerService.getAllUsers(100);
    setAllUsers(users);
  }, [hasAccess]);

  const performAction = useCallback(async (
    action: 'grant_developer' | 'revoke_developer' | 'grant_premium' | 'ban' | 'unban',
    targetUid: string,
    reason?: string
  ) => {
    if (!hasAccess || !currentUser) return;
    setActionLoading(true);
    setError(null);

    const actorRole: UserRole = 'super_admin';

    const handlers = {
      grant_developer: () => developerService.grantDeveloper(currentUser.uid, actorRole, targetUid),
      revoke_developer: () => developerService.revokeDeveloper(currentUser.uid, actorRole, targetUid),
      grant_premium: () => developerService.grantPremium(currentUser.uid, actorRole, targetUid),
      ban: () => developerService.banUser(currentUser.uid, actorRole, targetUid, reason ?? ''),
      unban: () => developerService.unbanUser(currentUser.uid, actorRole, targetUid),
    };

    const result = await handlers[action]();
    if (result.success) {
      setSuccessMsg('İşlem başarılı.');
      // Seçili kullanıcıyı güncelle
      if (selectedUser?.uid === targetUid) {
        const updated = await developerService.getUserByUID(targetUid);
        setSelectedUser(updated);
      }
    } else {
      setError(result.error ?? 'Bilinmeyen hata.');
    }
    setActionLoading(false);
  }, [hasAccess, currentUser, selectedUser]);

  return {
    hasAccess,
    searchResults,
    selectedUser,
    setSelectedUser,
    allUsers,
    isSearching,
    actionLoading,
    error,
    successMsg,
    searchUsers,
    loadAllUsers,
    performAction,
  };
}
```

---

## 5. UYGULAMA SIRASI(PRİORİTY QUEUE)

    ```
FAZ 1 — GÜVENLIK & TEMELİ ATMA (Önce Bunlar)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
□ src/config/admin.ts oluştur (SUPER_ADMIN_UID sabit)
□ AdminPanelModal'a UID kontrolü ekle — yetkisiz render etme
□ Firestore Security Rules güncelle (Section 1.3)
□ Mevcut AdminPanelModal'ın "herkese açık" açılma mantığını kapat
□ © footer tıklamasını isSuperAdmin() kontrolüne bağla

FAZI TAMAMLAMA KRİTERİ:
  - Farklı bir Google hesabıyla giriş yapıldığında
    admin modal hiçbir koşulda açılamıyor.

FAZ 2 — NAVİGASYON KOMPAKT
━━━━━━━━━━━━━━━━━━━━━━━━━━━
□ src/config/navItems.ts oluştur
□ NavItem bileşenini yeniden yaz (Section 2.2)
□ Her sayfaya özel ikon ata (BookOpen tekrarları kaldır)
□ ActiveTab union type'ını navItems.ts'den türet
□ Mobil alt bar: sadece mobileVisible:true olanlar
□ Masaüstü: tüm nav items, kompakt padding
□ "Daha Fazla" butonu + BottomSheet (mobil gizli sayfalar)
□ Sidebar header font küçült (text-base)

FAZI TAMAMLAMA KRİTERİ:
  - Mobilde her butonun altında açıklayıcı yazı var
  - İkon boyutları 16px, padding py-2
  - BookOpen tekrarı yok

FAZ 3 — KULLANICI YÖNETİMİ BACKEND
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
□ Firestore /users koleksiyon şemasını kur
□ Auth kaydında /users/{uid} dökümanı otomatik oluştur
□ developerService.ts yaz (Section 3.3.3)
□ useAdminPanel.ts hook'unu yaz (Section 4)
□ adminLogs koleksiyonuna write entegre et

FAZI TAMAMLAMA KRİTERİ:
  - UID girince kullanıcı bilgileri geliyor
  - Rol atama çalışıyor ve Firestore'a yazılıyor
  - Her işlem adminLogs'a kaydediliyor

FAZ 4 — ADMİN PANELİ UI
━━━━━━━━━━━━━━━━━━━━━━━━
□ AdminPanelModal'ı sekme yapısına geçir (5 tab)
□ Tab 1: UserSearchPanel + UserDetailPanel
□ Tab 2: SystemHealthPanel
□ Tab 3: ContentManagementPanel
□ Tab 4: Mevcut araçlar + yenileri
□ Tab 5: AuditLogPanel

FAZI TAMAMLAMA KRİTERİ:
  - UID ile kullanıcı aranabiliyor
  - Developer yetkisi verilebiliyor/alınabiliyor
  - Her işlem audit log'a düşüyor

FAZ 5 — POLISH & EDGE CASES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
□ Banlı kullanıcı login olunca bilgilendirici ekran
□ Developer yetkisi olan kullanıcı için özel UI badge
□ Admin panel açıkken ESC ile kapanma
□ Tüm admin işlemlerinde double-confirm (tehlikeli işlemler)
□ Rate limiting: aynı UID'ye 1 dk içinde 10'dan fazla işlem engellensin
```

---

## 6. DOĞRULAMA KRİTERLERİ

    ```
GENEL GÜVENLİK:
[ ] senerkadiralper@gmail dışı hesapla giriş → admin modal gözükmez
[ ] Admin modal URL'den açılamaz
[ ] Firestore'a doğrudan rol yazma → Security Rules reddeder
[ ] Developer kullanıcı süper admin rolü veremez

NAVİGASYON:
[ ] Masaüstünde tüm sayfalar sidebar'da görünür
[ ] Mobilde sadece 5 ana sayfa + "Daha Fazla" buton
[ ] Her sayfanın kendine özgü ikonu var
[ ] Aktif sayfa ikonu scale(1.1) + renk değişimi

KULLANICI YÖNETİMİ:
[ ] UID 9z9OAX... developer yetkisi verebilir
[ ] Developer yetkisi olan kullanıcı yeni developer atayabilir
[ ] Developer, başka bir developer'ın yetkisini alamaz (sadece super_admin)
[ ] Ban işlemi anında etkili — banlı kullanıcı veri yazamaz
[ ] Tüm işlemler adminLogs'a tarih/aktör/hedef ile yazılır
```

---

## 7. DOSYA DEĞİŞİKLİK MATRİSİ

    | Dosya | İşlem | Öncelik |
| ---| ---| ---|
| `src/config/admin.ts` | CREATE | 🔴 P0 |
| `firestore.rules` | MODIFY | 🔴 P0 |
| `src/components/AdminPanelModal.tsx` | REWRITE | 🔴 P0 |
| `src/config/navItems.ts` | CREATE | 🟡 P1 |
| `src/components/NavItem.tsx` | REWRITE | 🟡 P1 |
| `src/App.tsx` | MODIFY | 🟡 P1 |
| `src/types/index.ts` | MODIFY | 🟡 P1 |
| `src/services/developerService.ts` | CREATE | 🟠 P2 |
| `src/hooks/useAdminPanel.ts` | CREATE | 🟠 P2 |
| `src/components/admin/UserSearchPanel.tsx` | CREATE | 🟠 P2 |
| `src/components/admin/UserDetailPanel.tsx` | CREATE | 🟠 P2 |
| `src/components/admin/SystemHealthPanel.tsx` | CREATE | 🟢 P3 |
| `src/components/admin/ContentManagementPanel.tsx` | CREATE | 🟢 P3 |
| `src/components/admin/AuditLogPanel.tsx` | CREATE | 🟢 P3 |

    ---

* Son güncelleme: v1.0 — UID tabanlı süper admin, kullanıcı yönetimi,
    nav kompakt yeniden yazım, Firestore Security Rules, Audit Log sistemi *