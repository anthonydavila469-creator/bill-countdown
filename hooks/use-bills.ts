'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bill } from '@/types';

interface UseBillsOptions {
  showPaid?: boolean;
  category?: string;
}

interface UseBillsReturn {
  bills: Bill[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addBill: (bill: Bill) => void;
  updateBill: (bill: Bill) => void;
  removeBill: (id: string) => void;
}

export function useBills(options: UseBillsOptions = {}): UseBillsReturn {
  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBills = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (options.showPaid) params.set('showPaid', 'true');
      if (options.category) params.set('category', options.category);

      const url = `/api/bills${params.toString() ? `?${params}` : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch bills');
      }

      const data = await response.json();
      setBills(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [options.showPaid, options.category]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  // Optimistically add a bill to the list
  const addBill = useCallback((bill: Bill) => {
    setBills((prev) => {
      // Insert in sorted order by due date
      const newBills = [...prev, bill];
      return newBills.sort(
        (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      );
    });
  }, []);

  // Optimistically update a bill in the list
  const updateBill = useCallback((updatedBill: Bill) => {
    setBills((prev) =>
      prev
        .map((bill) => (bill.id === updatedBill.id ? updatedBill : bill))
        .sort(
          (a, b) =>
            new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
        )
    );
  }, []);

  // Optimistically remove a bill from the list
  const removeBill = useCallback((id: string) => {
    setBills((prev) => prev.filter((bill) => bill.id !== id));
  }, []);

  return {
    bills,
    isLoading,
    error,
    refetch: fetchBills,
    addBill,
    updateBill,
    removeBill,
  };
}

// Hook for a single bill
export function useBill(id: string) {
  const [bill, setBill] = useState<Bill | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBill = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/bills/${id}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch bill');
      }

      const data = await response.json();
      setBill(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBill();
  }, [fetchBill]);

  return {
    bill,
    isLoading,
    error,
    refetch: fetchBill,
  };
}

// Hook for deleting a bill
export function useDeleteBill() {
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteBill = async (id: string): Promise<boolean> => {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/bills/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete bill');
      }

      return true;
    } catch (err) {
      console.error('Error deleting bill:', err);
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  return { deleteBill, isDeleting };
}

// Hook for marking a bill as paid
export function useMarkAsPaid() {
  const [isUpdating, setIsUpdating] = useState(false);

  const markAsPaid = async (bill: Bill): Promise<Bill | null> => {
    setIsUpdating(true);

    try {
      const response = await fetch(`/api/bills/${bill.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...bill,
          is_paid: true,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update bill');
      }

      return await response.json();
    } catch (err) {
      console.error('Error marking bill as paid:', err);
      return null;
    } finally {
      setIsUpdating(false);
    }
  };

  return { markAsPaid, isUpdating };
}
