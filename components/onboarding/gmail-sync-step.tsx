'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Plus,
  Mail,
  ChevronLeft,
  ChevronDown,
  Copy,
  Check,
  ArrowRight,
  Sparkles,
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
  const [showForwarding, setShowForwarding] = useState(false);

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
          <h2 className="text-xl font-bold text-white">Add Your Bills</h2>
          <p className="text-sm text-white/50">Choose how to get started</p>
        </div>
      </div>

      <div className="text-center">
        <div className="relative inline-flex mb-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-amber-500 flex items-center justify-center">
            <Plus className="w-10 h-10 text-white" />
          </div>
          <div className="absolute -inset-2 bg-gradient-to-br from-violet-500/30 to-amber-500/30 rounded-3xl blur-xl -z-10" />
        </div>

        <h2 className="text-xl font-bold text-white mb-2">
          Quick Add
        </h2>
        <p className="text-white/50 mb-6">
          Type a bill name like &quot;Netflix&quot; and we&apos;ll auto-fill the amount, category, and payment link. Add a bill in 10 seconds.
        </p>
      </div>

      {/* Primary action: Add Bills Manually */}
      <div className="space-y-3">
        <button
          onClick={onComplete}
          className="w-full py-4 rounded-xl font-semibold bg-gradient-to-r from-violet-500 to-amber-500 text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Start Adding Bills
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* Advanced: Email forwarding (collapsible) */}
        <div className="mt-4 pt-4 border-t border-white/[0.06]">
          <button
            onClick={() => setShowForwarding(!showForwarding)}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <Mail className="w-3.5 h-3.5" />
            Advanced: forward bills via email
            <ChevronDown className={cn(
              "w-3.5 h-3.5 transition-transform duration-200",
              showForwarding && "rotate-180"
            )} />
          </button>

          {showForwarding && (
            <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <p className="text-xs text-zinc-500 mb-3 leading-relaxed">
                Forward your latest bill from each company to this address. We&apos;ll extract the details automatically.
              </p>
              <button
                onClick={handleCopy}
                className={cn(
                  'w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-all duration-200',
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
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                ) : (
                  <Copy className="w-4 h-4 text-white/40 flex-shrink-0" />
                )}
              </button>
              {copied && (
                <p className="text-xs text-emerald-400 mt-1.5">Copied!</p>
              )}
            </div>
          )}
        </div>

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
