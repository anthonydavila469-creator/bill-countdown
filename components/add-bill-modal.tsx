'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { BillForm } from './bill-form';
import { BillFormData, Bill } from '@/types';
import { cn } from '@/lib/utils';

interface AddBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (bill: Bill) => void;
  editBill?: Bill | null;
  initialDate?: string;
  initialData?: Partial<BillFormData>; // For pre-filling from suggestions
  gmailMessageId?: string; // Track source for Gmail-imported bills
}

export function AddBillModal({
  isOpen,
  onClose,
  onSuccess,
  editBill,
  initialDate,
  initialData,
  gmailMessageId,
}: AddBillModalProps) {
  const [isLoading, setIsLoading] = useState(false);

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

  const handleSubmit = async (data: BillFormData) => {
    setIsLoading(true);

    try {
      const url = editBill ? `/api/bills/${editBill.id}` : '/api/bills';
      const method = editBill ? 'PUT' : 'POST';

      // Include gmail_message_id if creating from a suggestion
      const payload = gmailMessageId && !editBill
        ? { ...data, gmail_message_id: gmailMessageId, source: 'gmail' }
        : data;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save bill');
      }

      const bill = await response.json();
      onSuccess(bill);
      onClose();
    } catch (error) {
      console.error('Error saving bill:', error);
      // TODO: Show error toast
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="absolute inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div
            className={cn(
              'relative w-full max-w-lg bg-[#0c0c10] border border-white/10 rounded-2xl shadow-2xl',
              'animate-in fade-in zoom-in-95 duration-200'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-xl font-bold text-white">
                {editBill ? 'Edit Bill' : 'Add New Bill'}
              </h2>
              <button
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <div className="p-6">
              <BillForm
                initialData={
                  editBill
                    ? {
                        name: editBill.name,
                        amount: editBill.amount,
                        due_date: editBill.due_date,
                        emoji: editBill.emoji,
                        category: editBill.category,
                        is_recurring: editBill.is_recurring,
                        recurrence_interval: editBill.recurrence_interval,
                        recurrence_day_of_month: editBill.recurrence_day_of_month,
                        recurrence_weekday: editBill.recurrence_weekday,
                        payment_url: editBill.payment_url,
                        is_autopay: editBill.is_autopay,
                      }
                    : initialData
                    ? initialData
                    : initialDate
                    ? { due_date: initialDate }
                    : undefined
                }
                onSubmit={handleSubmit}
                onCancel={onClose}
                isLoading={isLoading}
                submitLabel={editBill ? 'Update Bill' : 'Add Bill'}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
