/**
 * AMAÇ: Firebase Auth hata kodlarını kullanıcı dostu metne çevirir.
 */
export function parseAuthError(code: string): string {
  const map: Record<string, string> = {
    "auth/email-already-in-use": "Bu e-posta zaten kayıtlı.",
    "auth/user-not-found": "Bu e-posta ile kayıtlı kullanıcı bulunamadı.",
    "auth/wrong-password": "Şifre yanlış.",
    "auth/invalid-email": "Geçersiz e-posta adresi.",
    "auth/weak-password": "Şifre en az 6 karakter olmalı.",
    "auth/too-many-requests": "Çok fazla deneme. Lütfen biraz bekleyip tekrar dene.",
    "auth/popup-closed-by-user": "Google giriş penceresi kapatıldı.",
    "auth/network-request-failed": "Ağ hatası oluştu. İnterneti kontrol et.",
    "auth/invalid-credential": "E-posta veya şifre hatalı.",
    "auth/user-disabled": "Bu hesap devre dışı bırakılmış.",
    "auth/requires-recent-login": "Bu işlem için tekrar giriş yapman gerekiyor.",
  };
  return map[code] ?? "Bir kimlik doğrulama hatası oluştu. Tekrar dene.";
}

