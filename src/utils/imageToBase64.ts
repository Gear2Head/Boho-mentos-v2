/**
 * AMAÇ: Görsel dosyasını base64'e çevirir.
 * T-005: OCR sistemi için kullanılır.
 */

export async function imageFileToBase64(file: File): Promise<{
  base64: string;
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp';
}> {
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
