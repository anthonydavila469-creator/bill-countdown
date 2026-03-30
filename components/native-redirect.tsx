'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * When running inside the Capacitor native shell, skip the marketing
 * landing page and go straight to /login (or /dashboard if already authed).
 * On the web this component renders nothing.
 */
export function NativeRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Capacitor injects window.Capacitor on native; checking without importing
    // avoids pulling the Capacitor bundle into the landing page chunk.
    const cap = (window as any).Capacitor;
    if (cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform()) {
      router.replace('/login');
    }
  }, [router]);

  return null;
}
