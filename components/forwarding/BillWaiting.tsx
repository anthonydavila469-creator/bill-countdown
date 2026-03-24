'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PartyPopper, CheckCircle2 } from 'lucide-react';

interface BillWaitingProps {
  active?: boolean;
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

        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    } catch {
      // Silently ignore
    }
  }, [onBillDetected]);

  useEffect(() => {
    if (!active || detected) return;

    poll();
    intervalRef.current = setInterval(poll, 8000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [active, detected, poll]);

  useEffect(() => {
    if (!detected) return;
    const timeout = setTimeout(() => router.push('/dashboard'), 3000);
    return () => clearTimeout(timeout);
  }, [detected, router]);

  if (detected) {
    return (
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-4 animate-in fade-in duration-300">
        <div className="flex items-center gap-3">
          <PartyPopper className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-white">
              {billsReceived === 1 ? 'Bill added!' : `${billsReceived} bills added!`}
            </p>
            <p className="text-xs text-zinc-400">Taking you to your dashboard...</p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
          >
            Go now →
          </button>
        </div>
      </div>
    );
  }

  if (!active) return null;

  // Subtle waiting indicator — not in-your-face
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
      <CheckCircle2 className="w-4 h-4 text-violet-400/60" />
      <span className="text-xs text-zinc-500">Listening for forwarded bills...</span>
    </div>
  );
}
