'use client';

import { Bill, CATEGORY_COLORS, categoryLabels } from '@/types';
import {
  cn,
  getDaysUntilDue,
  getUrgency,
  formatDate,
  formatDateCompact,
  formatCurrency,
  getPriceChange,
} from '@/lib/utils';
import { RiskType, hasLatePaymentRisk } from '@/lib/risk-utils';
import { getBillIcon } from '@/lib/get-bill-icon';
import { GradientCard } from './ui/gradient-card';
import { CountdownDisplay } from './countdown-display';
import {
  RefreshCw, Calendar, DollarSign, ExternalLink, CreditCard, TrendingUp, TrendingDown, Check, Zap,
  AlertTriangle, Clock, History, AlertCircle, LucideIcon, Crown
} from 'lucide-react';
import { useSubscription } from '@/hooks/use-subscription';
import { useTheme } from '@/contexts/theme-context';

interface BillCardProps {
  bill: Bill;
  onClick?: () => void;
  onMarkPaid?: (bill: Bill) => void;
  onPayNow?: (bill: Bill) => void;
  variant?: 'default' | 'compact';
  className?: string;
  showMarkPaid?: boolean;
  riskType?: RiskType | null;
}

// Risk badge configuration
const riskBadgeConfig: Record<RiskType, { icon: LucideIcon; label: string; bgColor: string; textColor: string }> = {
  overdue: {
    icon: AlertTriangle,
    label: 'Overdue',
    bgColor: 'bg-rose-500/40',
    textColor: 'text-rose-100',
  },
  urgent: {
    icon: Clock,
    label: 'Urgent',
    bgColor: 'bg-orange-500/40',
    textColor: 'text-orange-100',
  },
  forgot_last_month: {
    icon: History,
    label: 'Forgot last month',
    bgColor: 'bg-amber-500/40',
    textColor: 'text-amber-100',
  },
};

export function BillCard({
  bill,
  onClick,
  onMarkPaid,
  onPayNow,
  variant = 'default',
  className,
  showMarkPaid = true,
  riskType,
}: BillCardProps) {
  const { canUsePaymentLinks, showUpgradeModal } = useSubscription();
  const { selectedTheme } = useTheme();
  const daysLeft = getDaysUntilDue(bill.due_date);
  const urgency = getUrgency(daysLeft);
  const priceChange = getPriceChange(bill.amount, bill.previous_amount);
  const isPaid = bill.is_paid;
  const hasPaymentLink = !!bill.payment_url;
  const canShowPayNow = hasPaymentLink && canUsePaymentLinks;
  const { icon: IconComponent, colorClass: iconColorClass } = getBillIcon(bill);
  const showLatePaymentRisk = hasLatePaymentRisk(bill);
  const riskConfig = riskType ? riskBadgeConfig[riskType] : null;

  const handleMarkPaid = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onMarkPaid && !isPaid) {
      onMarkPaid(bill);
    }
  };

  const handlePayNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPayNow && !isPaid) {
      onPayNow(bill);
    }
  };

  if (variant === 'compact') {
    return (
      <GradientCard
        urgency={urgency}
        onClick={onClick}
        className={cn('p-4 group/compact', className)}
      >
        <div className="flex items-center justify-between gap-4">
          {/* Left side: icon + name */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <IconComponent className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold text-white truncate max-w-[140px]">{bill.name}</h3>
                {/* Compact risk badge - always on same line */}
                {riskConfig && !isPaid && (
                  <span className={cn(
                    "flex-shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold",
                    riskConfig.bgColor,
                    riskConfig.textColor
                  )}>
                    <riskConfig.icon className="w-2.5 h-2.5" />
                    {riskType === 'forgot_last_month' ? 'Forgot' : riskConfig.label}
                  </span>
                )}
              </div>
              <p className="text-xs text-white/70 flex items-center gap-1.5">
                <Calendar className="w-3 h-3 flex-shrink-0" />
                <span>{formatDateCompact(bill.due_date)}</span>
                {/* Category badge */}
                {bill.category && (
                  <>
                    <span className="text-white/30">·</span>
                    <span
                      className="flex items-center gap-1"
                      style={{ color: CATEGORY_COLORS[bill.category].text }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: CATEGORY_COLORS[bill.category].text }}
                      />
                      <span className="text-[10px] font-medium">
                        {categoryLabels[bill.category].slice(0, 8)}
                      </span>
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Right side: countdown + hover actions */}
          <div className="flex items-center gap-3">
            {/* Hover-reveal action buttons - hidden on mobile, show on desktop hover */}
            {showMarkPaid && !isPaid && (
              <div className="hidden sm:flex items-center gap-1.5 opacity-0 translate-x-2 group-hover/compact:opacity-100 group-hover/compact:translate-x-0 transition-all duration-200">
                {/* Pay Now button */}
                {canShowPayNow ? (
                  <button
                    onClick={handlePayNow}
                    className={cn(
                      "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200",
                      "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400",
                      "text-white shadow-lg shadow-orange-500/30",
                      "active:scale-95"
                    )}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Pay
                  </button>
                ) : hasPaymentLink && !canUsePaymentLinks ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      showUpgradeModal('payment links');
                    }}
                    className={cn(
                      "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium",
                      "bg-gradient-to-r from-amber-500/30 to-orange-500/30",
                      "text-amber-200 border border-amber-500/30"
                    )}
                    title="Upgrade to Pro for payment links"
                  >
                    <Crown className="w-3.5 h-3.5" />
                    Pro
                  </button>
                ) : (
                  <button
                    disabled
                    className={cn(
                      "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium",
                      "bg-black/30 backdrop-blur-sm",
                      "text-white/40 border border-white/10 cursor-not-allowed"
                    )}
                    title="Add payment link in Edit Bill"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Pay
                  </button>
                )}

                {/* Mark Paid button */}
                <button
                  onClick={handleMarkPaid}
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200",
                    "bg-white/20 hover:bg-emerald-500/40 backdrop-blur-sm",
                    "text-white hover:text-emerald-100 border border-white/20 hover:border-emerald-400/50",
                    "active:scale-95 shadow-lg"
                  )}
                  title={bill.is_autopay ? "Confirm Auto-Paid" : "Mark as Paid"}
                >
                  {bill.is_autopay ? (
                    <Zap className="w-4 h-4" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                </button>
              </div>
            )}

            {/* Countdown */}
            <CountdownDisplay
              daysLeft={daysLeft}
              urgency={urgency}
              size="sm"
              colorMode={
                ['midnight', 'wine', 'onyx', 'amethyst', 'ocean', 'sunset'].includes(selectedTheme)
                  ? 'gradient'
                  : (urgency === 'overdue' || urgency === 'urgent' || urgency === 'soon')
                    ? 'urgency'
                    : 'white'
              }
            />
          </div>
        </div>
      </GradientCard>
    );
  }

  return (
    <GradientCard
      urgency={urgency}
      onClick={onClick}
      className={cn(
        'p-6 relative overflow-hidden',
        isPaid && 'opacity-60',
        className
      )}
    >
      {/* Paid overlay shimmer */}
      {isPaid && (
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-emerald-500/5 pointer-events-none" />
      )}

      <div className="flex flex-col h-full min-h-[180px]">
        {/* Top section: emoji + name */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "relative p-2 rounded-2xl bg-white/20 backdrop-blur-sm",
                isPaid && "grayscale-[30%]"
              )}
              role="img"
              aria-label={bill.category || 'bill'}
            >
              <IconComponent className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white leading-tight">
                {bill.name}
              </h3>
              {bill.amount && (
                <p className="text-white/80 text-sm font-medium flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" />
                  {formatCurrency(bill.amount).replace('$', '')}
                </p>
              )}
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-col gap-1.5 items-end">
            {/* Risk badge - shows for overdue, urgent, or forgot last month */}
            {riskConfig && !isPaid && (
              <div className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-sm border border-white/20",
                riskConfig.bgColor
              )}>
                <riskConfig.icon className={cn("w-3.5 h-3.5", riskConfig.textColor)} />
                <span className={cn("text-xs font-semibold", riskConfig.textColor)}>
                  {riskConfig.label}
                </span>
              </div>
            )}

            {/* Paid badge - shows when bill is paid */}
            {isPaid && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/40 backdrop-blur-sm border border-emerald-400/30">
                <Check className="w-4 h-4 text-emerald-200" />
                <span className="text-sm font-semibold text-emerald-100">
                  Paid
                </span>
              </div>
            )}

            {/* Autopay badge */}
            {bill.is_autopay && !isPaid && (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/30 backdrop-blur-sm"
                title="Autopay enabled"
              >
                <CreditCard className="w-3.5 h-3.5 text-emerald-200" />
                <span className="text-xs font-medium text-emerald-100">
                  Autopay
                </span>
              </div>
            )}

            {/* Category badge */}
            {bill.category && !isPaid && (
              <div
                className="flex items-center gap-1 px-2 py-0.5 rounded-full backdrop-blur-sm"
                style={{
                  backgroundColor: CATEGORY_COLORS[bill.category].bg,
                  border: `1px solid ${CATEGORY_COLORS[bill.category].border}`,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: CATEGORY_COLORS[bill.category].text }}
                />
                <span
                  className="text-[10px] font-medium"
                  style={{ color: CATEGORY_COLORS[bill.category].text }}
                >
                  {categoryLabels[bill.category]}
                </span>
              </div>
            )}

            {/* Recurring badge */}
            {bill.is_recurring && !isPaid && (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm"
                title={`Repeats ${bill.recurrence_interval}`}
              >
                <RefreshCw className="w-3.5 h-3.5 text-white" />
                <span className="text-xs font-medium text-white capitalize">
                  {bill.recurrence_interval}
                </span>
              </div>
            )}


            {/* Price change badge */}
            {priceChange && !isPaid && (
              <div
                className={cn(
                  'flex items-center gap-1 px-2 py-0.5 rounded-full backdrop-blur-sm',
                  priceChange.isIncrease
                    ? 'bg-rose-500/30'
                    : 'bg-emerald-500/30'
                )}
                title={`Price ${priceChange.isIncrease ? 'increased' : 'decreased'} by ${formatCurrency(priceChange.amount)}`}
              >
                {priceChange.isIncrease ? (
                  <TrendingUp className="w-3 h-3 text-rose-200" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-emerald-200" />
                )}
                <span
                  className={cn(
                    'text-xs font-medium',
                    priceChange.isIncrease ? 'text-rose-100' : 'text-emerald-100'
                  )}
                >
                  {priceChange.isIncrease ? '+' : '-'}
                  {priceChange.percentage.toFixed(0)}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Center section: countdown (hero element) */}
        <div className={cn(
          "flex-1 flex items-center justify-center py-4",
          isPaid && "opacity-50"
        )}>
          <CountdownDisplay
            daysLeft={daysLeft}
            urgency={urgency}
            size="lg"
            colorMode={
              ['midnight', 'wine', 'onyx', 'amethyst', 'ocean', 'sunset'].includes(selectedTheme)
                ? 'gradient'
                : (urgency === 'overdue' || urgency === 'urgent' || urgency === 'soon')
                  ? 'urgency'
                  : 'white'
            }
          />
        </div>

        {/* Bottom section: due date + Mark as Paid button */}
        <div className="space-y-3 pt-2 border-t border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white/80">
              <Calendar className="w-4 h-4" />
              <span className="text-sm font-medium">
                {formatDate(bill.due_date)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Payment link indicator */}
              {bill.payment_url && (
                <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-white/20 text-white/80">
                  <ExternalLink className="w-2.5 h-2.5" />
                  Pay
                </span>
              )}

              {/* Source indicator */}
              {bill.source === 'gmail' && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-white/20 text-white/80 whitespace-nowrap">
                  email
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {showMarkPaid && !isPaid && (
            <div className="flex gap-2">
              {/* Pay Now Button - Primary action if payment link exists and user is Pro */}
              {canShowPayNow ? (
                <button
                  onClick={handlePayNow}
                  className={cn(
                    "group relative flex-1 py-2.5 rounded-xl font-medium text-sm transition-all duration-200",
                    "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400",
                    "active:scale-[0.98]",
                    "flex items-center justify-center gap-2",
                    "shadow-lg shadow-orange-500/20"
                  )}
                >
                  <ExternalLink className="w-4 h-4 text-white" />
                  <span className="text-white font-semibold">Pay Now</span>
                </button>
              ) : hasPaymentLink && !canUsePaymentLinks ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    showUpgradeModal('payment links');
                  }}
                  className={cn(
                    "group relative flex-1 py-2.5 rounded-xl font-medium text-sm transition-all duration-200",
                    "bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30",
                    "active:scale-[0.98]",
                    "flex items-center justify-center gap-2",
                    "border border-amber-500/30"
                  )}
                >
                  <Crown className="w-4 h-4 text-amber-300" />
                  <span className="text-amber-200 font-semibold">Upgrade for Pay Now</span>
                </button>
              ) : (
                <div className="flex-1 relative">
                  <button
                    disabled
                    className={cn(
                      "w-full py-2.5 rounded-xl font-medium text-sm",
                      "bg-white/5 border border-white/10",
                      "flex items-center justify-center gap-2",
                      "text-zinc-500 cursor-not-allowed"
                    )}
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Pay Now</span>
                  </button>
                  <p className="absolute -bottom-5 left-0 right-0 text-[10px] text-zinc-500 text-center">
                    Add payment link in Edit
                  </p>
                </div>
              )}

              {/* Mark as Paid Button - Secondary */}
              <button
                onClick={handleMarkPaid}
                className={cn(
                  "group relative py-2.5 px-4 rounded-xl font-medium text-sm transition-all duration-200",
                  "bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30",
                  "active:scale-[0.98] active:bg-white/25",
                  "flex items-center justify-center gap-2",
                  "shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]",
                  "hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_0_20px_rgba(255,255,255,0.1)]"
                )}
                title={bill.is_autopay ? "Confirm Auto-Paid" : "Mark as Paid"}
              >
                {bill.is_autopay ? (
                  <Zap className="w-4 h-4 text-emerald-300 group-hover:text-emerald-200 transition-colors" />
                ) : (
                  <Check className="w-4 h-4 text-white/70 group-hover:text-emerald-300 transition-colors" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </GradientCard>
  );
}

// Map urgency to CSS variable name
const urgencyVarMap = {
  overdue: '--urgency-overdue',
  urgent: '--urgency-urgent',
  soon: '--urgency-soon',
  safe: '--urgency-safe',
  distant: '--urgency-distant',
};

// List item variant for the bills list view
export function BillListItem({
  bill,
  onClick,
  onMarkPaid,
  onPayNow,
  className,
  showMarkPaid = true,
  riskType,
}: BillCardProps) {
  const { canUsePaymentLinks, showUpgradeModal } = useSubscription();
  const daysLeft = getDaysUntilDue(bill.due_date);
  const urgency = getUrgency(daysLeft);
  const priceChange = getPriceChange(bill.amount, bill.previous_amount);
  const isPaid = bill.is_paid;
  const hasPaymentLink = !!bill.payment_url;
  const canShowPayNow = hasPaymentLink && canUsePaymentLinks;
  const { icon: IconComponent, colorClass: iconColorClass } = getBillIcon(bill);
  const showLatePaymentRisk = hasLatePaymentRisk(bill);
  const riskConfig = riskType ? riskBadgeConfig[riskType] : null;

  // List-specific risk badge colors (for light/dark mode)
  const listRiskBadgeConfig: Record<RiskType, { bgLight: string; bgDark: string; textLight: string; textDark: string }> = {
    overdue: {
      bgLight: 'bg-rose-100',
      bgDark: 'dark:bg-rose-900/40',
      textLight: 'text-rose-600',
      textDark: 'dark:text-rose-400',
    },
    urgent: {
      bgLight: 'bg-orange-100',
      bgDark: 'dark:bg-orange-900/40',
      textLight: 'text-orange-600',
      textDark: 'dark:text-orange-400',
    },
    forgot_last_month: {
      bgLight: 'bg-amber-100',
      bgDark: 'dark:bg-amber-900/40',
      textLight: 'text-amber-600',
      textDark: 'dark:text-amber-400',
    },
  };
  const listRiskConfig = riskType ? listRiskBadgeConfig[riskType] : null;

  const handleMarkPaid = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onMarkPaid && !isPaid) {
      onMarkPaid(bill);
    }
  };

  const handlePayNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPayNow && !isPaid) {
      onPayNow(bill);
    }
  };

  // Format amount display
  const formatAmount = () => {
    return bill.amount ? formatCurrency(bill.amount) : null;
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative flex items-center gap-4 p-4 bg-white dark:bg-zinc-900 rounded-2xl',
        'border border-zinc-200 dark:border-zinc-800',
        'shadow-sm hover:shadow-md transition-all duration-200',
        'hover:-translate-y-0.5 cursor-pointer',
        isPaid && 'opacity-60 bg-emerald-50/50 dark:bg-emerald-900/10',
        className
      )}
    >
      {/* Urgency color bar */}
      <div
        className={cn(
          "absolute left-0 top-3 bottom-3 w-1 rounded-full",
          isPaid && "bg-emerald-500"
        )}
        style={!isPaid ? { backgroundColor: `var(${urgencyVarMap[urgency]})` } : undefined}
      />

      {/* Icon */}
      <div className={cn("pl-2 flex-shrink-0", isPaid && "grayscale-[30%]")}>
        <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-white/10 flex items-center justify-center">
          <IconComponent className={cn("w-5 h-5", iconColorClass)} />
        </div>
      </div>

      {/* Bill info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-zinc-900 dark:text-white truncate">
            {bill.name}
          </h3>
          {/* Risk badge */}
          {riskConfig && listRiskConfig && !isPaid && (
            <span className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border",
              listRiskConfig.bgLight, listRiskConfig.bgDark,
              listRiskConfig.textLight, listRiskConfig.textDark,
              riskType === 'overdue' && 'border-rose-200 dark:border-rose-700/50',
              riskType === 'urgent' && 'border-orange-200 dark:border-orange-700/50',
              riskType === 'forgot_last_month' && 'border-amber-200 dark:border-amber-700/50'
            )}>
              <riskConfig.icon className="w-3 h-3" />
              {riskType === 'forgot_last_month' ? 'Forgot' : riskConfig.label}
            </span>
          )}
          {/* Paid badge */}
          {isPaid && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700/50">
              <Check className="w-3 h-3" />
              <span className="text-[10px] font-semibold">Paid</span>
            </span>
          )}
          {bill.category && !isPaid && (
            <span
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: CATEGORY_COLORS[bill.category].bg,
                border: `1px solid ${CATEGORY_COLORS[bill.category].border}`,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: CATEGORY_COLORS[bill.category].text }}
              />
              <span
                className="text-[10px] font-medium"
                style={{ color: CATEGORY_COLORS[bill.category].text }}
              >
                {categoryLabels[bill.category].slice(0, 6)}
              </span>
            </span>
          )}
          {bill.is_autopay && !isPaid && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
              <CreditCard className="w-3 h-3" />
              <span className="text-[10px] font-medium">Auto</span>
            </span>
          )}
          {bill.is_recurring && !isPaid && (
            <RefreshCw className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
          )}
          {bill.payment_url && !isPaid && (
            <ExternalLink className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
          )}
          {priceChange && !isPaid && (
            <span
              className={cn(
                'flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium',
                priceChange.isIncrease
                  ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
                  : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
              )}
            >
              {priceChange.isIncrease ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {priceChange.isIncrease ? '+' : '-'}{priceChange.percentage.toFixed(0)}%
            </span>
          )}
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {formatDate(bill.due_date)}
          {formatAmount() && ` • ${formatAmount()}`}
        </p>
      </div>

      {/* Action buttons or Countdown */}
      {showMarkPaid && !isPaid ? (
        <div className="flex items-center gap-2">
          {/* Pay Now button */}
          {canShowPayNow ? (
            <button
              onClick={handlePayNow}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                "bg-gradient-to-r from-orange-500 to-amber-500 text-white",
                "hover:from-orange-400 hover:to-amber-400",
                "active:scale-95"
              )}
            >
              <ExternalLink className="w-4 h-4" />
              Pay
            </button>
          ) : hasPaymentLink && !canUsePaymentLinks ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                showUpgradeModal('payment links');
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                "bg-amber-500/20 text-amber-500 dark:text-amber-400",
                "border border-amber-500/30 hover:bg-amber-500/30"
              )}
              title="Upgrade to Pro for payment links"
            >
              <Crown className="w-4 h-4" />
              Pro
            </button>
          ) : (
            <button
              disabled
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium",
                "bg-zinc-100 dark:bg-white/5 text-zinc-400 dark:text-zinc-600",
                "border border-zinc-200 dark:border-white/5 cursor-not-allowed"
              )}
              title="Add payment link in Edit Bill"
            >
              <ExternalLink className="w-4 h-4" />
              Pay
            </button>
          )}
          {/* Mark Paid button */}
          <button
            onClick={handleMarkPaid}
            className={cn(
              "flex items-center gap-1.5 px-2 py-2 rounded-xl text-sm font-medium transition-all duration-200",
              "bg-zinc-100 dark:bg-white/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20",
              "text-zinc-600 dark:text-white/80 hover:text-emerald-600 dark:hover:text-emerald-300",
              "border border-zinc-200 dark:border-white/10 hover:border-emerald-300 dark:hover:border-emerald-500/30",
              "active:scale-95"
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
      ) : (
        <div
          className={cn(
            "text-right px-3 py-1.5 rounded-xl",
            isPaid && "bg-emerald-100/50 dark:bg-emerald-900/20"
          )}
          style={!isPaid ? {
            backgroundColor: `color-mix(in srgb, var(${urgencyVarMap[urgency]}) 15%, transparent)`,
          } : undefined}
        >
          <span
            className={cn("text-2xl font-bold", isPaid && "text-emerald-500")}
            style={!isPaid ? { color: `var(${urgencyVarMap[urgency]})` } : undefined}
          >
            {isPaid ? '✓' : Math.abs(daysLeft)}
          </span>
          <p
            className={cn("text-xs font-medium", isPaid && "text-emerald-500/70")}
            style={!isPaid ? { color: `var(${urgencyVarMap[urgency]})` } : undefined}
          >
            {isPaid ? 'paid' : daysLeft < 0 ? 'days ago' : daysLeft === 0 ? 'today' : 'days left'}
          </p>
        </div>
      )}
    </div>
  );
}
