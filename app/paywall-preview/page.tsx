'use client';

import { Paywall } from '@/components/paywall';

export default function PaywallPreview() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <Paywall isOpen={true} onClose={() => {}} />
    </div>
  );
}
