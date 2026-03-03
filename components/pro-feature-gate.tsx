'use client';

import { ReactNode } from 'react';

interface ProFeatureGateProps {
  children: ReactNode;
  feature: string;
  featureName: string;
  featureDescription: string;
  icon?: React.ComponentType<{ className?: string }>;
}

// All features unlocked — gate is a pass-through
export function ProFeatureGate({ children }: ProFeatureGateProps) {
  return <>{children}</>;
}
