'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Bill } from '@/types';
import { getRiskBills, RiskBill, RiskType } from '@/lib/risk-utils';
import { detectBillCluster, BillCluster } from '@/lib/clustering-utils';
import { formatCurrency, getDaysUntilDue } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { getBillIcon } from '@/lib/get-bill-icon';
import {
  AlertTriangle,
  Clock,
  History,
  ExternalLink,
  Check,
  Zap,
  X,
  Link2,
  ChevronRight,
  CreditCard,
  LucideIcon,
  AlertCircle,
  CalendarDays,
} from 'lucide-react';

// Risk type styling configuration with enhanced visual hierarchy
const riskConfig: Record<
  RiskType,
  {
    icon: LucideIcon;
    gradient: string;
    glowColor: string;
    borderColor: string;
    textColor: string;
    accentColor: string;
    pulseColor: string;
    label: string;
    urgencyText: string;
  }
> = {
  overdue: {
    icon: AlertTriangle,
    gradient: 'from-rose-500/20 via-rose-600/10 to-red-900/20',
    glowColor: 'shadow-[0_0_30px_rgba(244,63,94,0.15),inset_0_1px_0_rgba(255,255,255,0.05)]',
    borderColor: 'border-rose-500/30 hover:border-rose-400/50',
    textColor: 'text-rose-400',
    accentColor: 'bg-rose-500',
    pulseColor: 'bg-rose-500/50',
    label: 'Overdue',
    urgencyText: 'Immediate action required',
  },
  urgent: {
    icon: Clock,
    gradient: 'from-orange-500/20 via-amber-600/10 to-orange-900/20',
    glowColor: 'shadow-[0_0_30px_rgba(249,115,22,0.15),inset_0_1px_0_rgba(255,255,255,0.05)]',
    borderColor: 'border-orange-500/30 hover:border-orange-400/50',
    textColor: 'text-orange-400',
    accentColor: 'bg-orange-500',
    pulseColor: 'bg-orange-500/50',
    label: 'Due Soon',
    urgencyText: 'Pay within 3 days',
  },
  forgot_last_month: {
    icon: History,
    gradient: 'from-violet-500/20 via-purple-600/10 to-violet-900/20',
    glowColor: 'shadow-[0_0_30px_rgba(139,92,246,0.15),inset_0_1px_0_rgba(255,255,255,0.05)]',
    borderColor: 'border-violet-500/30 hover:border-violet-400/50',
    textColor: 'text-violet-400',
    accentColor: 'bg-violet-500',
    pulseColor: 'bg-violet-500/50',
    label: 'Missed Pattern',
    urgencyText: 'Paid last month, not yet this month',
  },
};

interface RiskAlertsProps {
  bills: Bill[];
  onPayNow: (bill: Bill) => void;
  onMarkPaid: (bill: Bill) => void;
  onEditBill?: (bill: Bill) => void;
  className?: string;
}

export function RiskAlerts({
  bills,
  onPayNow,
  onMarkPaid,
  onEditBill,
  className,
}: RiskAlertsProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [isCollapsed, setIsCollapsed] = useState(true); // Collapsed by default for cleaner dashboard
  const [clusterDismissed, setClusterDismissed] = useState(false);

  const riskBills = useMemo(() => {
    const allRisk = getRiskBills(bills, 5);
    return allRisk.filter(rb => !dismissedIds.has(rb.bill.id));
  }, [bills, dismissedIds]);

  // Detect bill cluster
  const billCluster = useMemo(() => {
    if (clusterDismissed) return null;
    return detectBillCluster(bills);
  }, [bills, clusterDismissed]);

  const handleDismiss = (billId: string) => {
    setDismissedIds(prev => new Set([...prev, billId]));
  };

  // Don't render if no risk bills and no cluster
  if (riskBills.length === 0 && !billCluster) return null;

  // If only cluster alert (no risk bills), show standalone cluster alert
  if (riskBills.length === 0 && billCluster) {
    return (
      <div className={cn('relative', className)}>
        <ClusterAlert
          cluster={billCluster}
          onDismiss={() => setClusterDismissed(true)}
        />
      </div>
    );
  }

  // Count by type for header
  const overdueCount = riskBills.filter(rb => rb.riskType === 'overdue').length;
  const urgentCount = riskBills.filter(rb => rb.riskType === 'urgent').length;

  // Calculate total amount at risk
  const totalAtRisk = riskBills.reduce((sum, rb) => sum + (rb.bill.amount || 0), 0);

  // Get the most urgent status message for the collapsed view
  const getMostUrgentStatus = () => {
    const overdueBills = riskBills.filter(rb => rb.riskType === 'overdue');
    const urgentBillsList = riskBills.filter(rb => rb.riskType === 'urgent');

    if (overdueBills.length > 0) {
      // Find the most overdue bill
      const mostOverdue = overdueBills.reduce((worst, current) =>
        current.daysLeft < worst.daysLeft ? current : worst
      );
      const daysOverdue = Math.abs(mostOverdue.daysLeft);
      return { text: `Oldest ${daysOverdue}d past due`, color: 'text-rose-400' };
    }

    if (urgentBillsList.length > 0) {
      // Find the soonest due bill
      const soonest = urgentBillsList.reduce((closest, current) =>
        current.daysLeft < closest.daysLeft ? current : closest
      );
      if (soonest.daysLeft === 0) {
        return { text: 'Due today', color: 'text-orange-400' };
      }
      return { text: `Due in ${soonest.daysLeft}d`, color: 'text-orange-400' };
    }

    return { text: 'Bills need attention', color: 'text-zinc-400' };
  };

  // Compact banner when collapsed, full panel when expanded
  if (isCollapsed) {
    return (
      <div className={cn('relative', className)}>
        {/* Subtle glow effect behind the banner */}
        <div className="absolute inset-0 bg-gradient-to-r from-rose-500/10 via-orange-500/5 to-violet-500/10 rounded-2xl blur-xl opacity-60" />

        <button
          onClick={() => setIsCollapsed(false)}
          className={cn(
            'group relative w-full flex items-center justify-between gap-4 px-5 py-4 rounded-2xl',
            'bg-gradient-to-r from-rose-500/[0.08] via-[#0c0c10] to-violet-500/[0.08]',
            'border border-rose-500/20 hover:border-rose-400/40',
            'transition-all duration-300',
            'hover:shadow-[0_0_30px_rgba(244,63,94,0.15)]',
            'animate-in fade-in slide-in-from-top-2 duration-300'
          )}
        >
          {/* Left accent glow line */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full bg-gradient-to-b from-rose-500 via-orange-500 to-violet-500 shadow-[0_0_12px_rgba(244,63,94,0.5)]" />

          <div className="flex items-center gap-4">
            {/* Pulsing indicator with glow */}
            <div className="relative flex items-center justify-center">
              <div className="absolute w-3 h-3 rounded-full bg-rose-500/50 animate-ping" />
              <div className="relative w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]" />
            </div>

            {/* Alert info with icon container */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500/20 to-orange-500/10 border border-rose-500/30">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              </div>
              <div>
                <span className="font-semibold text-white">Risk Alerts</span>
                {/* Amount at risk + urgency status on one line */}
                <p className="text-xs text-zinc-400 mt-0.5">
                  {formatCurrency(totalAtRisk)} <span className="text-zinc-500">at risk</span>
                  <span className="hidden sm:inline">
                    <span className="text-zinc-600 mx-1.5">·</span>
                    <span className={getMostUrgentStatus().color}>{getMostUrgentStatus().text}</span>
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-zinc-500 group-hover:text-white group-hover:bg-white/[0.06] group-hover:border-white/[0.1] transition-all duration-200">
            <span className="text-xs font-medium">View {riskBills.length} alert{riskBills.length !== 1 ? 's' : ''}</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      {/* Glow effect behind the panel */}
      <div className="absolute inset-0 bg-gradient-to-r from-rose-500/10 via-orange-500/5 to-violet-500/10 rounded-2xl blur-2xl opacity-50" />

      <div
        className={cn(
          'relative rounded-2xl overflow-hidden',
          'bg-gradient-to-br from-[#0c0c12] via-[#0f0f18] to-[#0c0c12]',
          'border border-white/[0.08]',
          'shadow-[0_8px_32px_rgba(0,0,0,0.4)]',
          'animate-in fade-in slide-in-from-top-2 duration-500'
        )}
      >
        {/* Top gradient accent line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-rose-500/40 to-transparent" />

        {/* Noise texture overlay */}
        <div className="absolute inset-0 opacity-[0.015] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMSIvPjwvc3ZnPg==')] pointer-events-none" />

        {/* Header */}
        <button
          onClick={() => setIsCollapsed(true)}
          className="w-full px-6 py-5 flex items-center justify-between border-b border-white/[0.06] hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-4">
            {/* Pulsing alert icon */}
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-rose-500/30 animate-ping opacity-75" style={{ animationDuration: '2s' }} />
              <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500/25 to-orange-500/15 border border-rose-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(244,63,94,0.2)]">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
            </div>

            <div className="text-left">
              <h2 className="font-semibold text-white">Risk Alerts</h2>
              <p className="text-sm text-zinc-400 mt-1">
                {formatCurrency(totalAtRisk)} <span className="text-zinc-500">at risk</span>
                {(overdueCount > 0 || urgentCount > 0) && (
                  <span className="text-zinc-500">
                    {' · '}
                    {overdueCount > 0 && (
                      <span className="text-rose-400">{overdueCount} overdue</span>
                    )}
                    {overdueCount > 0 && urgentCount > 0 && ', '}
                    {urgentCount > 0 && (
                      <span className="text-orange-400">{urgentCount} due soon</span>
                    )}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-zinc-500 hover:text-white hover:bg-white/[0.06] transition-all duration-200">
            <span className="text-xs font-medium">Collapse</span>
            <ChevronRight className="w-4 h-4 rotate-90" />
          </div>
        </button>

        {/* Cluster alert (if present) */}
        {billCluster && (
          <div className="px-4 pt-4">
            <ClusterAlert
              cluster={billCluster}
              onDismiss={() => setClusterDismissed(true)}
            />
          </div>
        )}

        {/* Risk items */}
        <div className="p-4 space-y-3">
          {riskBills.map((riskBill, index) => (
            <RiskAlertItem
              key={riskBill.bill.id}
              riskBill={riskBill}
              onPayNow={onPayNow}
              onMarkPaid={onMarkPaid}
              onEditBill={onEditBill}
              onDismiss={handleDismiss}
              animationDelay={index * 50}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Cluster Alert Component
interface ClusterAlertProps {
  cluster: BillCluster;
  onDismiss: () => void;
}

function ClusterAlert({ cluster, onDismiss }: ClusterAlertProps) {
  return (
    <div className={cn(
      'group relative flex items-stretch gap-0 rounded-xl overflow-hidden',
      'bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15',
      'border border-amber-500/25 hover:border-amber-400/40',
      'shadow-[0_0_20px_rgba(245,158,11,0.1)]',
      'transition-all duration-300',
      'animate-in fade-in slide-in-from-top-2'
    )}>
      {/* Left accent bar */}
      <div className="relative w-1.5 flex-shrink-0">
        <div className="absolute inset-0 bg-amber-500" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center gap-3 p-3 pl-3">
        {/* Icon */}
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-amber-500/20 border border-amber-500/30">
          <CalendarDays className="w-5 h-5 text-amber-400" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-amber-200 text-sm">
              Heavy Week Ahead
            </h3>
          </div>
          <p className="text-sm text-amber-100/80">
            {cluster.bills.length} bills totaling{' '}
            <span className="font-semibold text-amber-200">
              {formatCurrency(cluster.totalAmount)}
            </span>{' '}
            due {cluster.dateRange}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href="/dashboard/calendar"
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-200',
              'bg-gradient-to-r from-amber-500/30 to-yellow-500/20',
              'hover:from-amber-500/40 hover:to-yellow-500/30',
              'text-amber-200 border border-amber-500/30',
              'active:scale-95'
            )}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            View in Calendar
          </Link>

          {/* Dismiss button */}
          <button
            onClick={onDismiss}
            className={cn(
              'flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200',
              'opacity-0 group-hover:opacity-100',
              'hover:bg-white/10 text-amber-400/60 hover:text-amber-300',
              'active:scale-95'
            )}
            title="Dismiss this alert"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface RiskAlertItemProps {
  riskBill: RiskBill;
  onPayNow: (bill: Bill) => void;
  onMarkPaid: (bill: Bill) => void;
  onEditBill?: (bill: Bill) => void;
  onDismiss: (billId: string) => void;
  animationDelay: number;
}

function RiskAlertItem({
  riskBill,
  onPayNow,
  onMarkPaid,
  onEditBill,
  onDismiss,
  animationDelay
}: RiskAlertItemProps) {
  const { bill, riskType, message, daysLeft } = riskBill;
  const config = riskConfig[riskType];
  const { icon: BillIconComponent, colorClass } = getBillIcon(bill);
  const hasPaymentLink = !!bill.payment_url;
  const isManualPayment = !bill.is_autopay;
  const showLateRisk = (riskType === 'overdue' || riskType === 'urgent') && isManualPayment;

  const handlePayNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPayNow(bill);
  };

  const handleMarkPaid = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkPaid(bill);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEditBill?.(bill);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDismiss(bill.id);
  };

  // Format the days display
  const getDaysDisplay = () => {
    if (daysLeft < 0) return `${Math.abs(daysLeft)}d overdue`;
    if (daysLeft === 0) return 'Due today';
    return `${daysLeft}d left`;
  };

  return (
    <div
      className={cn(
        'group relative flex items-stretch gap-0 rounded-xl overflow-hidden',
        'bg-gradient-to-r',
        config.gradient,
        'border',
        config.borderColor,
        config.glowColor,
        'transition-all duration-300 hover:scale-[1.01]',
        'animate-in fade-in slide-in-from-left-2'
      )}
      style={{ animationDelay: `${animationDelay}ms`, animationFillMode: 'backwards' }}
    >
      {/* Left accent bar with pulse effect for overdue */}
      <div className="relative w-1.5 flex-shrink-0">
        <div className={cn("absolute inset-0", config.accentColor)} />
        {riskType === 'overdue' && (
          <div className={cn("absolute inset-0 animate-pulse", config.pulseColor)} />
        )}
      </div>

      {/* Main content - compact layout */}
      <div className="flex-1 flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 pl-2 sm:pl-3">
        {/* Bill icon - smaller on mobile */}
        <div
          className={cn(
            'relative w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0',
            'bg-white/[0.05] border border-white/[0.08]',
            'group-hover:bg-white/[0.08] transition-colors'
          )}
        >
          <BillIconComponent className={cn("w-4 h-4 sm:w-5 sm:h-5", colorClass)} />
        </div>

        {/* Content - single line on mobile */}
        <div className="flex-1 min-w-0">
          {/* Mobile: compact single line */}
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-white text-sm truncate max-w-[100px] sm:max-w-none">
              {bill.name}
            </h3>
            
            {/* Days counter - always visible */}
            <span className={cn(
              'text-xs font-bold',
              riskType === 'overdue' ? 'text-rose-400' : config.textColor
            )}>
              {getDaysDisplay()}
            </span>

            {/* Amount */}
            {bill.amount && (
              <span className="text-sm font-semibold text-white/90">
                {formatCurrency(bill.amount)}
              </span>
            )}

            {/* Late fee risk - icon only on mobile */}
            {showLateRisk && (
              <AlertCircle className="w-3.5 h-3.5 text-rose-400 sm:hidden" title="Late fee risk" />
            )}
          </div>
          
          {/* Desktop: show late fee text */}
          {showLateRisk && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-rose-400 mt-0.5">
              <AlertCircle className="w-3 h-3" />
              Late fee risk
            </span>
          )}
        </div>

        {/* Actions - compact */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Pay Now button */}
          {hasPaymentLink ? (
            <button
              onClick={handlePayNow}
              className={cn(
                'flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs font-bold transition-all duration-200',
                'bg-gradient-to-r from-emerald-500 to-teal-500',
                'hover:from-emerald-400 hover:to-teal-400',
                'text-white shadow-lg shadow-emerald-500/25',
                'active:scale-95'
              )}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pay Now</span>
            </button>
          ) : (
            <button
              onClick={handleEdit}
              className={cn(
                'flex items-center justify-center w-8 h-8 sm:w-auto sm:h-auto sm:gap-1.5 sm:px-3 sm:py-2 rounded-lg text-xs font-medium transition-all duration-200',
                'bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 hover:border-white/20',
                'text-zinc-400 hover:text-white'
              )}
              title="Add payment link"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add Link</span>
            </button>
          )}

          {/* Mark Paid button */}
          <button
            onClick={handleMarkPaid}
            className={cn(
              'flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg transition-all duration-200',
              'bg-white/[0.05] hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/40',
              'text-zinc-400 hover:text-emerald-400',
              'active:scale-95'
            )}
            title={bill.is_autopay ? 'Confirm Auto-Paid' : 'Mark as Paid'}
          >
            {bill.is_autopay ? (
              <Zap className="w-4 h-4" />
            ) : (
              <Check className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
