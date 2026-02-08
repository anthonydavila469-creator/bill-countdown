import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.duezo',
  appName: 'Duezo',
  webDir: 'out',
  server: {
    // Use local dev server for testing (change to https://duezo.app for production)
    url: 'http://192.168.1.223:3000',
    cleartext: true,
  },
  ios: {
    scheme: 'Duezo',
    contentInset: 'automatic',
    backgroundColor: '#08080c',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#08080c',
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
