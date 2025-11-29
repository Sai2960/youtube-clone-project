/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @typescript-eslint/no-unused-vars */
import SubscriptionBadge from './SubscriptionBadge';
import { useSubscription } from '../../lib/SubscriptionContext';

// Inside Header component
const { currentPlan } = useSubscription();


// Add in header JSX
<SubscriptionBadge />