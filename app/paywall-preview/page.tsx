'use client';

import { Paywall } from '@/components/paywall';

export default function PaywallPreview() {
  return (
    <>
      <style>{`
        .fixed.inset-0 .overflow-y-auto > div {
          padding-top: 3.5rem !important;
        }
      `}</style>
      <div className="min-h-screen bg-zinc-950">
        <Paywall isOpen={true} onClose={() => {}} />
      </div>
    </>
  );
}
