'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Sparkles,
  Check,
  CheckCircle2,
  AlertCircle,
  Calendar,
  DollarSign,
  RefreshCw,
  Inbox,
  ArrowRight,
} from 'lucide-react';
import { ParsedBill, BillCategory } from '@/types';
import { cn, formatCurrency } from '@/lib/utils';
import { getIconFromName } from '@/lib/get-bill-icon';

interface BillImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (bills: ParsedBill[]) => Promise<void>;
}

type ImportStep = 'syncing' | 'parsing' | 'review';

interface EditableBill extends ParsedBill {
  selected: boolean;
  editingAmount: boolean;
  editingDate: boolean;
}


// Confidence indicator component
function ConfidenceIndicator({ confidence }: { confidence: number }) {
  const percentage = Math.round(confidence * 100);
  const isHigh = confidence >= 0.7;
  const isMedium = confidence >= 0.5 && confidence < 0.7;

  return (
    <div className="flex items-center gap-1.5">
      <div
        className={cn(
          'w-2 h-2 rounded-full',
          isHigh && 'bg-emerald-400',
          isMedium && 'bg-violet-300',
          !isHigh && !isMedium && 'bg-zinc-500'
        )}
      />
      <span
        className={cn(
          'text-xs font-medium',
          isHigh && 'text-emerald-400',
          isMedium && 'text-violet-300',
          !isHigh && !isMedium && 'text-zinc-500'
        )}
      >
        {percentage}%
      </span>
    </div>
  );
}

// Step indicator component
function StepIndicator({
  step,
  currentStep,
  label,
  icon: Icon,
}: {
  step: ImportStep;
  currentStep: ImportStep;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const steps: ImportStep[] = ['syncing', 'parsing', 'review'];
  const currentIndex = steps.indexOf(currentStep);
  const stepIndex = steps.indexOf(step);
  const isActive = currentStep === step;
  const isComplete = stepIndex < currentIndex;

  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300',
          isActive && 'bg-violet-500/20 border-2 border-violet-500',
          isComplete && 'bg-emerald-500/20 border-2 border-emerald-500',
          !isActive && !isComplete && 'bg-white/5 border-2 border-white/10'
        )}
      >
        {isComplete ? (
          <Check className="w-5 h-5 text-emerald-400" />
        ) : (
          <Icon
            className={cn(
              'w-5 h-5',
              isActive ? 'text-violet-400' : 'text-zinc-500'
            )}
          />
        )}
      </div>
      <span
        className={cn(
          'text-sm font-medium hidden sm:block',
          isActive && 'text-white',
          isComplete && 'text-emerald-400',
          !isActive && !isComplete && 'text-zinc-500'
        )}
      >
        {label}
      </span>
    </div>
  );
}

export function BillImportModal({
  isOpen,
  onClose,
  onImport,
}: BillImportModalProps) {
  const [step, setStep] = useState<ImportStep>('syncing');
  const [bills, setBills] = useState<EditableBill[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState(0);
  const [parseProgress, setParseProgress] = useState(0);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('syncing');
      setBills([]);
      setError(null);
      setSyncProgress(0);
      setParseProgress(0);
      startImportFlow();
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

  const startImportFlow = async () => {
    try {
      // Step 1: Sync emails
      setStep('syncing');
      setError(null);

      // Animate progress for syncing
      const syncInterval = setInterval(() => {
        setSyncProgress((prev) => Math.min(prev + 5, 45));
      }, 200);

      // Step 2: Parse with AI - use the same suggestions endpoint as Suggestions page
      // This ensures we get the same filtered and processed bills
      setStep('parsing');

      clearInterval(syncInterval);
      setSyncProgress(100);

      const parseInterval = setInterval(() => {
        setParseProgress((prev) => Math.min(prev + 3, 90));
      }, 200);

      const response = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxResults: 200, daysBack: 90 }),
      });

      clearInterval(parseInterval);
      setParseProgress(100);

      if (!response.ok) {
        const data = await response.json();
        if (data.code === 'GMAIL_NOT_CONNECTED') {
          throw new Error('Gmail is not connected. Please connect Gmail in Settings.');
        } else if (data.code === 'TOKEN_REFRESH_FAILED') {
          throw new Error('Gmail access expired. Please reconnect Gmail in Settings.');
        }
        throw new Error(data.error || 'Failed to scan emails');
      }

      const { suggestions } = await response.json();

      if (!suggestions || suggestions.length === 0) {
        setBills([]);
        setStep('review');
        return;
      }

      // Convert suggestions to the ParsedBill format
      const editableBills: EditableBill[] = suggestions.map(
        (suggestion: {
          gmail_message_id: string;
          name_guess: string;
          amount_guess: number | null;
          due_date_guess: string | null;
          category_guess: BillCategory | null;
          payment_url_guess: string | null;
          confidence: number;
        }) => ({
          name: suggestion.name_guess,
          amount: suggestion.amount_guess,
          due_date: suggestion.due_date_guess,
          category: suggestion.category_guess,
          payment_url: suggestion.payment_url_guess || null,
          confidence: suggestion.confidence || 0.5,
          source_email_id: suggestion.gmail_message_id, // Map to expected field name
          is_recurring: false,
          recurrence_interval: null,
          selected: (suggestion.confidence || 0.5) >= 0.5,
          editingAmount: false,
          editingDate: false,
        })
      );

      setBills(editableBills);
      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setStep('review');
    }
  };

  const toggleSelectAll = () => {
    const allSelected = bills.every((b) => b.selected);
    setBills(bills.map((b) => ({ ...b, selected: !allSelected })));
  };

  const toggleBillSelection = (index: number) => {
    setBills(
      bills.map((b, i) => (i === index ? { ...b, selected: !b.selected } : b))
    );
  };

  const updateBillAmount = (index: number, amount: string) => {
    const numAmount = parseFloat(amount) || null;
    setBills(
      bills.map((b, i) =>
        i === index ? { ...b, amount: numAmount, editingAmount: false } : b
      )
    );
  };

  const updateBillDate = (index: number, date: string) => {
    setBills(
      bills.map((b, i) =>
        i === index ? { ...b, due_date: date || null, editingDate: false } : b
      )
    );
  };

  const handleImport = async () => {
    const selectedBills = bills
      .filter((b) => b.selected)
      .map(({ selected, editingAmount, editingDate, ...bill }) => bill);

    if (selectedBills.length === 0) return;

    setIsImporting(true);
    try {
      await onImport(selectedBills);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import bills');
    } finally {
      setIsImporting(false);
    }
  };

  const selectedCount = bills.filter((b) => b.selected).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="absolute inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div
            className={cn(
              'relative w-full max-w-2xl bg-[#0c0c10] border border-white/10 rounded-2xl shadow-2xl overflow-hidden',
              'animate-in fade-in zoom-in-95 duration-200'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-400/20 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Import Bills from Email
                  </h2>
                  <p className="text-sm text-zinc-500">
                    AI-powered bill detection
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step indicators */}
            <div className="px-6 py-4 border-b border-white/5 bg-white/[0.01]">
              <div className="flex items-center justify-between">
                <StepIndicator
                  step="syncing"
                  currentStep={step}
                  label="Sync Emails"
                  icon={Mail}
                />
                <ArrowRight className="w-4 h-4 text-zinc-600" />
                <StepIndicator
                  step="parsing"
                  currentStep={step}
                  label="AI Parsing"
                  icon={Sparkles}
                />
                <ArrowRight className="w-4 h-4 text-zinc-600" />
                <StepIndicator
                  step="review"
                  currentStep={step}
                  label="Review"
                  icon={CheckCircle2}
                />
              </div>
            </div>

            {/* Content */}
            <div className="p-6 min-h-[300px]">
              {/* Syncing state */}
              {step === 'syncing' && (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="relative mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                      <Mail className="w-8 h-8 text-violet-400" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#0c0c10] flex items-center justify-center">
                      <RefreshCw className="w-4 h-4 text-violet-400 animate-spin" />
                    </div>
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">
                    Syncing your emails
                  </h3>
                  <p className="text-sm text-zinc-500 mb-6 text-center">
                    Searching for bill-related emails in your inbox...
                  </p>
                  <div className="w-64 h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-violet-400 rounded-full transition-all duration-300"
                      style={{ width: `${syncProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Parsing state */}
              {step === 'parsing' && (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="relative mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-violet-400/10 flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-violet-300" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#0c0c10] flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-violet-300 border-t-transparent rounded-full animate-spin" />
                    </div>
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">
                    AI is analyzing your emails
                  </h3>
                  <p className="text-sm text-zinc-500 mb-6 text-center">
                    Extracting bill details, amounts, and due dates...
                  </p>
                  <div className="w-64 h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-400 to-pink-500 rounded-full transition-all duration-300"
                      style={{ width: `${parseProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Review state */}
              {step === 'review' && (
                <>
                  {/* Error message */}
                  {error && (
                    <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-400">
                          Error
                        </p>
                        <p className="text-sm text-zinc-400">{error}</p>
                      </div>
                    </div>
                  )}

                  {/* Empty state */}
                  {bills.length === 0 && !error && (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="w-16 h-16 rounded-2xl bg-zinc-500/10 flex items-center justify-center mb-6">
                        <Inbox className="w-8 h-8 text-zinc-500" />
                      </div>
                      <h3 className="text-lg font-medium text-white mb-2">
                        No bills found
                      </h3>
                      <p className="text-sm text-zinc-500 text-center max-w-xs">
                        We couldn&apos;t find any bill-related emails in your inbox.
                        Try adding bills manually instead.
                      </p>
                    </div>
                  )}

                  {/* Bills list */}
                  {bills.length > 0 && (
                    <>
                      {/* Select all */}
                      <div className="flex items-center justify-between mb-4">
                        <button
                          onClick={toggleSelectAll}
                          className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
                        >
                          {bills.every((b) => b.selected)
                            ? 'Deselect All'
                            : 'Select All'}
                        </button>
                        <span className="text-sm text-zinc-500">
                          {selectedCount} of {bills.length} selected
                        </span>
                      </div>

                      {/* Bills */}
                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                        {bills.map((bill, index) => (
                          <div
                            key={index}
                            className={cn(
                              'p-4 rounded-xl border transition-all duration-200',
                              bill.selected
                                ? 'bg-white/[0.03] border-violet-500/30'
                                : 'bg-white/[0.01] border-white/5 opacity-60'
                            )}
                          >
                            <div className="flex items-start gap-4">
                              {/* Checkbox */}
                              <button
                                onClick={() => toggleBillSelection(index)}
                                className={cn(
                                  'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-1 transition-colors',
                                  bill.selected
                                    ? 'bg-violet-500 border-violet-500'
                                    : 'border-white/20 hover:border-white/40'
                                )}
                              >
                                {bill.selected && (
                                  <Check className="w-3 h-3 text-white" />
                                )}
                              </button>

                              {/* Icon */}
                              {(() => {
                                const { icon: IconComponent, colorClass } = getIconFromName(bill.name);
                                return (
                                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                                    <IconComponent className={cn('w-5 h-5', colorClass)} />
                                  </div>
                                );
                              })()}

                              {/* Details */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium text-white truncate">
                                    {bill.name}
                                  </h4>
                                  <ConfidenceIndicator
                                    confidence={bill.confidence}
                                  />
                                </div>

                                <div className="flex flex-wrap items-center gap-4 text-sm">
                                  {/* Amount */}
                                  <div className="flex items-center gap-1.5">
                                    <DollarSign className="w-3.5 h-3.5 text-zinc-500" />
                                    {bill.editingAmount ? (
                                      <input
                                        type="number"
                                        step="0.01"
                                        defaultValue={bill.amount || ''}
                                        onBlur={(e) =>
                                          updateBillAmount(index, e.target.value)
                                        }
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            updateBillAmount(
                                              index,
                                              (e.target as HTMLInputElement).value
                                            );
                                          }
                                        }}
                                        className="w-20 px-2 py-0.5 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
                                        autoFocus
                                      />
                                    ) : (
                                      <button
                                        onClick={() =>
                                          setBills(
                                            bills.map((b, i) =>
                                              i === index
                                                ? { ...b, editingAmount: true }
                                                : b
                                            )
                                          )
                                        }
                                        className={cn(
                                          'hover:text-white transition-colors',
                                          bill.amount
                                            ? 'text-zinc-300'
                                            : 'text-violet-300'
                                        )}
                                      >
                                        {bill.amount
                                          ? formatCurrency(bill.amount)
                                          : 'Add amount'}
                                      </button>
                                    )}
                                  </div>

                                  {/* Due date */}
                                  <div className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                                    {bill.editingDate ? (
                                      <input
                                        type="date"
                                        defaultValue={bill.due_date || ''}
                                        onBlur={(e) =>
                                          updateBillDate(index, e.target.value)
                                        }
                                        className="px-2 py-0.5 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
                                        autoFocus
                                      />
                                    ) : (
                                      <button
                                        onClick={() =>
                                          setBills(
                                            bills.map((b, i) =>
                                              i === index
                                                ? { ...b, editingDate: true }
                                                : b
                                            )
                                          )
                                        }
                                        className={cn(
                                          'hover:text-white transition-colors',
                                          bill.due_date
                                            ? 'text-zinc-300'
                                            : 'text-violet-300'
                                        )}
                                      >
                                        {bill.due_date || 'Add due date'}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            {step === 'review' && (
              <div className="flex items-center justify-between p-6 border-t border-white/10 bg-white/[0.01]">
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 text-zinc-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                {bills.length > 0 && (
                  <button
                    onClick={handleImport}
                    disabled={selectedCount === 0 || isImporting}
                    className="flex items-center gap-2 px-6 py-2.5 text-white font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: 'var(--accent-primary)' }}
                  >
                    {isImporting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Import Selected ({selectedCount})
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
