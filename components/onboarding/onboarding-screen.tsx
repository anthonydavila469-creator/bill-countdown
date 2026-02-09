'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { TemplateSelector } from './template-selector';
import { OptionalSetup, SetupOptions } from './optional-setup';
import { GmailSyncStep } from './gmail-sync-step';
import {
  getTemplateById,
  getNextDueDateForDay,
} from '@/lib/onboarding/bill-templates';
import { useToast } from '@/components/ui/toast';
import { useSubscription } from '@/hooks/use-subscription';
import { Bill } from '@/types';
import {
  Zap,
  Sparkles,
  Plus,
  ArrowRight,
  Loader2,
  ChevronLeft,
  Mail,
  Crown,
} from 'lucide-react';

type OnboardingStep = 'welcome' | 'gmail_sync' | 'templates' | 'setup' | 'creating';

interface OnboardingScreenProps {
  onComplete: () => void;
  onAddManually: () => void;
  isGmailConnected?: boolean;
}

export function OnboardingScreen({
  onComplete,
  onAddManually,
  isGmailConnected = false,
}: OnboardingScreenProps) {
  const { addToast } = useToast();
  const { isPro, canSyncGmail, showUpgradeModal, refreshSubscription } = useSubscription();

  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<string>>(
    new Set()
  );
  const [setupOptions, setSetupOptions] = useState<SetupOptions>({
    autopayTracking: false,
    paycheckMode: false,
    emailReminders: false,
  });
  const [isCreating, setIsCreating] = useState(false);

  const handleQuickAdd = () => {
    setStep('templates');
  };

  const handleGmailSync = () => {
    if (canSyncGmail) {
      setStep('gmail_sync');
    } else {
      showUpgradeModal('unlimited Gmail syncs');
    }
  };

  const handleGmailComplete = async (importedBills: Bill[]) => {
    await refreshSubscription();
    addToast({
      message: `${importedBills.length} bill${importedBills.length === 1 ? '' : 's'} imported`,
      description: 'Tap any bill to edit details',
      type: 'success',
    });
    onComplete();
  };

  const handleGmailSkip = () => {
    setStep('templates');
  };

  const handleBackToWelcome = () => {
    setStep('welcome');
  };

  const handleContinueToSetup = () => {
    if (selectedTemplateIds.size === 0) {
      // If nothing selected, just complete
      onComplete();
      return;
    }
    setStep('setup');
  };

  const handleSkipSetup = async () => {
    await createBills();
  };

  const handleFinish = async () => {
    await createBills();
  };

  const createBills = async () => {
    if (selectedTemplateIds.size === 0) {
      onComplete();
      return;
    }

    setStep('creating');
    setIsCreating(true);

    try {
      const templates = Array.from(selectedTemplateIds)
        .map((id) => getTemplateById(id))
        .filter(Boolean);

      // Create bills one by one
      let successCount = 0;

      for (const template of templates) {
        if (!template) continue;

        const dueDate = getNextDueDateForDay(template.defaultDay);

        const billData = {
          name: template.name,
          emoji: template.emoji,
          category: template.category,
          due_date: dueDate,
          amount: null,
          is_recurring: true,
          recurrence_interval: 'monthly',
          recurrence_day_of_month: template.defaultDay,
          is_autopay: setupOptions.autopayTracking,
          notes: null,
          payment_url: null,
          is_variable: false,
          typical_min: null,
          typical_max: null,
        };

        try {
          const response = await fetch('/api/bills', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(billData),
          });

          if (response.ok) {
            successCount++;
          }
        } catch (error) {
          console.error(`Failed to create bill ${template.name}:`, error);
        }
      }

      // Show success toast
      if (successCount > 0) {
        addToast({
          message: `${successCount} bill${successCount === 1 ? '' : 's'} added`,
          description: 'Tap any bill to edit details',
          type: 'success',
        });
      }

      onComplete();
    } catch (error) {
      console.error('Failed to create bills:', error);
      addToast({
        message: 'Error',
        description: 'Failed to create some bills. Please try again.',
        type: 'error',
      });
      setIsCreating(false);
      setStep('templates');
    }
  };

  return (
    <div className="min-h-screen bg-[#08080c] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Step: Welcome */}
        {step === 'welcome' && (
          <WelcomeStep
            onQuickAdd={handleQuickAdd}
            onGmailSync={handleGmailSync}
            onAddManually={onAddManually}
            isPro={isPro}
            canSyncGmail={canSyncGmail}
          />
        )}

        {/* Step: Gmail Sync */}
        {step === 'gmail_sync' && (
          <GmailSyncStep
            onBack={handleBackToWelcome}
            onComplete={handleGmailComplete}
            onSkip={handleGmailSkip}
            isGmailConnected={isGmailConnected}
          />
        )}

        {/* Step: Template Selection */}
        {step === 'templates' && (
          <TemplatesStep
            selectedIds={selectedTemplateIds}
            onSelectionChange={setSelectedTemplateIds}
            onBack={handleBackToWelcome}
            onContinue={handleContinueToSetup}
          />
        )}

        {/* Step: Optional Setup */}
        {step === 'setup' && (
          <SetupStep
            options={setupOptions}
            onChange={setSetupOptions}
            selectedCount={selectedTemplateIds.size}
            onSkip={handleSkipSetup}
            onFinish={handleFinish}
          />
        )}

        {/* Step: Creating */}
        {step === 'creating' && (
          <CreatingStep count={selectedTemplateIds.size} />
        )}
      </div>
    </div>
  );
}

// Welcome Step Component
interface WelcomeStepProps {
  onQuickAdd: () => void;
  onGmailSync: () => void;
  onAddManually: () => void;
  isPro: boolean;
  canSyncGmail: boolean;
}

function WelcomeStep({ onQuickAdd, onGmailSync, onAddManually, isPro, canSyncGmail }: WelcomeStepProps) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Logo */}
      <div className="flex justify-center mb-8">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <div className="absolute -inset-2 bg-gradient-to-br from-orange-500/30 to-amber-500/30 rounded-3xl blur-xl -z-10" />
        </div>
      </div>

      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-2xl font-bold text-white mb-3">
          Let&apos;s set up your bills
        </h1>
        <p className="text-white/50">
          Choose how you want to get started tracking your bills
        </p>
      </div>

      {/* Options - Different layout for Pro vs Free */}
      <div className="space-y-3">
        {/* Gmail Sync - Primary for Pro users */}
        <button
          onClick={onGmailSync}
          className={cn(
            'group w-full p-5 rounded-2xl transition-all duration-300',
            isPro
              ? 'bg-gradient-to-br from-orange-500/15 to-amber-500/15 border border-orange-500/30 hover:border-orange-500/50 hover:from-orange-500/20 hover:to-amber-500/20'
              : 'bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/20 hover:border-orange-500/40'
          )}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-white">Sync from Gmail</h3>
                {!isPro && canSyncGmail && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-medium">
                    1 FREE
                  </span>
                )}
                {!canSyncGmail && (
                  <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-medium">
                    <Crown className="w-3 h-3" />
                    PRO
                  </span>
                )}
              </div>
              <p className="text-sm text-white/50">
                {isPro
                  ? 'Automatically import bills from your inbox'
                  : canSyncGmail
                    ? 'Import bills from your inbox (1 free sync)'
                    : 'Upgrade to Pro for unlimited Gmail syncs'
                }
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-orange-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* Quick Add from Templates */}
        <button
          onClick={onQuickAdd}
          className={cn(
            'group w-full p-5 rounded-2xl transition-all duration-300',
            isPro
              ? 'bg-white/[0.02] border border-white/10 hover:bg-white/[0.04] hover:border-white/20'
              : 'bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 hover:border-amber-500/40 hover:from-amber-500/15 hover:to-orange-500/15'
          )}
        >
          <div className="flex items-center gap-4">
            <div className={cn(
              "p-3 rounded-xl",
              isPro ? "bg-white/10" : "bg-gradient-to-br from-amber-500 to-orange-500"
            )}>
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-white mb-1">Add from Templates</h3>
              <p className="text-sm text-white/50">
                Select from common bills like rent, utilities, subscriptions
              </p>
            </div>
            <ArrowRight className={cn(
              "w-5 h-5 group-hover:translate-x-1 transition-transform",
              isPro ? "text-white/40" : "text-amber-400"
            )} />
          </div>
        </button>

        {/* Add Manually - tertiary option */}
        <button
          onClick={onAddManually}
          className={cn(
            'group w-full p-5 rounded-2xl transition-all duration-300',
            'bg-white/[0.02] border border-white/10',
            'hover:bg-white/[0.04] hover:border-white/20'
          )}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-white/10">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-white mb-1">Add Manually</h3>
              <p className="text-sm text-white/50">
                Create a custom bill with your own details
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-white/40 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      </div>
    </div>
  );
}

// Templates Step Component
interface TemplatesStepProps {
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onBack: () => void;
  onContinue: () => void;
}

function TemplatesStep({
  selectedIds,
  onSelectionChange,
  onBack,
  onContinue,
}: TemplatesStepProps) {
  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-white">Select Your Bills</h2>
          <p className="text-sm text-white/50">Tap to select common bills you pay</p>
        </div>
      </div>

      {/* Template Selector */}
      <div className="mb-8 max-h-[50vh] overflow-y-auto pr-2 -mr-2">
        <TemplateSelector
          selectedIds={selectedIds}
          onSelectionChange={onSelectionChange}
        />
      </div>

      {/* Continue Button */}
      <button
        onClick={onContinue}
        disabled={selectedIds.size === 0}
        className={cn(
          'w-full py-4 rounded-xl font-semibold transition-all duration-200',
          'flex items-center justify-center gap-2',
          selectedIds.size > 0
            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90'
            : 'bg-white/10 text-white/30 cursor-not-allowed'
        )}
      >
        {selectedIds.size > 0 ? (
          <>
            Add {selectedIds.size} Bill{selectedIds.size === 1 ? '' : 's'}
            <ArrowRight className="w-4 h-4" />
          </>
        ) : (
          'Select bills to continue'
        )}
      </button>
    </div>
  );
}

// Setup Step Component
interface SetupStepProps {
  options: SetupOptions;
  onChange: (options: SetupOptions) => void;
  selectedCount: number;
  onSkip: () => void;
  onFinish: () => void;
}

function SetupStep({
  options,
  onChange,
  selectedCount,
  onSkip,
  onFinish,
}: SetupStepProps) {
  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold text-white mb-2">
          Optional Features
        </h2>
        <p className="text-sm text-white/50">
          Enable helpful features (you can change these later)
        </p>
      </div>

      {/* Options */}
      <div className="mb-8">
        <OptionalSetup options={options} onChange={onChange} />
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onSkip}
          className={cn(
            'flex-1 py-4 rounded-xl font-semibold transition-all duration-200',
            'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
          )}
        >
          Skip
        </button>
        <button
          onClick={onFinish}
          className={cn(
            'flex-1 py-4 rounded-xl font-semibold transition-all duration-200',
            'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90',
            'flex items-center justify-center gap-2'
          )}
        >
          Add {selectedCount} Bill{selectedCount === 1 ? '' : 's'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Creating Step Component
interface CreatingStepProps {
  count: number;
}

function CreatingStep({ count }: CreatingStepProps) {
  return (
    <div className="animate-in fade-in duration-200 text-center py-12">
      <div className="relative inline-flex mb-6">
        <Loader2 className="w-12 h-12 text-amber-400 animate-spin" />
        <div className="absolute inset-0 bg-amber-500/30 blur-xl rounded-full" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">Creating Your Bills</h2>
      <p className="text-white/50">
        Adding {count} bill{count === 1 ? '' : 's'} to your account...
      </p>
    </div>
  );
}
