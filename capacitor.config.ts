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
    backgroundColor: '#08080c',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: '#08080c',
      showSpinner: true,
      spinnerColor: '#FF6B00',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
