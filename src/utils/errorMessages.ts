/**
 * AMAÇ: Kullanıcıya gösterilen hata mesajlarını Türkçeleştir.
 * MANTIK: Teknik hata kodu → kullanıcı dostu Türkçe mesaj haritası.
 * UYARI: [UX-005 FIX]: Raw server error kodu/mesajı UI'a sızmaz.
 */

/** AI/API hata kodları → Türkçe kullanıcı mesajı */
const AI_ERROR_MAP: Record<string, string> = {
  RATE_LIMITED: 'Kübra şu an çok yoğun. 30 saniye bekleyip tekrar yaz.',
  ALL_PROVIDERS_FAILED: 'Tüm AI hatları meşgul. Biraz bekleyip tekrar dene.',
  AI_SERVER_ERROR: 'Sunucu yanıt vermedi. Bağlantını kontrol et veya biraz sonra dene.',
  INVALID_JSON: 'İstek formatı hatalı. Sayfayı yenile.',
  METHOD_NOT_ALLOWED: 'İzin verilmeyen işlem.',
  NETWORK_ERROR: 'Bağlantı hatası. İnternet bağlantını kontrol et.',
  TIMEOUT: 'Yanıt çok uzun sürdü. Biraz sonra tekrar dene.',
};

/** HTTP durum kodu → Türkçe kullanıcı mesajı */
const HTTP_STATUS_MAP: Record<number, string> = {
  400: 'Geçersiz istek. Sayfayı yenilemeyi dene.',
  401: 'Oturum süresi dolmuş. Tekrar giriş yap.',
  403: 'Bu işlem için yetkin yok.',
  404: 'İçerik bulunamadı.',
  429: 'Çok fazla istek gönderildi. Biraz bekle.',
  500: 'Sunucu hatası oluştu. Biraz sonra tekrar dene.',
  502: 'Servis geçici olarak kullanılamıyor.',
  503: 'Servis bakımda. Birkaç dakika sonra dene.',
};

/** Firebase Auth hata kodları → Türkçe kullanıcı mesajı */
const AUTH_ERROR_MAP: Record<string, string> = {
  'auth/invalid-email': 'Geçersiz e-posta adresi.',
  'auth/user-disabled': 'Bu hesap devre dışı bırakılmış.',
  'auth/user-not-found': 'Bu e-posta ile kayıtlı hesap bulunamadı.',
  'auth/wrong-password': 'Şifre hatalı.',
  'auth/email-already-in-use': 'Bu e-posta zaten kullanılıyor.',
  'auth/weak-password': 'Şifre en az 6 karakter olmalı.',
  'auth/network-request-failed': 'Ağ bağlantısı başarısız. İnternet bağlantını kontrol et.',
  'auth/too-many-requests': 'Çok fazla başarısız deneme. Biraz bekle.',
  'auth/popup-closed-by-user': 'Giriş penceresi kapatıldı.',
  'auth/cancelled-popup-request': 'Giriş işlemi iptal edildi.',
  'auth/requires-recent-login': 'Bu işlem için tekrar giriş yapman gerekiyor.',
  'auth/invalid-credential': 'E-posta veya şifre hatalı.',
};

/** Genel hata mesajı çözümleyici */
export function resolveErrorMessage(error: unknown): string {
  if (!error) return 'Bilinmeyen bir hata oluştu.';

  // String error code
  if (typeof error === 'string') {
    return (
      AI_ERROR_MAP[error] ??
      AUTH_ERROR_MAP[error] ??
      'İşlem sırasında bir hata oluştu. Tekrar dene.'
    );
  }

  const err = error as { code?: string; message?: string; status?: number };

  // Firebase Auth kodu
  if (err.code && AUTH_ERROR_MAP[err.code]) {
    return AUTH_ERROR_MAP[err.code];
  }

  // HTTP status
  if (err.status && HTTP_STATUS_MAP[err.status]) {
    return HTTP_STATUS_MAP[err.status];
  }

  // AI hata kodu mesaj içinde
  if (err.message) {
    for (const [code, msg] of Object.entries(AI_ERROR_MAP)) {
      if (err.message.includes(code)) return msg;
    }
    // Status kodu mesaj içinde
    const statusMatch = err.message.match(/(\d{3})/);
    if (statusMatch) {
      const status = parseInt(statusMatch[1]);
      if (HTTP_STATUS_MAP[status]) return HTTP_STATUS_MAP[status];
    }
  }

  return 'Beklenmedik bir hata oluştu. Sayfayı yenilemeyi dene.';
}

export function resolveAiError(errorCode?: string): string {
  if (!errorCode) return 'Yanıt alınamadı. Biraz sonra tekrar dene.';
  return AI_ERROR_MAP[errorCode] ?? 'AI servisi geçici olarak kullanılamıyor.';
}

export function resolveAuthError(code?: string): string {
  if (!code) return 'Giriş başarısız.';
  return AUTH_ERROR_MAP[code] ?? 'Giriş sırasında bir hata oluştu.';
}
