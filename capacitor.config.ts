import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.francgympro',
  appName: 'FrancGymPro',
  webDir: 'dist',
  server: {
    url: 'https://ee763956-52bb-41da-bcb7-3f17f8fcef5c.lovableproject.com?forceHideBadge=true',
    cleartext: true,
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0a0a0a',
      showSpinner: true,
      spinnerColor: '#dc2626',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0a0a0a',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#dc2626',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    // Health integrations - configure in native project
    // For iOS: Add HealthKit capability in Xcode
    // For Android: Add Google Fit permissions in AndroidManifest.xml
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'francgympro',
    // HealthKit requires these entitlements in Xcode:
    // - HealthKit
    // - HealthKit Background Delivery (optional)
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    backgroundColor: '#0a0a0a',
    overrideUserAgent: 'FrancGymPro/1.0 Android',
    appendUserAgent: 'FrancGymPro/1.0',
    // Google Fit requires OAuth setup in Google Cloud Console
    // Samsung Health requires Samsung partnership program
  }
};

export default config;

