import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.duezo',
  appName: 'Duezo',
  webDir: 'out',
  server: {
    url: 'https://www.duezo.app',
    cleartext: false,
  },
  ios: {
    scheme: 'Duezo',
    contentInset: 'automatic',
    backgroundColor: '#0F0A1E',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: '#0F0A1E',
      showSpinner: true,
      spinnerColor: '#8B5CF6',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
