'use client';

import { useEffect, useState } from 'react';

/**
 * Detects when the user is browsing inside SFSafariViewController
 * (or any external Safari browser) instead of the native WKWebView.
 * 
 * How it works:
 * - In the native Capacitor app: window.Capacitor exists → no banner
 * - On desktop web: not iOS → no banner
 * - In SFSafariViewController: iOS UA + no Capacitor → show escape banner
 * 
 * This covers ALL builds, no native plugin needed.
 */
export function SFVCEscapeBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    // Wait a tick for Capacitor to initialize
    const timer = setTimeout(() => {
      const cap = (window as any).Capacitor;
      const isNativeApp = cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform();
      
      // If we're in the native app, no banner needed
      if (isNativeApp) return;

      // Check if this is an iOS device (could be in SFSafariViewController)
      const ua = navigator.userAgent;
      const isIOS = /iPhone|iPad|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document);

      if (!isIOS) return;

      // We're on iOS but NOT in the native Capacitor shell
      // This means we're in SFSafariViewController, Safari, or another browser
      
      // Only show on app pages (dashboard, settings, etc.) — not marketing/landing
      const path = window.location.pathname;
      const appPaths = ['/dashboard', '/settings', '/login', '/signup', '/auth'];
      const isAppPage = appPaths.some(p => path.startsWith(p));

      if (isAppPage) {
        setShowBanner(true);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  if (!showBanner) return null;

  return (
    <>
      {/* Sticky banner at top */}
      <div 
        onClick={() => setShowOverlay(true)}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 99999,
          background: 'linear-gradient(135deg, #7C3AED, #8B5CF6)',
          padding: '12px 16px',
          paddingTop: 'max(12px, env(safe-area-inset-top))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4)',
        }}
      >
        <span style={{ fontSize: '20px' }}>📱</span>
        <span style={{ 
          color: 'white', 
          fontWeight: 700, 
          fontSize: '15px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          Tap to open in Duezo app
        </span>
        <span style={{ fontSize: '14px' }}>→</span>
      </div>

      {/* Full overlay when tapped */}
      {showOverlay && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999999,
          background: '#0F0A1E',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>📱</div>
          <h1 style={{ 
            color: 'white', 
            fontSize: '24px', 
            fontWeight: 800, 
            marginBottom: '12px',
            textAlign: 'center',
          }}>
            Open in Duezo
          </h1>
          <p style={{ 
            color: '#a1a1aa', 
            fontSize: '16px', 
            textAlign: 'center',
            marginBottom: '32px',
            lineHeight: '1.5',
            maxWidth: '300px',
          }}>
            You're viewing this in a browser window. Tap below to return to the Duezo app.
          </p>
          
          {/* Primary: custom URL scheme */}
          <a 
            href="app.duezo://dashboard"
            style={{
              display: 'block',
              width: '100%',
              maxWidth: '300px',
              padding: '18px 40px',
              background: 'linear-gradient(135deg, #7C3AED, #8B5CF6)',
              color: 'white',
              fontSize: '18px',
              fontWeight: 700,
              borderRadius: '14px',
              textDecoration: 'none',
              textAlign: 'center',
              boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4)',
              marginBottom: '16px',
            }}
          >
            Open Duezo
          </a>

          {/* Dismiss option */}
          <button
            onClick={() => {
              setShowOverlay(false);
              setShowBanner(false);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#6b7280',
              fontSize: '14px',
              cursor: 'pointer',
              padding: '12px',
              textDecoration: 'underline',
            }}
          >
            Continue in browser
          </button>
        </div>
      )}
    </>
  );
}
