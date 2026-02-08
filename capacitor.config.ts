import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.duezo',
  appName: 'Duezo',
  webDir: 'out',
  server: {
    // Load the live site in production
    url: 'https://duezo.app',
    cleartext: false,
  },
  ios: {
    scheme: 'Duezo',
    contentInset: 'automatic',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#08080c',
      showSpinner: false,
    },
  },
};

export default config;
