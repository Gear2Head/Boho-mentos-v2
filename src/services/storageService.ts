import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Kullanıcıya özel klasörleme: users/{uid}/{folderName}/{fileName}
 */
export async function uploadFile(uid: string, folder: string, file: File): Promise<string> {
  const firebaseStorage = storage;
  if (!firebaseStorage) throw new Error("Firebase Storage is not initialized.");

  const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const storageRef = ref(firebaseStorage, `users/${uid}/${folder}/${fileName}`);
  
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}

/**
 * Polymorphic upload specifically for legacy code compatibility
 */
export async function uploadImageFile(arg1: any, arg2: any, arg3?: any): Promise<string> {
  // Signature check: (file, path) vs (uid, folder, file)
  if (arg1 instanceof File && typeof arg2 === 'string') {
    const firebaseStorage = storage;
    if (!firebaseStorage) throw new Error("Firebase Storage is not initialized.");
    const storageRef = ref(firebaseStorage, arg2);
    await uploadBytes(storageRef, arg1);
    return await getDownloadURL(storageRef);
  } else {
    return uploadFile(arg1, arg2, arg3);
  }
}

export async function deleteFile(fileUrl: string): Promise<void> {
  const firebaseStorage = storage;
  if (!fileUrl || !firebaseStorage) return;
  try {
    const fileRef = ref(firebaseStorage, fileUrl);
    await deleteObject(fileRef);
  } catch (error) {
    console.error('Storage Delete Error:', error);
  }
}

export const storageService = {
  uploadFile,
  uploadImageFile,
  deleteFile
};
