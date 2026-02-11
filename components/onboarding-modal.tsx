'use client';

import { useState, useEffect } from 'react';
import { Mail, ArrowRight, Sparkles, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const ONBOARDING_KEY = 'duezo_onboarding_complete';

interface OnboardingModalProps {
  isGmailConnected: boolean;
  onComplete: () => void;
  onConnectGmail: () => void;
  onSkip: () => void;
}

export function OnboardingModal({
  isGmailConnected,
  onComplete,
  onConnectGmail,
  onSkip,
}: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const finish = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setVisible(false);
    setTimeout(onComplete, 300);
  };

  const steps = [
    // Step 1: Welcome
    <div key="welcome" className="text-center">
      <div className="text-6xl mb-6">🎉</div>
      <h2 className="text-2xl font-bold text-white mb-3">Welcome to Duezo!</h2>
      <p className="text-zinc-400 leading-relaxed max-w-sm mx-auto">
        We scan your email to find bills and track due dates so you never miss a payment.
      </p>
      <button
        onClick={() => setStep(1)}
        className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold hover:opacity-90 transition-opacity"
      >
        Get Started
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>,

    // Step 2: Connect Gmail
    <div key="gmail" className="text-center">
      <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-orange-500/30 flex items-center justify-center">
        <Mail className="w-8 h-8 text-orange-400" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-3">Connect Gmail</h2>
      <p className="text-zinc-400 leading-relaxed max-w-sm mx-auto mb-8">
        We&apos;ll automatically find bills in your inbox and keep your due dates up to date.
      </p>
      <div className="flex flex-col gap-3">
        {isGmailConnected ? (
          <div className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-semibold">
            <Check className="w-4 h-4" />
            Gmail Connected
          </div>
        ) : (
          <button
            onClick={() => {
              onConnectGmail();
              setStep(2);
            }}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold hover:opacity-90 transition-opacity"
          >
            <Mail className="w-4 h-4" />
            Connect Gmail
          </button>
        )}
        <button
          onClick={() => {
            onSkip();
            setStep(2);
          }}
          className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Skip — I&apos;ll add bills manually
        </button>
      </div>
    </div>,

    // Step 3: All set
    <div key="done" className="text-center">
      <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/30 flex items-center justify-center">
        <Sparkles className="w-8 h-8 text-emerald-400" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-3">You&apos;re all set!</h2>
      <p className="text-zinc-400 leading-relaxed max-w-sm mx-auto mb-2">
        You have <span className="text-amber-400 font-semibold">14 days of Pro free</span>.
      </p>
      <p className="text-zinc-500 text-sm mb-8">
        Enjoy unlimited bills, push notifications, and auto-sync.
      </p>
      <button
        onClick={finish}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold hover:opacity-90 transition-opacity"
      >
        Go to Dashboard
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>,
  ];

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex items-center justify-center transition-all duration-300',
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className={cn(
          'relative w-full max-w-md mx-4 p-8 rounded-3xl transition-all duration-300',
          'bg-[#0c0c10]/95 backdrop-blur-xl border border-white/[0.08]',
          'shadow-[0_25px_60px_-12px_rgba(0,0,0,0.8)]',
          visible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        )}
      >
        {/* Close button */}
        <button
          onClick={finish}
          className="absolute top-4 right-4 p-1.5 text-zinc-600 hover:text-zinc-300 transition-colors rounded-lg hover:bg-white/5"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                i === step
                  ? 'w-8 bg-gradient-to-r from-orange-500 to-amber-500'
                  : i < step
                  ? 'w-4 bg-orange-500/40'
                  : 'w-4 bg-white/10'
              )}
            />
          ))}
        </div>

        {/* Step content with transition */}
        <div className="min-h-[280px] flex items-center justify-center">
          <div
            key={step}
            className="w-full animate-in fade-in slide-in-from-right-4 duration-300"
          >
            {steps[step]}
          </div>
        </div>
      </div>
    </div>
  );
}

export function useOnboardingComplete() {
  const [isComplete, setIsComplete] = useState(true); // default true to avoid flash

  useEffect(() => {
    setIsComplete(localStorage.getItem(ONBOARDING_KEY) === 'true');
  }, []);

  return isComplete;
}
