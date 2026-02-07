'use client';

import { useCallback } from 'react';
import { Bill } from '@/types';
import { useBillsContext, MutationState } from '@/contexts/bills-context';
import { useToast } from '@/components/ui/toast';

interface MarkPaidResult {
  success: boolean;
  paidBill?: Bill;
  nextBill?: Bill;
}

export function useBillMutations() {
  const { bills, loading, getMutationState, dispatch, refetch, unpaidBills, paidBills } =
    useBillsContext();
  const { showPaidToast, addToast } = useToast();

  /**
   * Mark a bill as paid with optimistic update
   */
  const markPaid = useCallback(
    async (bill: Bill, amount?: number | null): Promise<MarkPaidResult> => {
      // Prevent double-click
      if (getMutationState(bill.id)) {
        return { success: false };
      }

      // Store original state for undo
      const originalBill = { ...bill };

      // Start mutation
      dispatch({ type: 'START_MUTATION', billId: bill.id, state: 'marking_paid' });

      // Create optimistic paid bill
      const optimisticPaidBill: Bill = {
        ...bill,
        is_paid: true,
        paid_at: new Date().toISOString(),
        last_paid_amount: amount ?? bill.amount,
      };

      // Apply optimistic update
      dispatch({
        type: 'MARK_PAID_OPTIMISTIC',
        billId: bill.id,
        paidBill: optimisticPaidBill,
      });

      try {
        const response = await fetch(`/api/bills/${bill.id}/pay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount }),
        });

        if (!response.ok) {
          throw new Error('Failed to mark bill as paid');
        }

        const { paidBill, nextBill } = await response.json();

        // Update with real server data
        dispatch({
          type: 'MARK_PAID_OPTIMISTIC',
          billId: bill.id,
          paidBill,
          nextBill,
        });

        // Show toast with undo option
        showPaidToast(bill.name, amount ?? bill.amount, async () => {
          // Undo handler
          await undoPaid(bill, paidBill, nextBill?.id);
        });

        return { success: true, paidBill, nextBill };
      } catch (error) {
        console.error('Failed to mark bill as paid:', error);
        // Rollback optimistic update
        dispatch({
          type: 'UNDO_PAID_OPTIMISTIC',
          billId: bill.id,
          originalBill,
        });
        addToast({
          message: 'Something went wrong',
          description: 'Failed to mark bill as paid. Try again.',
          type: 'error',
        });
        return { success: false };
      } finally {
        dispatch({ type: 'END_MUTATION', billId: bill.id });
      }
    },
    [getMutationState, dispatch, showPaidToast, addToast]
  );

  /**
   * Undo a payment
   */
  const undoPaid = useCallback(
    async (originalBill: Bill, currentBill: Bill, nextBillId?: string): Promise<boolean> => {
      // Prevent double-click
      if (getMutationState(originalBill.id)) {
        return false;
      }

      dispatch({ type: 'START_MUTATION', billId: originalBill.id, state: 'undoing_payment' });

      // Optimistic rollback
      dispatch({
        type: 'UNDO_PAID_OPTIMISTIC',
        billId: originalBill.id,
        originalBill,
        removeNextBillId: nextBillId,
      });

      try {
        const response = await fetch(`/api/bills/${originalBill.id}/pay`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to undo payment');
        }

        // Refetch to ensure consistency
        await refetch();
        return true;
      } catch (error) {
        console.error('Failed to undo payment:', error);
        // Rollback the rollback (restore paid state)
        dispatch({
          type: 'MARK_PAID_OPTIMISTIC',
          billId: originalBill.id,
          paidBill: currentBill,
        });
        addToast({
          message: 'Something went wrong',
          description: 'Failed to undo payment. Try again.',
          type: 'error',
        });
        return false;
      } finally {
        dispatch({ type: 'END_MUTATION', billId: originalBill.id });
      }
    },
    [getMutationState, dispatch, refetch, addToast]
  );

  /**
   * Add a new bill with optimistic update
   */
  const addBill = useCallback(
    async (billData: Partial<Bill>): Promise<Bill | null> => {
      const tempId = `temp-${Date.now()}`;

      // Create optimistic bill
      const optimisticBill: Bill = {
        id: tempId,
        user_id: '',
        name: billData.name || '',
        amount: billData.amount || null,
        due_date: billData.due_date || new Date().toISOString().split('T')[0],
        emoji: billData.emoji || '📄',
        category: billData.category || null,
        is_paid: false,
        paid_at: null,
        paid_method: null,
        last_paid_amount: null,
        is_recurring: billData.is_recurring || false,
        recurrence_interval: billData.recurrence_interval || null,
        recurrence_day_of_month: billData.recurrence_day_of_month || null,
        recurrence_weekday: billData.recurrence_weekday || null,
        next_due_date: null,
        parent_bill_id: null,
        generated_next: false,
        source: 'manual',
        gmail_message_id: null,
        payment_url: billData.payment_url || null,
        is_autopay: billData.is_autopay || false,
        previous_amount: null,
        icon_key: billData.icon_key || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      dispatch({ type: 'START_MUTATION', billId: tempId, state: 'adding' });
      dispatch({ type: 'ADD_OPTIMISTIC_BILL', bill: optimisticBill });

      try {
        const response = await fetch('/api/bills', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(billData),
        });

        if (!response.ok) {
          throw new Error('Failed to add bill');
        }

        const newBill = await response.json();

        // Remove optimistic and refetch for real data
        dispatch({ type: 'REMOVE_OPTIMISTIC_BILL', billId: tempId });
        await refetch();

        addToast({
          message: `${newBill.name} added!`,
          type: 'success',
        });

        return newBill;
      } catch (error) {
        console.error('Failed to add bill:', error);
        dispatch({ type: 'REMOVE_OPTIMISTIC_BILL', billId: tempId });
        addToast({
          message: 'Something went wrong',
          description: 'Failed to add bill. Try again.',
          type: 'error',
        });
        return null;
      } finally {
        dispatch({ type: 'END_MUTATION', billId: tempId });
      }
    },
    [dispatch, refetch, addToast]
  );

  /**
   * Update a bill with optimistic update
   */
  const updateBill = useCallback(
    async (billId: string, updates: Partial<Bill>): Promise<Bill | null> => {
      // Prevent double-click
      if (getMutationState(billId)) {
        return null;
      }

      const bill = bills.find((b) => b.id === billId);
      if (!bill) {
        addToast({
          message: 'Bill not found',
          type: 'error',
        });
        return null;
      }

      // Store previous state for rollback
      const previousBill = { ...bill };

      dispatch({ type: 'START_MUTATION', billId, state: 'editing' });
      dispatch({ type: 'UPDATE_OPTIMISTIC_BILL', billId, updates });

      try {
        const response = await fetch(`/api/bills/${billId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...bill, ...updates }),
        });

        if (!response.ok) {
          throw new Error('Failed to update bill');
        }

        const updatedBill = await response.json();

        // Refetch to ensure consistency
        await refetch();

        addToast({
          message: `${updatedBill.name} updated!`,
          type: 'success',
        });

        return updatedBill;
      } catch (error) {
        console.error('Failed to update bill:', error);
        // Rollback to previous state
        dispatch({ type: 'UPDATE_OPTIMISTIC_BILL', billId, updates: previousBill });
        addToast({
          message: 'Something went wrong',
          description: 'Failed to update bill. Try again.',
          type: 'error',
        });
        return null;
      } finally {
        dispatch({ type: 'END_MUTATION', billId });
      }
    },
    [bills, getMutationState, dispatch, refetch, addToast]
  );

  /**
   * Delete a bill with optimistic update
   */
  const deleteBill = useCallback(
    async (billId: string): Promise<boolean> => {
      // Prevent double-click
      if (getMutationState(billId)) {
        return false;
      }

      const bill = bills.find((b) => b.id === billId);
      if (!bill) {
        addToast({
          message: 'Bill not found',
          type: 'error',
        });
        return false;
      }

      dispatch({ type: 'START_MUTATION', billId, state: 'deleting' });
      dispatch({ type: 'ADD_DELETED_BILL', billId });

      try {
        const response = await fetch(`/api/bills/${billId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete bill');
        }

        // Refetch to ensure consistency
        await refetch();

        addToast({
          message: `${bill.name} deleted`,
          type: 'success',
        });

        return true;
      } catch (error) {
        console.error('Failed to delete bill:', error);
        // Rollback
        dispatch({ type: 'REMOVE_DELETED_BILL', billId });
        addToast({
          message: 'Something went wrong',
          description: 'Failed to delete bill. Try again.',
          type: 'error',
        });
        return false;
      } finally {
        dispatch({ type: 'END_MUTATION', billId });
      }
    },
    [bills, getMutationState, dispatch, refetch, addToast]
  );

  /**
   * Snooze a bill (change due date)
   */
  const snoozeBill = useCallback(
    async (billId: string, daysToAdd: number): Promise<boolean> => {
      // Prevent double-click
      if (getMutationState(billId)) {
        return false;
      }

      const bill = bills.find((b) => b.id === billId);
      if (!bill) {
        addToast({
          message: 'Bill not found',
          type: 'error',
        });
        return false;
      }

      const currentDate = new Date(bill.due_date);
      currentDate.setDate(currentDate.getDate() + daysToAdd);
      const newDueDate = currentDate.toISOString().split('T')[0];

      dispatch({ type: 'START_MUTATION', billId, state: 'snoozing' });
      dispatch({ type: 'UPDATE_OPTIMISTIC_BILL', billId, updates: { due_date: newDueDate } });

      try {
        const response = await fetch(`/api/bills/${billId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...bill, due_date: newDueDate }),
        });

        if (!response.ok) {
          throw new Error('Failed to snooze bill');
        }

        await refetch();

        addToast({
          message: `${bill.name} snoozed`,
          description: `Due date moved to ${new Date(newDueDate).toLocaleDateString()}`,
          type: 'success',
        });

        return true;
      } catch (error) {
        console.error('Failed to snooze bill:', error);
        // Rollback
        dispatch({ type: 'UPDATE_OPTIMISTIC_BILL', billId, updates: { due_date: bill.due_date } });
        addToast({
          message: 'Something went wrong',
          description: 'Failed to snooze bill. Try again.',
          type: 'error',
        });
        return false;
      } finally {
        dispatch({ type: 'END_MUTATION', billId });
      }
    },
    [bills, getMutationState, dispatch, refetch, addToast]
  );

  return {
    // State
    bills,
    unpaidBills,
    paidBills,
    loading,

    // Mutation state
    getMutationState,

    // Mutations
    markPaid,
    undoPaid,
    addBill,
    updateBill,
    deleteBill,
    snoozeBill,

    // Utilities
    refetch,
  };
}
