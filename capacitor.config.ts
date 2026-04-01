import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gearhead.bohomentosluk',
  appName: 'Boho Mentosluk',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2500,
      launchAutoHide: true,
      launchFadeOutDuration: 300,
      backgroundColor: "#121212",
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      androidSpinnerStyle: "large",
      spinnerColor: "#C17767",
    },
    StatusBar: {
      style: 'DARK', // Işık modunda ikonlar beyaz görünür
      backgroundColor: '#121212',
      overlaysWebView: false,
    }
  },
  server: {
    androidScheme: 'https'
  }
};

export default config;
