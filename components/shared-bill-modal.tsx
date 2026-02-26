'use client';

import { useState, useEffect } from 'react';
import { X, Users, Check, Trash2 } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { Bill } from '@/types';
import { SharedBill, SplitType, SharedBillStatus } from '@/hooks/use-shared-bills';

interface SharedBillModalProps {
  isOpen: boolean;
  bill: Bill | null;
  existingSharedBill: SharedBill | null;
  onClose: () => void;
  onSave: (
    billId: string,
    partnerName: string,
    partnerEmail: string | null,
    splitType: SplitType,
    billAmount: number,
    customPercent?: number,
    fixedAmount?: number
  ) => void;
  onUpdateStatus: (id: string, status: SharedBillStatus) => void;
  onRemove: (billId: string) => void;
}

export function SharedBillModal({
  isOpen,
  bill,
  existingSharedBill,
  onClose,
  onSave,
  onUpdateStatus,
  onRemove,
}: SharedBillModalProps) {
  const [partnerName, setPartnerName] = useState('');
  const [partnerEmail, setPartnerEmail] = useState('');
  const [splitType, setSplitType] = useState<SplitType>('50/50');
  const [customPercent, setCustomPercent] = useState(50);
  const [fixedAmount, setFixedAmount] = useState(0);
  const [status, setStatus] = useState<SharedBillStatus>('pending');

  const billAmount = bill?.amount || 0;

  // Initialize form with existing data
  useEffect(() => {
    if (existingSharedBill) {
      setPartnerName(existingSharedBill.partnerName);
      setPartnerEmail(existingSharedBill.partnerEmail || '');
      setSplitType(existingSharedBill.splitType);
      setCustomPercent(existingSharedBill.yourPercent);
      setFixedAmount(existingSharedBill.theirAmount);
      setStatus(existingSharedBill.status);
    } else {
      // Reset form for new shared bill
      setPartnerName('');
      setPartnerEmail('');
      setSplitType('50/50');
      setCustomPercent(50);
      setFixedAmount(billAmount / 2);
      setStatus('pending');
    }
  }, [existingSharedBill, billAmount, isOpen]);

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
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen || !bill) return null;

  // Calculate split amounts
  let yourAmount = billAmount / 2;
  let theirAmount = billAmount / 2;

  if (splitType === '50/50') {
    yourAmount = billAmount / 2;
    theirAmount = billAmount / 2;
  } else if (splitType === 'custom') {
    yourAmount = (billAmount * customPercent) / 100;
    theirAmount = billAmount - yourAmount;
  } else if (splitType === 'fixed') {
    theirAmount = fixedAmount;
    yourAmount = billAmount - fixedAmount;
  }

  const handleSave = () => {
    if (!partnerName.trim()) return;

    onSave(
      bill.id,
      partnerName.trim(),
      partnerEmail.trim() || null,
      splitType,
      billAmount,
      splitType === 'custom' ? customPercent : undefined,
      splitType === 'fixed' ? fixedAmount : undefined
    );

    // Update status if editing existing
    if (existingSharedBill && status !== existingSharedBill.status) {
      onUpdateStatus(existingSharedBill.id, status);
    }

    onClose();
  };

  const handleRemove = () => {
    onRemove(bill.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="absolute inset-0 overflow-y-auto">
        <div className="flex min-h-full items-end sm:items-center justify-center p-4 pb-28 sm:pb-4">
          <div
            className={cn(
              'relative w-full max-w-md bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden',
              'animate-in fade-in zoom-in-95 duration-200'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {existingSharedBill ? 'Edit Split' : 'Share Bill'}
                  </h2>
                  <p className="text-sm text-white/60">{bill.name}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              {/* Partner Name */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Partner Name
                </label>
                <input
                  type="text"
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  placeholder="e.g. Alex, Roommate"
                  className={cn(
                    'w-full px-4 py-3 rounded-xl',
                    'bg-white/5 border border-white/10',
                    'text-white placeholder:text-white/30',
                    'focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20',
                    'transition-all duration-200'
                  )}
                />
              </div>

              {/* Partner Email (optional) */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Partner Email <span className="text-white/40">(optional)</span>
                </label>
                <input
                  type="email"
                  value={partnerEmail}
                  onChange={(e) => setPartnerEmail(e.target.value)}
                  placeholder="partner@email.com"
                  className={cn(
                    'w-full px-4 py-3 rounded-xl',
                    'bg-white/5 border border-white/10',
                    'text-white placeholder:text-white/30',
                    'focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20',
                    'transition-all duration-200'
                  )}
                />
              </div>

              {/* Split Type */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Split Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['50/50', 'custom', 'fixed'] as SplitType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setSplitType(type)}
                      className={cn(
                        'px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                        splitType === type
                          ? 'bg-white/20 text-white border border-white/30'
                          : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
                      )}
                    >
                      {type === '50/50' ? '50/50' : type === 'custom' ? 'Custom %' : 'Fixed $'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Percentage Slider */}
              {splitType === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Your Share: {customPercent}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={customPercent}
                    onChange={(e) => setCustomPercent(Number(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
                  />
                  <div className="flex justify-between text-xs text-white/40 mt-1">
                    <span>You: {customPercent}%</span>
                    <span>Them: {100 - customPercent}%</span>
                  </div>
                </div>
              )}

              {/* Fixed Amount Input */}
              {splitType === 'fixed' && (
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Their Fixed Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">$</span>
                    <input
                      type="number"
                      min="0"
                      max={billAmount}
                      step="0.01"
                      value={fixedAmount}
                      onChange={(e) => setFixedAmount(Math.min(Number(e.target.value), billAmount))}
                      className={cn(
                        'w-full pl-8 pr-4 py-3 rounded-xl',
                        'bg-white/5 border border-white/10',
                        'text-white placeholder:text-white/30',
                        'focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20',
                        'transition-all duration-200'
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Split Preview */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-sm text-white/60 mb-3">Split Preview</p>
                <div className="flex items-center justify-between">
                  <div className="text-center flex-1">
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(yourAmount)}
                    </p>
                    <p className="text-xs text-white/50 mt-1">You pay</p>
                  </div>
                  <div className="w-px h-12 bg-white/10" />
                  <div className="text-center flex-1">
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(theirAmount)}
                    </p>
                    <p className="text-xs text-white/50 mt-1">
                      {partnerName || 'They'} pay{partnerName ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status (only for existing shared bills) */}
              {existingSharedBill && (
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Status
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['pending', 'confirmed', 'paid'] as SharedBillStatus[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => setStatus(s)}
                        className={cn(
                          'px-4 py-2.5 rounded-xl text-sm font-medium capitalize transition-all duration-200',
                          status === s
                            ? s === 'paid'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : s === 'confirmed'
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-6 pt-0 pb-28 sm:pb-6 space-y-3">
              {/* Save Button with inline gradient style */}
              <button
                onClick={handleSave}
                disabled={!partnerName.trim()}
                className={cn(
                  'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold',
                  'text-white transition-all duration-200',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'hover:opacity-90 active:scale-[0.98]'
                )}
                style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
                }}
              >
                <Check className="w-5 h-5" />
                {existingSharedBill ? 'Update Split' : 'Share Bill'}
              </button>

              {/* Remove Button (only for existing) */}
              {existingSharedBill && (
                <button
                  onClick={handleRemove}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/5 border border-white/10 text-red-400 font-medium rounded-xl hover:bg-red-500/10 hover:border-red-500/20 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove Split
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
