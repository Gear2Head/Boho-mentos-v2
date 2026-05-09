/**
 * AMAÇ: Görsel dosyasını base64'e çevirir.
 * T-005: OCR sistemi için kullanılır.
 * P1.5: MIME tipi doğrudan korunur; desteklenmeyen tip reddedilir.
 */

const SUPPORTED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function imageFileToBase64(file: File): Promise<{
  base64: string;
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp';
}> {
  if (!SUPPORTED_MIME_TYPES.has(file.type)) {
    throw new Error(`Desteklenmeyen dosya formatı: ${file.type}. Sadece JPEG, PNG ve WebP kabul edilir.`);
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(`Dosya boyutu çok büyük (${(file.size / 1024 / 1024).toFixed(1)} MB). Maksimum 5 MB.`);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      const mediaType = file.type as 'image/jpeg' | 'image/png' | 'image/webp';
      resolve({ base64, mediaType });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
