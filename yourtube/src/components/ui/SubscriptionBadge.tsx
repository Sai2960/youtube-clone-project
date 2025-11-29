// src/components/ui/SubscriptionBadge.tsx
import { Crown, Zap, Star } from 'lucide-react';
import { useSubscription } from '@/lib/SubscriptionContext';
import { useRouter } from 'next/router'; // ✅ Changed

const SubscriptionBadge = () => {
  const { currentPlan, watchTimeLimit } = useSubscription();
  const router = useRouter(); // ✅ Changed from navigate

  const planConfig = {
    FREE: {
      icon: Star,
      color: 'bg-gray-500',
      textColor: 'text-gray-700',
      bgLight: 'bg-gray-100'
    },
    BRONZE: {
      icon: Zap,
      color: 'bg-orange-600',
      textColor: 'text-orange-700',
      bgLight: 'bg-orange-50'
    },
    SILVER: {
      icon: Crown,
      color: 'bg-gray-400',
      textColor: 'text-gray-700',
      bgLight: 'bg-gray-100'
    },
    GOLD: {
      icon: Crown,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-700',
      bgLight: 'bg-yellow-50'
    }
  };

  const config = planConfig[currentPlan as keyof typeof planConfig] || planConfig.FREE;
  const Icon = config.icon;

  return (
    <div
      onClick={() => router.push('/premium')} // ✅ Changed
      className={`flex items-center gap-2 ${config.bgLight} ${config.textColor} px-4 py-2 rounded-full cursor-pointer hover:shadow-lg transition-all duration-200 transform hover:scale-105`}
    >
      <Icon className="w-5 h-5" />
      <div className="flex flex-col">
        <span className="text-xs font-semibold">{currentPlan}</span>
        <span className="text-xs">
          {watchTimeLimit === -1 ? 'Unlimited' : `${watchTimeLimit} min`}
        </span>
      </div>
    </div>
  );
};

export default SubscriptionBadge;