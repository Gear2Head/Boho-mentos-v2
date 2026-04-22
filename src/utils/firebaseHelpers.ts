/**
 * Nesne içindeki tüm 'undefined' değerleri temizler veya 'null' yapar.
 * Firestore 'undefined' kabul etmediği için bu hayati önem taşır.
 */
export const cleanForFirestore = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  const cleanObj = Array.isArray(obj) ? [] : {};
  
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    
    if (value === undefined) {
      // Don't add undefined to the clean object
      return;
    }

    if (value !== null && typeof value === 'object') {
      (cleanObj as any)[key] = cleanForFirestore(value);
    } else {
      (cleanObj as any)[key] = value;
    }
  });

  return cleanObj;
};
