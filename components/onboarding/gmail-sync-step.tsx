'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useSubscription } from '@/hooks/use-subscription';
import { Bill } from '@/types';
import {
  Mail,
  Loader2,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ChevronLeft,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

interface GmailSyncStepProps {
  onBack: () => void;
  onComplete: (importedBills: Bill[]) => void;
  onSkip: () => void;
  isGmailConnected: boolean;
}

type SyncStatus = 'idle' | 'connecting' | 'syncing' | 'parsing' | 'success' | 'no_bills' | 'error';

export function GmailSyncStep({
  onBack,
  onComplete,
  onSkip,
  isGmailConnected,
}: GmailSyncStepProps) {
  const { isPro, canSyncGmail, incrementGmailSyncs } = useSubscription();
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [foundBills, setFoundBills] = useState<Bill[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Start sync automatically if Gmail is already connected
  useEffect(() => {
    if (isGmailConnected && status === 'idle') {
      handleSync();
    }
  }, [isGmailConnected]);

  const handleConnect = async () => {
    setStatus('connecting');
    setError(null);

    try {
      const response = await fetch('/api/gmail/connect');
      const data = await response.json();

      if (data.url) {
        // Store return path for OAuth callback
        localStorage.setItem('gmail_oauth_return', '/dashboard?onboarding=gmail_sync');
        window.location.href = data.url;
      } else {
        throw new Error('Failed to get OAuth URL');
      }
    } catch (err) {
      console.error('Gmail connect error:', err);
      setStatus('error');
      setError('Failed to connect to Gmail. Please try again.');
    }
  };

  const handleSync = async () => {
    setStatus('syncing');
    setError(null);

    try {
      // Fetch emails from Gmail
      const syncResponse = await fetch('/api/gmail/sync', {
        method: 'POST',
      });

      if (!syncResponse.ok) {
        throw new Error('Failed to sync emails');
      }

      setStatus('parsing');

      // Parse bills from emails using AI
      const parseResponse = await fetch('/api/suggestions', {
        method: 'GET',
      });

      if (!parseResponse.ok) {
        throw new Error('Failed to parse bills');
      }

      const { suggestions } = await parseResponse.json();

      // Increment gmail syncs count for free users
      if (!isPro) {
        await incrementGmailSyncs();
      }

      if (suggestions && suggestions.length > 0) {
        setFoundBills(suggestions);
        setStatus('success');
      } else {
        setStatus('no_bills');
      }
    } catch (err) {
      console.error('Gmail sync error:', err);
      setStatus('error');
      setError('Failed to sync bills from Gmail. Please try again.');
    }
  };

  const handleImport = async () => {
    // Import all found bills
    try {
      for (const bill of foundBills) {
        await fetch('/api/bills', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bill),
        });
      }
      onComplete(foundBills);
    } catch (err) {
      console.error('Import error:', err);
      setError('Failed to import some bills. Please try again.');
    }
  };

  // Render based on status
  const renderContent = () => {
    switch (status) {
      case 'idle':
        return (
          <div className="text-center">
            <div className="relative inline-flex mb-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-400 flex items-center justify-center">
                <Mail className="w-10 h-10 text-white" />
              </div>
              <div className="absolute -inset-2 bg-gradient-to-br from-violet-500/30 to-violet-400/30 rounded-3xl blur-xl -z-10" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              Connect Gmail
            </h2>
            <p className="text-white/50 mb-8">
              We&apos;ll scan your inbox for bill-related emails and automatically import them.
              {!isPro && (
                <span className="block mt-2 text-violet-300/80 text-sm">
                  Free accounts get 1 Gmail sync
                </span>
              )}
            </p>
            <button
              onClick={handleConnect}
              className="w-full py-4 rounded-xl font-semibold bg-gradient-to-r from-violet-500 to-violet-400 text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <Mail className="w-5 h-5" />
              Connect Gmail
            </button>
          </div>
        );

      case 'connecting':
        return (
          <div className="text-center py-8">
            <Loader2 className="w-12 h-12 text-violet-400 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Connecting...</h2>
            <p className="text-white/50">Opening Gmail authorization...</p>
          </div>
        );

      case 'syncing':
        return (
          <div className="text-center py-8">
            <div className="relative inline-flex mb-4">
              <RefreshCw className="w-12 h-12 text-violet-400 animate-spin" />
              <div className="absolute inset-0 bg-violet-500/30 blur-xl rounded-full" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Scanning Inbox</h2>
            <p className="text-white/50">Looking for bill-related emails...</p>
          </div>
        );

      case 'parsing':
        return (
          <div className="text-center py-8">
            <div className="relative inline-flex mb-4">
              <Sparkles className="w-12 h-12 text-violet-300 animate-pulse" />
              <div className="absolute inset-0 bg-violet-400/30 blur-xl rounded-full" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Analyzing Emails</h2>
            <p className="text-white/50">AI is extracting bill information...</p>
          </div>
        );

      case 'success':
        return (
          <div className="text-center">
            <div className="relative inline-flex mb-6">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              Found {foundBills.length} Bill{foundBills.length === 1 ? '' : 's'}!
            </h2>
            <p className="text-white/50 mb-6">
              We detected these bills from your emails
            </p>

            {/* Bill preview list */}
            <div className="max-h-48 overflow-y-auto mb-6 space-y-2">
              {foundBills.slice(0, 5).map((bill, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-white/10"
                >
                  <span className="text-white font-medium">{bill.name}</span>
                  {bill.amount && (
                    <span className="text-emerald-400 font-semibold">
                      ${bill.amount.toFixed(2)}
                    </span>
                  )}
                </div>
              ))}
              {foundBills.length > 5 && (
                <p className="text-sm text-white/40">
                  +{foundBills.length - 5} more bills
                </p>
              )}
            </div>

            <button
              onClick={handleImport}
              className="w-full py-4 rounded-xl font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              Import All Bills
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        );

      case 'no_bills':
        return (
          <div className="text-center">
            <div className="relative inline-flex mb-6">
              <div className="w-16 h-16 rounded-2xl bg-violet-400/20 border border-violet-400/30 flex items-center justify-center">
                <Mail className="w-8 h-8 text-violet-300" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">No Bills Found</h2>
            <p className="text-white/50 mb-6">
              We couldn&apos;t find any bill-related emails in your inbox. You can add bills manually instead.
            </p>
            <button
              onClick={onSkip}
              className="w-full py-4 rounded-xl font-semibold bg-gradient-to-r from-violet-400 to-violet-500 text-white hover:opacity-90 transition-opacity"
            >
              Add Bills Manually
            </button>
          </div>
        );

      case 'error':
        return (
          <div className="text-center">
            <div className="relative inline-flex mb-6">
              <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Sync Failed</h2>
            <p className="text-white/50 mb-2">{error}</p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStatus('idle')}
                className="flex-1 py-3 rounded-xl font-medium bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={onSkip}
                className="flex-1 py-3 rounded-xl font-medium bg-violet-400 text-white hover:bg-violet-500 transition-colors"
              >
                Skip
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Back button */}
      {status === 'idle' && (
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onBack}
            className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-white">Gmail Sync</h2>
            <p className="text-sm text-white/50">Import bills from your inbox</p>
          </div>
        </div>
      )}

      {renderContent()}

      {/* Skip link for idle state */}
      {status === 'idle' && (
        <button
          onClick={onSkip}
          className="w-full mt-4 py-3 text-white/50 hover:text-white transition-colors text-sm"
        >
          Skip and add bills manually
        </button>
      )}
    </div>
  );
}
