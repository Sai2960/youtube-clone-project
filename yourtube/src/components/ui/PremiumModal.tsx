// src/components/ui/PremiumModal.tsx
import { X, Crown } from 'lucide-react';
import { useRouter } from 'next/router'; // ✅ Changed from react-router-dom

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: string;
  watchTimeLimit: number;
}

const PremiumModal = ({ isOpen, onClose, currentPlan, watchTimeLimit }: PremiumModalProps) => {
  const router = useRouter(); // ✅ Changed from navigate

  if (!isOpen) return null;

  const handleUpgrade = () => {
    router.push('/premium'); // ✅ Changed from navigate('/premium')
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl max-w-md w-full p-8 relative animate-scale-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-all"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center text-white">
          <div className="mb-6">
            <Crown className="w-20 h-20 mx-auto mb-4 text-yellow-300" />
            <h2 className="text-3xl font-bold mb-2">Upgrade to Premium</h2>
            <p className="text-purple-100">
              You are reached your {watchTimeLimit}-minute watch limit on the {currentPlan} plan
            </p>
          </div>

          <div className="bg-white bg-opacity-20 rounded-xl p-6 mb-6 backdrop-blur-sm">
            <h3 className="text-xl font-semibold mb-4">Unlock More with Premium</h3>
            <ul className="space-y-3 text-left">
              <li className="flex items-start">
                <span className="text-yellow-300 mr-2">✓</span>
                <span>Extended or unlimited watch time</span>
              </li>
              <li className="flex items-start">
                <span className="text-yellow-300 mr-2">✓</span>
                <span>Ad-free experience</span>
              </li>
              <li className="flex items-start">
                <span className="text-yellow-300 mr-2">✓</span>
                <span>Premium features and content</span>
              </li>
              <li className="flex items-start">
                <span className="text-yellow-300 mr-2">✓</span>
                <span>Priority customer support</span>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleUpgrade}
              className="w-full bg-yellow-400 text-purple-900 font-bold py-4 px-6 rounded-lg hover:bg-yellow-300 transform hover:scale-105 transition-all duration-200 shadow-lg"
            >
              View Premium Plans
            </button>
            <button
              onClick={onClose}
              className="w-full bg-white bg-opacity-20 text-white font-semibold py-3 px-6 rounded-lg hover:bg-opacity-30 transition-all"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumModal;