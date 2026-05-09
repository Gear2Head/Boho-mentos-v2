/**
 * AMAÇ: Basit veri şifreleme ve doğrulama yardımcıları.
 * MANTIK: Hassas verilerin (şifreler, UID'ler) düz metin olarak saklanmasını önlemek.
 */

// Basit bir XOR + Base64 şifreleme (Client-side hızlı çözüm)
const MASTER_KEY = 'BOHO_SECRET_2026';

export function encrypt(text: string): string {
  if (!text) return '';
  const chars = text.split('').map((char, i) => {
    return char.charCodeAt(0) ^ MASTER_KEY.charCodeAt(i % MASTER_KEY.length);
  });
  return btoa(JSON.stringify(chars));
}

export function decrypt(encoded: string): string {
  if (!encoded) return '';
  try {
    const chars = JSON.parse(atob(encoded)) as number[];
    return chars.map((code, i) => {
      return String.fromCharCode(code ^ MASTER_KEY.charCodeAt(i % MASTER_KEY.length));
    }).join('');
  } catch {
    return '';
  }
}

// Güvenli karşılaştırma
export function secureCompare(input: string, encryptedTarget: string): boolean {
  return encrypt(input) === encryptedTarget;
}
