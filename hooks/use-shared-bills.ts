'use client';

import { useState, useEffect, useCallback } from 'react';

// Shared bill types
export type SplitType = '50/50' | 'custom' | 'fixed';
export type SharedBillStatus = 'pending' | 'confirmed' | 'paid';

export interface SharedBill {
  id: string;
  billId: string;
  partnerName: string;
  partnerEmail: string | null;
  splitType: SplitType;
  yourPercent: number;
  theirPercent: number;
  yourAmount: number;
  theirAmount: number;
  status: SharedBillStatus;
  createdAt: string;
}

const STORAGE_KEY = 'duezo-shared-bills';

function generateId(): string {
  return `shared-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function useSharedBills() {
  const [sharedBills, setSharedBills] = useState<SharedBill[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSharedBills(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load shared bills from localStorage:', error);
    }
    setIsLoaded(true);
  }, []);

  // Persist to localStorage when state changes
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sharedBills));
      } catch (error) {
        console.error('Failed to save shared bills to localStorage:', error);
      }
    }
  }, [sharedBills, isLoaded]);

  const addSharedBill = useCallback((
    billId: string,
    partnerName: string,
    partnerEmail: string | null,
    splitType: SplitType,
    billAmount: number,
    customPercent?: number,
    fixedAmount?: number
  ): SharedBill => {
    let yourPercent = 50;
    let theirPercent = 50;
    let yourAmount = billAmount / 2;
    let theirAmount = billAmount / 2;

    if (splitType === 'custom' && customPercent !== undefined) {
      yourPercent = customPercent;
      theirPercent = 100 - customPercent;
      yourAmount = (billAmount * yourPercent) / 100;
      theirAmount = (billAmount * theirPercent) / 100;
    } else if (splitType === 'fixed' && fixedAmount !== undefined) {
      theirAmount = fixedAmount;
      yourAmount = billAmount - fixedAmount;
      yourPercent = (yourAmount / billAmount) * 100;
      theirPercent = (theirAmount / billAmount) * 100;
    }

    const newSharedBill: SharedBill = {
      id: generateId(),
      billId,
      partnerName,
      partnerEmail,
      splitType,
      yourPercent: Math.round(yourPercent * 100) / 100,
      theirPercent: Math.round(theirPercent * 100) / 100,
      yourAmount: Math.round(yourAmount * 100) / 100,
      theirAmount: Math.round(theirAmount * 100) / 100,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    setSharedBills(prev => {
      // Remove any existing shared bill for this bill
      const filtered = prev.filter(sb => sb.billId !== billId);
      return [...filtered, newSharedBill];
    });

    return newSharedBill;
  }, []);

  const updateSharedBill = useCallback((
    id: string,
    updates: Partial<Omit<SharedBill, 'id' | 'billId' | 'createdAt'>>
  ) => {
    setSharedBills(prev =>
      prev.map(sb =>
        sb.id === id ? { ...sb, ...updates } : sb
      )
    );
  }, []);

  const removeSharedBill = useCallback((billId: string) => {
    setSharedBills(prev => prev.filter(sb => sb.billId !== billId));
  }, []);

  const getSharedBillForBill = useCallback((billId: string): SharedBill | null => {
    return sharedBills.find(sb => sb.billId === billId) || null;
  }, [sharedBills]);

  return {
    sharedBills,
    isLoaded,
    addSharedBill,
    updateSharedBill,
    removeSharedBill,
    getSharedBillForBill,
  };
}
