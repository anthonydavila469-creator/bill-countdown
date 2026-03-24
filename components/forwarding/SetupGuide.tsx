'use client';

import { useState } from 'react';
import { ChevronDown, Mail, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SetupGuideProps {
  inboxAddress: string;
}

type ProviderId = 'gmail' | 'yahoo' | 'outlook' | 'icloud' | 'apple-mail' | 'manual';

interface Provider {
  id: ProviderId;
  name: string;
  steps: string[];
}

const PROVIDERS: Provider[] = [
  {
    id: 'gmail',
    name: 'Gmail',
    steps: [
      'Open Gmail and click the gear icon, then "See all settings".',
      'Go to the "Forwarding and POP/IMAP" tab.',
      'Click "Add a forwarding address" and enter your Duezo address.',
      'Gmail will send a confirmation email — check your Duezo dashboard for the code.',
      'Enter the confirmation code in Gmail and select "Forward a copy" to enable.',
      'Optionally, create a filter to only forward bill-related emails.',
    ],
  },
  {
    id: 'yahoo',
    name: 'Yahoo Mail',
    steps: [
      'Open Yahoo Mail and click the gear icon, then "More Settings".',
      'Select "Mailboxes" from the left menu.',
      'Click on your Yahoo email address.',
      'Scroll down to "Forwarding" and enter your Duezo address.',
      'Click "Verify" — Yahoo will send a confirmation email.',
      'Confirm the forwarding to activate it.',
    ],
  },
  {
    id: 'outlook',
    name: 'Outlook',
    steps: [
      'Go to Outlook.com and click the gear icon, then "View all Outlook settings".',
      'Navigate to Mail → Forwarding.',
      'Check "Enable forwarding" and enter your Duezo address.',
      'Optionally check "Keep a copy of forwarded messages".',
      'Click "Save" to activate forwarding.',
    ],
  },
  {
    id: 'icloud',
    name: 'iCloud Mail',
    steps: [
      'Go to iCloud.com and open Mail.',
      'Click the gear icon and select "Preferences".',
      'Go to the "Rules" tab and click "Add a Rule".',
      'Set the condition to "any message" and the action to "Forward to" your Duezo address.',
      'Click "Done" to save the rule.',
    ],
  },
  {
    id: 'apple-mail',
    name: 'Apple Mail (Mac)',
    steps: [
      'Open Apple Mail and go to Mail → Preferences (or Settings).',
      'Go to the "Rules" tab and click "Add Rule".',
      'Set a description like "Forward bills to Duezo".',
      'Set conditions to match bill emails (e.g., from specific senders).',
      'Set the action to "Forward Message" to your Duezo address.',
      'Click "OK" to save.',
    ],
  },
  {
    id: 'manual',
    name: 'Manual Forward',
    steps: [
      'Open any bill email in your inbox.',
      'Click "Forward" and enter your Duezo address as the recipient.',
      'Send the email — Duezo will automatically extract the bill details.',
    ],
  },
];

export function SetupGuide({ inboxAddress }: SetupGuideProps) {
  const [openId, setOpenId] = useState<ProviderId | null>(null);

  return (
    <div className="space-y-2">
      {PROVIDERS.map((provider) => {
        const isOpen = openId === provider.id;

        return (
          <div
            key={provider.id}
            className={cn(
              'rounded-xl border transition-all duration-300',
              isOpen
                ? 'border-violet-500/20 bg-violet-500/[0.03]'
                : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.03]'
            )}
          >
            <button
              onClick={() => setOpenId(isOpen ? null : provider.id)}
              className="flex items-center justify-between w-full px-4 py-3.5 text-left"
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'p-2 rounded-lg transition-colors',
                  isOpen ? 'bg-violet-500/10' : 'bg-white/[0.04]'
                )}>
                  {provider.id === 'manual' ? (
                    <Send className={cn('w-4 h-4', isOpen ? 'text-violet-400' : 'text-zinc-400')} />
                  ) : (
                    <Mail className={cn('w-4 h-4', isOpen ? 'text-violet-400' : 'text-zinc-400')} />
                  )}
                </div>
                <span className={cn(
                  'font-medium text-sm tracking-wide',
                  isOpen ? 'text-white' : 'text-zinc-300'
                )}>
                  {provider.name}
                </span>
              </div>
              <ChevronDown
                className={cn(
                  'w-4 h-4 text-zinc-500 transition-transform duration-300',
                  isOpen && 'rotate-180 text-violet-400'
                )}
              />
            </button>

            {isOpen && (
              <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="pl-2 border-l border-violet-500/20 ml-4 space-y-3">
                  {provider.steps.map((step, index) => (
                    <div key={index} className="flex gap-3 pl-3">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-violet-500/15 text-violet-400 text-xs font-semibold flex items-center justify-center mt-0.5">
                        {index + 1}
                      </span>
                      <p className="text-sm text-zinc-400 leading-relaxed">
                        {step.includes('Duezo address') ? (
                          <>
                            {step.split('Duezo address')[0]}
                            <span className="text-violet-300 font-mono text-xs bg-violet-500/10 px-1.5 py-0.5 rounded">
                              {inboxAddress}
                            </span>
                            {step.split('Duezo address')[1]}
                          </>
                        ) : (
                          step
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
