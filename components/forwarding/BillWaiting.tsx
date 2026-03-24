'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, PartyPopper, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BillWaitingProps {
  /** If true, start polling. If false or omitted, don't poll. */
  active?: boolean;
  /** Called when a bill is detected. */
  onBillDetected?: () => void;
}

export function BillWaiting({ active = true, onBillDetected }: BillWaitingProps) {
  const router = useRouter();
  const [billsReceived, setBillsReceived] = useState(0);
  const [detected, setDetected] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/inbound/inbox?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return;

      const data = await res.json();
      const count = data.inbox?.bills_received ?? 0;

      if (count > 0) {
        setBillsReceived(count);
        setDetected(true);
        onBillDetected?.();

        // Stop polling
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    } catch {
      // Silently ignore poll errors
    }
  }, [onBillDetected]);

  useEffect(() => {
    if (!active || detected) return;

    // Poll immediately, then every 5 seconds
    poll();
    intervalRef.current = setInterval(poll, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [active, detected, poll]);

  // Auto-redirect after detection
  useEffect(() => {
    if (!detected) return;

    const timeout = setTimeout(() => {
      router.push('/dashboard');
    }, 3000);

    return () => clearTimeout(timeout);
  }, [detected, router]);

  if (detected) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.06] to-teal-500/[0.04] p-6 animate-in fade-in zoom-in-95 duration-500">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent" />

        <div className="relative flex flex-col items-center text-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-400/30 rounded-full blur-xl animate-pulse" />
            <div className="relative p-4 rounded-full bg-emerald-500/15 border border-emerald-500/25">
              <PartyPopper className="w-8 h-8 text-emerald-400" />
            </div>
          </div>
          <div>
            <p className="text-lg font-semibold text-white mb-1">
              Bill detected!
            </p>
            <p className="text-sm text-zinc-400">
              {billsReceived === 1
                ? 'We found 1 bill from your forwarded email.'
                : `We found ${billsReceived} bills from your forwarded emails.`}
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 font-medium text-sm transition-colors"
          >
            Go to Dashboard
          </button>
          <p className="text-xs text-zinc-500">Redirecting in a few seconds...</p>
        </div>
      </div>
    );
  }

  if (!active) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
      <div className="flex flex-col items-center text-center gap-3">
        <div className="relative">
          <div className="absolute inset-0 bg-violet-500/15 rounded-full blur-xl animate-pulse" />
          <div className="relative p-4 rounded-full bg-violet-500/10 border border-violet-500/20">
            <Mail className="w-7 h-7 text-violet-400 animate-pulse" />
          </div>
        </div>
        <div>
          <p className="font-semibold text-white tracking-wide mb-1">
            Waiting for your first bill...
          </p>
          <p className="text-sm text-zinc-400 leading-relaxed max-w-sm">
            Forward a bill email to your Duezo address and we&apos;ll detect it automatically.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
          <span className="text-xs text-zinc-500">Checking every few seconds</span>
        </div>
      </div>
    </div>
  );
}
