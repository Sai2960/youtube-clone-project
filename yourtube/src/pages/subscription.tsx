// pages/subscription.tsx
import React from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// ✅ CRITICAL: Dynamic import with SSR disabled
const SubscriptionPage = dynamic(
  () => import('@/components/SubscriptionPage'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen bg-youtube-primary">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-red-600 mx-auto mb-4" />
          <p className="text-youtube-secondary">Loading subscription page...</p>
        </div>
      </div>
    ),
  }
);

export default function Subscriptions() {
  return <SubscriptionPage />;
}