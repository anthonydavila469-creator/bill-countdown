'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Zap, Mail, Lock, User, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const benefits = [
  'AI-powered bill detection from your email',
  'Beautiful countdown cards for each bill',
  'Smart reminders before due dates',
  'Free forever for up to 10 bills',
];

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (error) {
        setError(error.message);
        setIsLoading(false);
        return;
      }

      // Show success message - user needs to verify email
      setSuccess(true);
      setIsLoading(false);
    } catch (err) {
      setError('An unexpected error occurred');
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        setError(error.message);
        setIsLoading(false);
      }
    } catch (err) {
      setError('An unexpected error occurred');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08080c] text-white flex">
      {/* Left side - Decorative */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-gradient-to-br from-blue-500/10 via-violet-500/10 to-purple-500/10 relative overflow-hidden">
        {/* Ambient blurs */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-[100px]" />

        {/* Content */}
        <div className="relative px-12">
          <h2 className="text-3xl font-bold mb-8">
            Start tracking your bills
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              in seconds
            </span>
          </h2>

          <ul className="space-y-4">
            {benefits.map((benefit, index) => (
              <li
                key={index}
                className="flex items-center gap-3 text-zinc-300"
              >
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                {benefit}
              </li>
            ))}
          </ul>

          {/* Testimonial */}
          <div className="mt-12 p-6 rounded-2xl bg-white/5 border border-white/10">
            <p className="text-zinc-300 italic mb-4">
              &ldquo;This app has saved me from so many late fees. The colorful
              cards make it actually fun to check my bills!&rdquo;
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-lg">
                S
              </div>
              <div>
                <p className="font-medium">Sarah M.</p>
                <p className="text-sm text-zinc-500">Freelance Designer</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="text-center">
            <Link href="/" className="inline-flex items-center gap-2 mb-8">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold tracking-tight">
                Bill<span className="text-blue-400">Countdown</span>
              </span>
            </Link>

            <h1 className="text-3xl font-bold tracking-tight">
              Create your account
            </h1>
            <p className="mt-2 text-zinc-400">
              Get started for free. No credit card required.
            </p>
          </div>

          {/* Google Sign Up */}
          <button
            onClick={handleGoogleSignup}
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

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[#08080c] text-zinc-500">
                or continue with email
              </span>
            </div>
          </div>

          {/* Success State */}
          {success ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-xl font-semibold">Check your email</h2>
              <p className="text-zinc-400">
                We&apos;ve sent a confirmation link to <strong className="text-white">{email}</strong>.
                Click the link to activate your account.
              </p>
              <Link
                href="/login"
                className="inline-block px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white font-medium transition-colors"
              >
                Back to Sign in
              </Link>
            </div>
          ) : (
          <>
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-zinc-300 mb-2"
                >
                  Full name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="John Doe"
                  />
                </div>
              </div>

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
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                    minLength={8}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="••••••••"
                  />
                </div>
                <p className="mt-1.5 text-xs text-zinc-500">
                  Must be at least 8 characters
                </p>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="group w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-violet-500 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Create account
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            {/* Terms */}
            <p className="text-xs text-zinc-500 text-center">
              By creating an account, you agree to our{' '}
              <a href="#" className="text-blue-400 hover:underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="text-blue-400 hover:underline">
                Privacy Policy
              </a>
            </p>
          </form>

          {/* Sign in link */}
          <p className="text-center text-sm text-zinc-400">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              Sign in
            </Link>
          </p>
          </>
          )}
        </div>
      </div>
    </div>
  );
}
