'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Mail,
  ChevronLeft,
  Copy,
  Check,
  ArrowRight,
} from 'lucide-react';

const FORWARDING_ADDRESS = 'duezo-bills@agentmail.to';

interface ForwardingStepProps {
  onBack: () => void;
  onComplete: () => void;
  onSkip: () => void;
}

export function GmailSyncStep({
  onBack,
  onComplete,
  onSkip,
}: ForwardingStepProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(FORWARDING_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = FORWARDING_ADDRESS;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Back button */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-white">Forward Your Bills</h2>
          <p className="text-sm text-white/50">Add bills by forwarding emails</p>
        </div>
      </div>

      <div className="text-center">
        <div className="relative inline-flex mb-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-500 flex items-center justify-center">
            <Mail className="w-10 h-10 text-white" />
          </div>
          <div className="absolute -inset-2 bg-gradient-to-br from-violet-500/30 to-violet-500/30 rounded-3xl blur-xl -z-10" />
        </div>

        <h2 className="text-xl font-bold text-white mb-2">
          Your Duezo Address
        </h2>
        <p className="text-white/50 mb-6">
          Forward your latest bill from each company. Search your inbox for
          &quot;statement&quot; or &quot;bill due&quot; and forward the most recent one
          from each biller. Takes about 5 minutes.
        </p>

        {/* Forwarding address with copy */}
        <button
          onClick={handleCopy}
          className={cn(
            'w-full flex items-center justify-between gap-3 px-4 py-4 rounded-xl border transition-all duration-200',
            copied
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : 'bg-white/[0.04] border-white/10 hover:border-white/20'
          )}
        >
          <span className={cn(
            'text-sm font-mono font-medium',
            copied ? 'text-emerald-400' : 'text-white'
          )}>
            {FORWARDING_ADDRESS}
          </span>
          {copied ? (
            <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          ) : (
            <Copy className="w-5 h-5 text-white/40 flex-shrink-0" />
          )}
        </button>
        {copied && (
          <p className="text-sm text-emerald-400 mt-2">Copied!</p>
        )}
      </div>

      {/* Action buttons */}
      <div className="mt-8 space-y-3">
        <button
          onClick={onComplete}
          className="w-full py-4 rounded-xl font-semibold bg-gradient-to-r from-violet-500 to-violet-500 text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        >
          I&apos;ve forwarded a bill
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={onSkip}
          className="w-full py-3 text-white/50 hover:text-white transition-colors text-sm"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
