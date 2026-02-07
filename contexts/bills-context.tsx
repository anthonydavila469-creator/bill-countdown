'use client';

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { Bill } from '@/types';

// Mutation states for per-bill loading indicators
export type MutationState =
  | 'marking_paid'
  | 'undoing_payment'
  | 'deleting'
  | 'adding'
  | 'editing'
  | 'snoozing'
  | null;

// State shape
interface BillsState {
  bills: Bill[];
  deletedBillIds: Set<string>;
  mutatingBills: Map<string, MutationState>;
  loading: boolean;
  lastFetched: number | null;
}

// Actions
type BillsAction =
  | { type: 'SET_BILLS'; bills: Bill[] }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'START_MUTATION'; billId: string; state: MutationState }
  | { type: 'END_MUTATION'; billId: string }
  | { type: 'ADD_OPTIMISTIC_BILL'; bill: Bill }
  | { type: 'REMOVE_OPTIMISTIC_BILL'; billId: string }
  | { type: 'UPDATE_OPTIMISTIC_BILL'; billId: string; updates: Partial<Bill> }
  | { type: 'ADD_DELETED_BILL'; billId: string }
  | { type: 'REMOVE_DELETED_BILL'; billId: string }
  | { type: 'MARK_PAID_OPTIMISTIC'; billId: string; paidBill: Bill; nextBill?: Bill }
  | { type: 'UNDO_PAID_OPTIMISTIC'; billId: string; originalBill: Bill; removeNextBillId?: string };

// Reducer
function billsReducer(state: BillsState, action: BillsAction): BillsState {
  switch (action.type) {
    case 'SET_BILLS':
      return {
        ...state,
        bills: action.bills,
        loading: false,
        lastFetched: Date.now(),
        deletedBillIds: new Set(),
      };

    case 'SET_LOADING':
      return { ...state, loading: action.loading };

    case 'START_MUTATION': {
      const newMutatingBills = new Map(state.mutatingBills);
      newMutatingBills.set(action.billId, action.state);
      return { ...state, mutatingBills: newMutatingBills };
    }

    case 'END_MUTATION': {
      const newMutatingBills = new Map(state.mutatingBills);
      newMutatingBills.delete(action.billId);
      return { ...state, mutatingBills: newMutatingBills };
    }

    case 'ADD_OPTIMISTIC_BILL':
      return {
        ...state,
        bills: [action.bill, ...state.bills].sort(
          (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
        ),
      };

    case 'REMOVE_OPTIMISTIC_BILL':
      return {
        ...state,
        bills: state.bills.filter((b) => b.id !== action.billId),
      };

    case 'UPDATE_OPTIMISTIC_BILL':
      return {
        ...state,
        bills: state.bills
          .map((b) => (b.id === action.billId ? { ...b, ...action.updates } : b))
          .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()),
      };

    case 'ADD_DELETED_BILL': {
      const newDeleted = new Set(state.deletedBillIds);
      newDeleted.add(action.billId);
      return { ...state, deletedBillIds: newDeleted };
    }

    case 'REMOVE_DELETED_BILL': {
      const newDeleted = new Set(state.deletedBillIds);
      newDeleted.delete(action.billId);
      return { ...state, deletedBillIds: newDeleted };
    }

    case 'MARK_PAID_OPTIMISTIC': {
      let updatedBills = state.bills.map((b) =>
        b.id === action.billId ? action.paidBill : b
      );
      if (action.nextBill) {
        updatedBills = [...updatedBills, action.nextBill];
      }
      return {
        ...state,
        bills: updatedBills.sort(
          (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
        ),
      };
    }

    case 'UNDO_PAID_OPTIMISTIC': {
      let updatedBills = state.bills.map((b) =>
        b.id === action.billId ? action.originalBill : b
      );
      if (action.removeNextBillId) {
        updatedBills = updatedBills.filter((b) => b.id !== action.removeNextBillId);
      }
      return {
        ...state,
        bills: updatedBills.sort(
          (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
        ),
      };
    }

    default:
      return state;
  }
}

// Initial state
const initialState: BillsState = {
  bills: [],
  deletedBillIds: new Set(),
  mutatingBills: new Map(),
  loading: true,
  lastFetched: null,
};

// Context value type
interface BillsContextValue {
  // State
  bills: Bill[];
  loading: boolean;
  lastFetched: number | null;

  // Computed
  unpaidBills: Bill[];
  paidBills: Bill[];

  // Mutation state
  getMutationState: (billId: string) => MutationState;
  isAnyMutating: boolean;

  // Actions
  refetch: () => Promise<void>;
  dispatch: React.Dispatch<BillsAction>;
}

const BillsContext = createContext<BillsContextValue | null>(null);

// Provider
interface BillsProviderProps {
  children: React.ReactNode;
}

const STALE_TIME = 5 * 60 * 1000; // 5 minutes

export function BillsProvider({ children }: BillsProviderProps) {
  const [state, dispatch] = useReducer(billsReducer, initialState);

  // Fetch bills from API (including paid bills for cross-page sync)
  const refetch = useCallback(async () => {
    try {
      const response = await fetch('/api/bills?showPaid=true');
      if (response.ok) {
        const data = await response.json();
        const sortedBills = data.sort(
          (a: Bill, b: Bill) =>
            new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
        );
        dispatch({ type: 'SET_BILLS', bills: sortedBills });
      }
    } catch (error) {
      console.error('Failed to fetch bills:', error);
      dispatch({ type: 'SET_LOADING', loading: false });
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    refetch();
  }, [refetch]);

  // Auto-refetch if stale
  useEffect(() => {
    if (state.lastFetched && Date.now() - state.lastFetched > STALE_TIME) {
      refetch();
    }
  }, [state.lastFetched, refetch]);

  // Filter out deleted bills
  const visibleBills = useMemo(() => {
    return state.bills.filter((bill) => !state.deletedBillIds.has(bill.id));
  }, [state.bills, state.deletedBillIds]);

  // Computed: unpaid and paid bills
  const unpaidBills = useMemo(() => {
    return visibleBills.filter((b) => !b.is_paid);
  }, [visibleBills]);

  const paidBills = useMemo(() => {
    return visibleBills.filter((b) => b.is_paid);
  }, [visibleBills]);

  // Helper to get mutation state for a bill
  const getMutationState = useCallback(
    (billId: string): MutationState => {
      return state.mutatingBills.get(billId) ?? null;
    },
    [state.mutatingBills]
  );

  // Check if any bill is currently mutating
  const isAnyMutating = useMemo(() => {
    return state.mutatingBills.size > 0;
  }, [state.mutatingBills]);

  const value: BillsContextValue = {
    bills: visibleBills,
    loading: state.loading,
    lastFetched: state.lastFetched,
    unpaidBills,
    paidBills,
    getMutationState,
    isAnyMutating,
    refetch,
    dispatch,
  };

  return <BillsContext.Provider value={value}>{children}</BillsContext.Provider>;
}

// Hook
export function useBillsContext() {
  const context = useContext(BillsContext);
  if (!context) {
    throw new Error('useBillsContext must be used within a BillsProvider');
  }
  return context;
}
