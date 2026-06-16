'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { signInWithOAuthNative, listenForAuthReturn } from '@/lib/capacitor-auth';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Wait for mount to prevent hydration mismatch (browser extensions can inject attrs)
  // Also check if already logged in — redirect to dashboard immediately
  useEffect(() => {
    setMounted(true);
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        window.location.href = '/dashboard';
      }
    });
  }, [supabase]);

  // On native: listen for return from OAuth browser and redirect if authenticated
  const handleAuthReturn = useCallback(() => {
    router.push('/dashboard');
    router.refresh();
  }, [router]);

  const handleAuthDismissed = useCallback(() => {
    setIsLoading(false);
  }, []);

  useEffect(() => {
    return listenForAuthReturn(supabase, handleAuthReturn, handleAuthDismissed);
  }, [supabase, handleAuthReturn, handleAuthDismissed]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        setIsLoading(false);
        return;
      }

      if (!data?.session) {
        setError('Login succeeded but no session was returned. Please try again.');
        setIsLoading(false);
        return;
      }

      // Use hard navigation — more reliable in Capacitor WebView
      window.location.href = '/dashboard';
    } catch (err: any) {
      const msg = err?.message || 'An unexpected error occurred.';
      setError(`Login failed: ${msg}`);
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const result = await signInWithOAuthNative(supabase, 'google');
      if (result.error) {
        setError(result.error);
        setIsLoading(false);
      }
      // Safety: reset loading after 30s in case browser dismiss doesn't fire
      setTimeout(() => setIsLoading(false), 30000);
    } catch (err) {
      setError('An unexpected error occurred');
      setIsLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setIsLoading(true);
    setError('');

    // Safety timeout — if Apple auth hangs or is dismissed, reset after 30s
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 30000);

    try {
      const result = await signInWithOAuthNative(supabase, 'apple');
      clearTimeout(timeout);
      if (result.error) {
        setError(result.error);
        setIsLoading(false);
      }
      // On success, navigation happens automatically — no need to setIsLoading(false)
    } catch (err) {
      clearTimeout(timeout);
      setError('Apple Sign In was cancelled or failed. Please try again.');
      setIsLoading(false);
    }
  };

  // Show loading state until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#0F0A1E] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F0A1E] text-white flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="text-center">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-8">
              <Image
                src="/logo-128.png"
                alt="Duezo"
                width={38}
                height={38}
                className="rounded-xl shadow-lg shadow-violet-500/20"
              />
              <span className="text-2xl font-bold tracking-tight">
                Due<span className="text-violet-400">zo</span>
              </span>
            </Link>

            <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
            <p className="mt-2 text-zinc-400">
              Sign in to your account to continue
            </p>
          </div>

          <div className="space-y-3">
            {/* Apple Sign In */}
            <button
              onClick={handleAppleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-black text-white font-medium rounded-xl hover:bg-zinc-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-white/10"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M16.365 1.43c0 1.14-.417 2.062-1.25 2.77-.903.782-2.03 1.237-3.197 1.14-.074-1.09.382-2.16 1.247-2.9.86-.767 2.032-1.24 3.2-1.01zM20.59 17.21c-.6 1.36-.88 1.97-1.64 3.17-1.06 1.65-2.56 3.7-4.41 3.72-1.64.02-2.06-1.06-4.31-1.05-2.25.01-2.71 1.08-4.36 1.06-1.85-.02-3.26-1.86-4.32-3.5-2.95-4.59-3.26-9.98-1.44-12.75 1.29-1.97 3.33-3.12 5.24-3.12 1.94 0 3.16 1.07 4.76 1.07 1.56 0 2.51-1.07 4.75-1.07 1.7 0 3.49.93 4.77 2.53-4.18 2.29-3.5 8.25.96 9.94z"
                />
              </svg>
              Continue with Apple
            </button>

            {/* Google Sign In */}
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white text-black font-medium rounded-xl hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[#0F0A1E] text-zinc-500">
                or continue with email
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-zinc-300 mb-2"
                >
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-zinc-300 mb-2"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            {/* Forgot password */}
            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
              >
                Forgot your password?
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="group w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-violet-500 to-violet-500 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* App Store link */}
          <p className="text-center text-sm text-zinc-400">
            New to Duezo?{' '}
            <Link
              href="https://apps.apple.com/us/app/duezo/id6759273131"
              className="text-violet-400 hover:text-violet-300 font-medium transition-colors"
            >
              Download on the App Store
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Decorative */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-gradient-to-br from-violet-500/10 via-violet-500/10 to-violet-500/10 relative overflow-hidden">
        {/* Ambient blurs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-[100px]" />

        {/* Content */}
        <div className="relative text-center px-8">
          <div className="text-8xl mb-6">📊</div>
          <h2 className="text-2xl font-bold mb-3">Stay on top of your bills</h2>
          <p className="text-zinc-400 max-w-sm">
            Beautiful countdown cards that change color as due dates approach.
            Never miss a payment again.
          </p>
        </div>
      </div>
    </div>
  );
}
