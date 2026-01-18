'use client';

import { useState, useMemo } from 'react';
import { Bill, BillIconKey } from '@/types';
import { getRiskBills, RiskBill, RiskType } from '@/lib/risk-utils';
import { formatCurrency, getDaysUntilDue } from '@/lib/utils';
import { cn } from '@/lib/utils';
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
  Home,
  Zap as Bolt,
  Wifi,
  Tv,
  Phone,
  CreditCard,
  Shield,
  Car,
  Heart,
  Dumbbell,
  Droplet,
  Flame,
  Trash2,
  Building,
  Music,
  Film,
  DollarSign,
  FileText,
  LucideIcon,
  AlertCircle,
} from 'lucide-react';

// Icon mapping
const iconMap: Record<BillIconKey, LucideIcon> = {
  home: Home,
  bolt: Bolt,
  wifi: Wifi,
  tv: Tv,
  phone: Phone,
  creditcard: CreditCard,
  shield: Shield,
  car: Car,
  heart: Heart,
  dumbbell: Dumbbell,
  water: Droplet,
  flame: Flame,
  trash: Trash2,
  building: Building,
  music: Music,
  film: Film,
  dollar: DollarSign,
  file: FileText,
};

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

  const riskBills = useMemo(() => {
    const allRisk = getRiskBills(bills, 5);
    return allRisk.filter(rb => !dismissedIds.has(rb.bill.id));
  }, [bills, dismissedIds]);

  const handleDismiss = (billId: string) => {
    setDismissedIds(prev => new Set([...prev, billId]));
  };

  // Don't render if no risk bills
  if (riskBills.length === 0) return null;

  // Count by type for header
  const overdueCount = riskBills.filter(rb => rb.riskType === 'overdue').length;
  const urgentCount = riskBills.filter(rb => rb.riskType === 'urgent').length;

  // Compact banner when collapsed, full panel when expanded
  if (isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        className={cn(
          'group w-full flex items-center justify-between gap-4 px-4 py-3 rounded-xl',
          'bg-gradient-to-r from-rose-500/[0.08] via-orange-500/[0.05] to-violet-500/[0.08]',
          'border border-rose-500/20 hover:border-rose-500/40',
          'transition-all duration-300 hover:shadow-[0_0_20px_rgba(244,63,94,0.1)]',
          'animate-in fade-in slide-in-from-top-2 duration-300',
          className
        )}
      >
        <div className="flex items-center gap-3">
          {/* Compact pulsing indicator */}
          <div className="relative flex items-center justify-center">
            <div className="absolute w-2 h-2 rounded-full bg-rose-500 animate-ping opacity-75" />
            <div className="relative w-2 h-2 rounded-full bg-rose-500" />
          </div>

          {/* Inline alert info */}
          <div className="flex items-center gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span className="font-semibold text-white">Risk Alerts</span>
            <span className="px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-400 text-xs font-bold">
              {riskBills.length}
            </span>
          </div>

          {/* Quick summary pills */}
          <div className="hidden sm:flex items-center gap-2">
            {overdueCount > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 text-xs font-medium">
                {overdueCount} overdue
              </span>
            )}
            {urgentCount > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-300 text-xs font-medium">
                {urgentCount} due soon
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-zinc-500 group-hover:text-zinc-300 transition-colors">
          <span className="text-xs hidden sm:inline">View details</span>
          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </button>
    );
  }

  return (
    <div
      className={cn(
        'relative rounded-2xl overflow-hidden',
        'bg-gradient-to-br from-[#0c0c12] via-[#0f0f18] to-[#0c0c12]',
        'border border-white/[0.08]',
        'shadow-[0_4px_24px_rgba(0,0,0,0.3)]',
        'animate-in fade-in slide-in-from-top-2 duration-500',
        className
      )}
    >
      {/* Animated gradient border effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-rose-500/20 via-orange-500/20 to-violet-500/20 opacity-50 blur-xl -z-10" />

      {/* Noise texture overlay */}
      <div className="absolute inset-0 opacity-[0.015] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMSIvPjwvc3ZnPg==')] pointer-events-none" />

      {/* Header */}
      <button
        onClick={() => setIsCollapsed(true)}
        className="w-full px-5 py-4 flex items-center justify-between border-b border-white/[0.06] hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-4">
          {/* Pulsing alert icon */}
          <div className="relative">
            <div className="absolute inset-0 rounded-xl bg-rose-500/30 animate-ping opacity-75" style={{ animationDuration: '2s' }} />
            <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-rose-500/30 to-orange-500/20 border border-rose-500/30 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            </div>
          </div>

          <div className="text-left">
            <h2 className="font-semibold text-white flex items-center gap-2">
              Risk Alerts
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-xs font-bold">
                {riskBills.length}
              </span>
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {overdueCount > 0 && <span className="text-rose-400">{overdueCount} overdue</span>}
              {overdueCount > 0 && urgentCount > 0 && <span className="text-zinc-600"> · </span>}
              {urgentCount > 0 && <span className="text-orange-400">{urgentCount} due soon</span>}
              {overdueCount === 0 && urgentCount === 0 && <span>Bills need attention</span>}
            </p>
          </div>
        </div>

        <ChevronRight
          className={cn(
            "w-5 h-5 text-zinc-500 transition-transform duration-200",
            "rotate-90"
          )}
        />
      </button>

      {/* Risk items */}
      <div className="p-3 space-y-2">
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
  const IconComponent = bill.icon_key ? iconMap[bill.icon_key] : null;
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

      {/* Main content */}
      <div className="flex-1 flex items-center gap-3 p-3 pl-3">
        {/* Bill icon */}
        <div
          className={cn(
            'relative w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
            'bg-white/[0.05] border border-white/[0.08]',
            'group-hover:bg-white/[0.08] transition-colors'
          )}
        >
          {IconComponent ? (
            <IconComponent className="w-5 h-5 text-zinc-300" />
          ) : (
            <span className="text-xl">{bill.emoji}</span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-semibold text-white text-sm">
              {bill.name}
            </h3>

            {/* Risk badge */}
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide',
                riskType === 'overdue' && 'bg-rose-500/30 text-rose-300 border border-rose-500/30',
                riskType === 'urgent' && 'bg-orange-500/30 text-orange-300 border border-orange-500/30',
                riskType === 'forgot_last_month' && 'bg-violet-500/30 text-violet-300 border border-violet-500/30'
              )}
            >
              <config.icon className="w-3 h-3" />
              {config.label}
            </span>

            {/* Days counter */}
            <span className={cn(
              'text-xs font-mono font-bold',
              riskType === 'overdue' ? 'text-rose-400' : config.textColor
            )}>
              {getDaysDisplay()}
            </span>
          </div>

          {/* Amount and late fee risk */}
          <div className="flex items-center gap-3 flex-wrap">
            {bill.amount && (
              <span className="text-sm font-semibold text-white/90">
                {formatCurrency(bill.amount)}
              </span>
            )}

            {/* Late fee risk warning - more prominent */}
            {showLateRisk && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-500/20 border border-rose-500/30">
                <AlertCircle className="w-3 h-3 text-rose-400 animate-pulse" />
                <span className="text-[10px] font-semibold text-rose-300 uppercase tracking-wide">
                  Late Fee Risk
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Pay Now button - or Add Link prompt */}
          {hasPaymentLink ? (
            <button
              onClick={handlePayNow}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-200',
                'bg-gradient-to-r from-emerald-500 to-teal-500',
                'hover:from-emerald-400 hover:to-teal-400',
                'text-white shadow-lg shadow-emerald-500/25',
                'active:scale-95 hover:shadow-emerald-500/40'
              )}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Pay Now
            </button>
          ) : (
            <button
              onClick={handleEdit}
              className={cn(
                'group/add flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200',
                'bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 hover:border-white/20',
                'text-zinc-400 hover:text-white'
              )}
              title="Add a payment link to enable quick pay"
            >
              <Link2 className="w-3.5 h-3.5 group-hover/add:text-blue-400 transition-colors" />
              <span className="hidden sm:inline">Add Link</span>
            </button>
          )}

          {/* Mark Paid button */}
          <button
            onClick={handleMarkPaid}
            className={cn(
              'flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200',
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

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className={cn(
              'flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200',
              'opacity-0 group-hover:opacity-100',
              'hover:bg-white/10 text-zinc-500 hover:text-zinc-300',
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
