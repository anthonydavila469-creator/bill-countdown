'use client';

import { useState, useCallback } from 'react';
import { Mail, Copy, Check, Loader2, Plus, Send, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InboxAddressProps {
  inboxAddress: string | null;
  onInboxCreated?: (address: string) => void;
}

export function InboxAddress({ inboxAddress, onInboxCreated }: InboxAddressProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateInbox = useCallback(async () => {
    setIsCreating(true);
    setError(null);

    try {
      const res = await fetch('/api/inbound/inbox', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to create inbox');

      const data = await res.json();
      onInboxCreated?.(data.inbox_address);
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setIsCreating(false);
    }
  }, [onInboxCreated]);

  const handleCopy = useCallback(async () => {
    if (!inboxAddress) return;

    try {
      await navigator.clipboard.writeText(inboxAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = inboxAddress;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [inboxAddress]);

  // No inbox yet — show setup button
  if (!inboxAddress) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-violet-500/20 rounded-full blur-xl" />
            <div className="relative p-4 rounded-full bg-violet-500/10 border border-violet-500/20">
              <Mail className="w-7 h-7 text-violet-400" />
            </div>
          </div>
          <div>
            <p className="font-semibold text-white tracking-wide mb-1">
              Forward bills to Duezo
            </p>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-xs">
              Get an email address you can forward bills to. We&apos;ll add them automatically.
            </p>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            onClick={handleCreateInbox}
            disabled={isCreating}
            className={cn(
              'inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300',
              'bg-violet-500 hover:bg-violet-400 text-white',
              'disabled:opacity-60 disabled:cursor-not-allowed'
            )}
          >
            {isCreating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            <span>{isCreating ? 'Setting up...' : 'Turn On Bill Forwarding'}</span>
          </button>
        </div>
      </div>
    );
  }

  // Has inbox — show 3-step flow
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-5">
      {/* The address with copy button */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.08]">
        <div className="relative flex-shrink-0">
          <div className="absolute inset-0 bg-violet-500/20 rounded-xl blur-lg" />
          <div className="relative p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
            <Mail className="w-5 h-5 text-violet-400" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] sm:text-base text-white font-mono leading-snug">
            {inboxAddress}
          </p>
        </div>
        <button
          onClick={handleCopy}
          className={cn(
            'flex-shrink-0 inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-300',
            copied
              ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
              : 'bg-violet-500 hover:bg-violet-400 text-white'
          )}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              <span className="hidden sm:inline">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span className="hidden sm:inline">Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Simple 3-step how-it-works */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center text-center gap-2 p-3">
          <div className="w-8 h-8 rounded-full bg-violet-500/15 flex items-center justify-center">
            <Copy className="w-3.5 h-3.5 text-violet-400" />
          </div>
          <p className="text-xs text-zinc-400 leading-tight">
            <span className="text-zinc-300 font-medium">Copy</span> the address above
          </p>
        </div>
        <div className="flex flex-col items-center text-center gap-2 p-3">
          <div className="w-8 h-8 rounded-full bg-violet-500/15 flex items-center justify-center">
            <Send className="w-3.5 h-3.5 text-violet-400" />
          </div>
          <p className="text-xs text-zinc-400 leading-tight">
            <span className="text-zinc-300 font-medium">Forward</span> any bill email to it
          </p>
        </div>
        <div className="flex flex-col items-center text-center gap-2 p-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center">
            <Inbox className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <p className="text-xs text-zinc-400 leading-tight">
            Bill shows up on your <span className="text-zinc-300 font-medium">dashboard</span>
          </p>
        </div>
      </div>

      {/* Tips */}
      <div className="space-y-1.5 text-center">
        <p className="text-xs text-zinc-500">
          Works with Gmail, Yahoo, Outlook, iCloud — any email.
        </p>
        <p className="text-xs text-zinc-500">
          💡 <span className="text-zinc-400">Set up a forwarding rule in your email so new bills forward automatically. One-time setup, never think about it again.</span>
        </p>
      </div>
    </div>
  );
}
