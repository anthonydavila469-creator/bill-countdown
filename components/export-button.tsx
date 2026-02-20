'use client';

import { useState } from 'react';
import { Download, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { exportBillsToCSV } from '@/lib/export-bills';
import type { Bill } from '@/types';

interface ExportButtonProps {
  bills: Bill[];
  className?: string;
}

export function ExportButton({ bills, className }: ExportButtonProps) {
  const [exported, setExported] = useState(false);

  const handleExport = () => {
    if (bills.length === 0) return;

    exportBillsToCSV(bills);
    setExported(true);

    // Reset state after 2 seconds
    setTimeout(() => {
      setExported(false);
    }, 2000);
  };

  return (
    <button
      onClick={handleExport}
      disabled={bills.length === 0}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200',
        'bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20',
        'backdrop-blur-sm text-white/70 hover:text-white',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white/5 disabled:hover:border-white/10 disabled:hover:text-white/70',
        exported && 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
        className
      )}
    >
      {exported ? (
        <>
          <Check className="w-4 h-4" />
          <span>Exported!</span>
        </>
      ) : (
        <>
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </>
      )}
    </button>
  );
}
