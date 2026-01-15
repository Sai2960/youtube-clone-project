// pages/subscription.tsx
import React from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// ✅ CRITICAL: Dynamic import with SSR disabled to prevent hydration issues
const SubscriptionPage = dynamic(
  () => import('@/components/SubscriptionPage'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen bg-youtube-primary">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    ),
  }
);

export default function Subscriptions() {
  return <SubscriptionPage />;
}
