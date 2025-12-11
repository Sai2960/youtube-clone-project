/* eslint-disable react-hooks/rules-of-hooks */

import SubscriptionBadge from './SubscriptionBadge';
import { useSubscription } from '../../lib/SubscriptionContext';

// Inside Header component
const { currentPlan } = useSubscription();


// Add in header JSX
<SubscriptionBadge />