'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, X, Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DeleteAccountModalProps {
  isOpen: boolean;
  userEmail: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteAccountModal({
  isOpen,
  userEmail,
  onClose,
  onConfirm,
}: DeleteAccountModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const confirmPhrase = 'DELETE';
  const isConfirmed = confirmText === confirmPhrase;

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setConfirmText('');
      setError(null);
      setIsDeleting(false);
    }
  }, [isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isDeleting, onClose]);

  const handleDelete = async () => {
    if (!isConfirmed) return;

    setIsDeleting(true);
    setError(null);

    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => !isDeleting && onClose()}
      />

      {/* Modal */}
      <div className="absolute inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div
            className={cn(
              'relative w-full max-w-md bg-[#0c0c10] border border-red-500/20 rounded-2xl shadow-2xl',
              'animate-in fade-in zoom-in-95 duration-200'
            )}
          >
            {/* Red glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-red-500/20 via-red-600/10 to-red-500/20 rounded-2xl blur-xl opacity-50" />

            <div className="relative">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-red-500/10">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="absolute inset-0 bg-red-500/30 rounded-full blur-lg animate-pulse" />
                    <div className="relative w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/30">
                      <Trash2 className="w-6 h-6 text-red-400" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Delete Account</h2>
                    <p className="text-sm text-red-400/80">This action is permanent</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  disabled={isDeleting}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-5">
                {/* Warning box */}
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                  <div className="flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="space-y-2">
                      <p className="text-sm text-red-300 font-medium">
                        You are about to permanently delete your account
                      </p>
                      <p className="text-sm text-zinc-400">
                        This will delete all your data including:
                      </p>
                      <ul className="text-sm text-zinc-500 list-disc list-inside space-y-1">
                        <li>All bills and payment history</li>
                        <li>Notification preferences</li>
                        <li>Connected Gmail data</li>
                        <li>Account settings</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Account info */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <p className="text-sm text-zinc-500 mb-1">Account to be deleted:</p>
                  <p className="text-white font-medium">{userEmail}</p>
                </div>

                {/* Confirmation input */}
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">
                    Type <span className="text-red-400 font-mono font-bold">{confirmPhrase}</span> to confirm:
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                    disabled={isDeleting}
                    placeholder="Type DELETE"
                    className={cn(
                      'w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-zinc-600',
                      'focus:outline-none focus:ring-2 transition-all',
                      isConfirmed
                        ? 'border-red-500/50 focus:ring-red-500/30'
                        : 'border-white/10 focus:ring-white/20',
                      'disabled:opacity-50'
                    )}
                  />
                </div>

                {/* Error message */}
                {error && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 p-6 border-t border-white/5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 text-white font-medium rounded-xl hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={!isConfirmed || isDeleting}
                  className={cn(
                    'flex-1 px-4 py-3 font-semibold rounded-xl transition-all flex items-center justify-center gap-2',
                    isConfirmed
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-red-500/20 text-red-400/50 cursor-not-allowed',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete My Account'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
