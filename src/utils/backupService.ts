import { useAppStore } from '../store/appStore';
import { encrypt, decrypt } from './encryption';

/**
 * Boho Mentos v2 Backup Service
 * Allows users to export their entire state as an encrypted or plain JSON file.
 */

export const exportUserData = () => {
  try {
    const state = useAppStore.getState();
    // Exclude UI transient states if needed, though partialize already handles this
    const dataStr = JSON.stringify(state, null, 2);
    
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `boho_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    return { success: true };
  } catch (error) {
    console.error('Export failed:', error);
    return { success: false, error };
  }
};

export const importUserData = async (file: File): Promise<{ success: boolean; error?: string }> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        // Basic validation
        if (!data.tytSubjects || !data.profile) {
          throw new Error('Geçersiz yedek dosyası yapısı.');
        }

        // Wipe current state and replace with imported data
        // We use setState directly on the store
        useAppStore.setState({
          ...data,
          hasHydrated: true, // Prevent immediate re-hydration from old IDB
          isSyncing: false
        });

        resolve({ success: true });
      } catch (error: any) {
        console.error('Import failed:', error);
        resolve({ success: false, error: error.message });
      }
    };
    reader.onerror = () => resolve({ success: false, error: 'Dosya okunamadı.' });
    reader.readAsText(file);
  });
};
