# 🦉 Boho Mentos v2

<div align="center">
  <img src="https://img.shields.io/badge/Version-2.1.0-blueviolet?style=for-the-badge" alt="Version" />
  <img src="https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Vite-6-yellow?style=for-the-badge&logo=vite" alt="Vite" />
  <img src="https://img.shields.io/badge/Firebase-v9-orange?style=for-the-badge&logo=firebase" alt="Firebase" />
  <img src="https://img.shields.io/badge/AI-Gemini%20|%20Groq-green?style=for-the-badge" alt="AI" />
</div>

---

## 🌟 Proje Vizyonu
Boho Mentos v2, YKS (TYT/AYT) hazırlık sürecindeki öğrenciler için tasarlanmış, **Yapay Zeka Destekli (AI Coach)**, **Oyunlaştırılmış (Gamified)** ve **Hiper-Verimlilik (Focus)** odaklı bir akademik yönetim platformudur. Sadece bir ders takip uygulaması değil, öğrencinin psikolojik durumunu, çalışma verimini ve akademik gelişimini takip eden dijital bir "mentör" ekosistemidir.

---

## 🚀 Öne Çıkan Özellikler

### 1. 🧠 AI Coach (Kübra & Diğer Personalar)
- **Çoklu Sağlayıcı (Hybrid AI):** Gemini, Groq ve OpenRouter sağlayıcılarını hata toleranslı (failover) bir mimariyle kullanır.
- **Kontekst Farkındalığı:** Öğrencinin son deneme sonuçlarını, çalışma loglarını ve ruh halini analiz ederek kişiselleştirilmiş tavsiyeler verir.
- **Dinamik Direktifler:** AI, kullanıcı arayüzünü kontrol edebilir (Örn: "Gel sana bir hediye vereyim" diyerek Market'i açabilir).
- **OCR Desteği:** Soru fotoğraflarını analiz edebilir ve çözümler üretebilir.

### 2. 🎮 Oyunlaştırma & Ekonomi
- **Rank Sistemi:** Unranked -> Bronze -> ... -> Immortal -> Radiant.
- **ELO & XP:** Ders çalışma sürelerine, doğru çözülen sorulara ve streak (devamlılık) durumuna göre dinamik puanlama.
- **Crate Shop (Kasa Sistemi):** Kazanılan puanlarla (Boho Coin) temalar, rozetler ve özel AI persona paketleri açılabilir.
- **Global Leaderboard:** Diğer öğrencilerle rekabet.

### 3. 🎯 Focus Tunnel (Odaklanma Tüneli)
- **Ambiyans Kontrolü:** Lofi müzik (Spotify entegre), ambient sesler ve dinamik ışıklandırma.
- **Pomodoro & Deep Work:** Distraction-free çalışma ortamı.
- **Spotify Entegrasyonu:** Çalışma listelerini doğrudan uygulama içinden kontrol etme.

### 4. 📊 Akademik Analiz
- **TYT/AYT Takibi:** Ders bazlı net grafikleri ve gelişim projeksiyonları.
- **Warroom (Savaş Odası):** Canvas tabanlı çizim alanı ile strateji planlama ve karmaşık soruları görselleştirme.
- **Habit Audit:** Alışkanlık takibi ve verimlilik korelasyon analizi.

### 5. 🛠️ Admin & Geliştirici Araçları
- **Admin Dashboard:** Kullanıcı yetkilendirme, global log takibi ve sistem sağlığı izleme.
- **Bootstrap Owner:** .env üzerinden tanımlanan sahibe (Owner) otomatik olarak SuperAdmin yetkisi veren güvenli endpoint.
- **Rate Limiting:** Upstash Redis ile AI API maliyet kontrolü.

---

## 🛠️ Teknik Stack

- **Frontend:** React 18, Vite, TypeScript, TailwindCSS, Motion (Framer).
- **State Management:** Zustand (Slice pattern ile modüler yapı).
- **Backend:** Node.js (Express), Vercel Serverless Functions.
- **Database & Auth:** Firebase (Firestore, Auth, Storage).
- **Caching:** Upstash Redis.
- **AI Engine:** Google Gemini SDK, Groq Cloud API, OpenRouter.

---

## 📦 Kurulum & Çalıştırma

### 1. Depoyu Klonlayın
```bash
git clone https://github.com/Gear2Head/Boho-mentos-v2.git
cd Boho-mentos-v2
```

### 2. Bağımlılıkları Yükleyin
```bash
npm install
```

### 3. Environment (.env) Yapılandırması
Kök dizinde bir `.env` dosyası oluşturun ve aşağıdaki değerleri doldurun:

```env
# AI API Keys
GEMINI_API_KEY="your_key"
GROQ_API_KEY="your_key"
OPENROUTER_API_KEY="your_key"

# Firebase Config (Server Side)
FIREBASE_PROJECT_ID="your_project_id"
FIREBASE_SERVICE_ACCOUNT_BASE64="base64_encoded_json"
OWNER_EMAIL_SHA256="sha256_hash_of_your_email"

# Redis Config
UPSTASH_REDIS_REST_URL="your_url"
UPSTASH_REDIS_REST_TOKEN="your_token"

# Spotify
VITE_SPOTIFY_CLIENT_ID="your_client_id"
SPOTIFY_CLIENT_SECRET="your_secret"
```

### 4. Geliştirme Sunucusunu Başlatın
```bash
npm run dev
```
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:3001`

---

## 📂 Proje Yapısı

```text
├── api/                  # Vercel Serverless Functions (Backend)
│   ├── admin/            # Admin & Yetkilendirme endpointleri
│   └── ai.ts             # Ana AI orkestrasyonu
├── src/
│   ├── components/       # React bileşenleri (Atomic Design benzeri)
│   │   ├── admin/        # Yönetim paneli bileşenleri
│   │   ├── warroom/      # Çizim ve strateji alanı
│   │   └── coach/        # AI Coach arayüzü
│   ├── store/            # Zustand store ve slice'lar
│   ├── services/         # API servisleri (Firebase, Spotify, AI)
│   ├── hooks/            # Custom React hooks
│   └── types/            # TypeScript tip tanımlamaları
├── server.ts             # Yerel geliştirme Express sunucusu
└── tailwind.config.js    # Stil yapılandırması
```

---

## 🔐 Güvenlik & Yetkilendirme
- Uygulama, Firebase Custom Claims kullanarak **SuperAdmin**, **Admin** ve **Student** rollerini yönetir.
- Kritik admin fonksiyonları sadece `super_admin` yetkisine sahip kullanıcılara açıktır.
- API istekleri Upstash Redis üzerinden IP tabanlı rate-limit'e tabidir.

---

## 🤝 Katkıda Bulunma
1. Projeyi fork edin.
2. Yeni bir feature branch açın (`git checkout -b feature/amazing-feature`).
3. Değişikliklerinizi commit edin (`git commit -m 'feat: Add amazing feature'`).
4. Branch'inizi push edin (`git push origin feature/amazing-feature`).
5. Bir Pull Request açın.

---

<div align="center">
  <p>Built with ❤️ for better education by <b>Antigravity</b></p>
</div>
