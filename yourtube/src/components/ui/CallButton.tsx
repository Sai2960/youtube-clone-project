// components/ui/CallButton.tsx - COMPONENT TO INITIATE VIDEO CALLS
import React, { useState } from 'react';
import { Video, Phone, Loader2 } from 'lucide-react';
import { useRouter } from 'next/router';
import axiosInstance from '@/lib/axiosinstance';
import { getSocket, isSocketConnected, initializeSocket } from '@/lib/socket';
import { useUser } from '@/lib/AuthContext';

interface CallButtonProps {
  recipientId: string;
  recipientName: string;
  recipientImage?: string;
  variant?: 'icon' | 'button';
  size?: 'sm' | 'md' | 'lg';
}

const CallButton: React.FC<CallButtonProps> = ({
  recipientId,
  recipientName,
  recipientImage,
  variant = 'icon',
  size = 'md'
}) => {
  const router = useRouter();
  const { user } = useUser();
  const [isInitiating, setIsInitiating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sizeClasses = {
    sm: 'p-2',
    md: 'p-3',
    lg: 'p-4'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const handleCall = async () => {
    if (!user) {
      alert('Please log in to make calls');
      return;
    }

    if (recipientId === user._id) {
      alert('You cannot call yourself');
      return;
    }

    try {
      setIsInitiating(true);
      setError(null);

      console.log('\n📞 ===== INITIATING CALL =====');
      console.log('   From:', user.name || user.channelname);
      console.log('   To:', recipientName);
      console.log('   Recipient ID:', recipientId);

      // 1. Ensure socket is connected
      if (!isSocketConnected()) {
        console.log('🔌 Socket not connected, initializing...');
        initializeSocket(user._id);
        
        // Wait for socket to connect
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Socket connection timeout')), 5000);
          const checkInterval = setInterval(() => {
            if (isSocketConnected()) {
              clearInterval(checkInterval);
              clearTimeout(timeout);
              resolve(true);
            }
          }, 100);
        });
      }

      const socket = getSocket();
      console.log('✅ Socket ready:', socket.id);

      // 2. Create call in database
      console.log('📝 Creating call record...');
      const response = await axiosInstance.post('/call/initiate', {
        receiverId: recipientId
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to initiate call');
      }

      const { roomId, _id: callId } = response.data.call;
      console.log('✅ Call record created');
      console.log('   Room ID:', roomId);
      console.log('   Call ID:', callId);

      // 3. Send call notification via socket
      console.log('📤 Sending call notification...');
      socket.emit('call-user', {
        userToCall: recipientId,
        from: user._id,
        name: user.name || user.channelname,
        image: user.image || '',
        roomId: roomId,
        callId: callId
      });

      // 4. Wait for acknowledgment or timeout
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Call initiation timeout'));
        }, 3000);

        socket.once('call-initiated', (data) => {
          clearTimeout(timeout);
          if (data.success) {
            console.log('✅ Call initiated successfully');
            resolve(data);
          } else {
            reject(new Error('Call initiation failed'));
          }
        });

        socket.once('call-error', (data) => {
          clearTimeout(timeout);
          reject(new Error(data.message || 'Recipient is offline'));
        });
      });

      // 5. Navigate to call page
      console.log('🚀 Navigating to call page...');
      console.log('===== CALL INITIATED =====\n');

      router.push({
        pathname: `/call/${roomId}`,
        query: {
          callId: callId,
          remoteName: recipientName,
          initiator: 'true'
        }
      });

    } catch (error: any) {
      console.error('❌ Failed to initiate call:', error);
      
      let errorMessage = 'Failed to start call';
      if (error.message.includes('offline')) {
        errorMessage = `${recipientName} is not available`;
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Connection timeout - please try again';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setIsInitiating(false);
    }
  };

  if (variant === 'button') {
    return (
      <button
        onClick={handleCall}
        disabled={isInitiating}
        className={`
          flex items-center gap-2 
          bg-green-600 hover:bg-green-700 
          disabled:bg-gray-400 disabled:cursor-not-allowed
          text-white font-medium rounded-lg 
          transition-all duration-200
          ${sizeClasses[size]}
        `}
        title={`Call ${recipientName}`}
      >
        {isInitiating ? (
          <>
            <Loader2 className={`${iconSizes[size]} animate-spin`} />
            <span>Calling...</span>
          </>
        ) : (
          <>
            <Video className={iconSizes[size]} />
            <span>Video Call</span>
          </>
        )}
      </button>
    );
  }

  // Icon variant (default)
  return (
    <button
      onClick={handleCall}
      disabled={isInitiating}
      className={`
        ${sizeClasses[size]}
        rounded-full 
        bg-green-600 hover:bg-green-700 
        disabled:bg-gray-400 disabled:cursor-not-allowed
        text-white 
        transition-all duration-200 
        shadow-lg hover:shadow-xl
        transform hover:scale-110 active:scale-95
      `}
      title={`Call ${recipientName}`}
      aria-label={`Call ${recipientName}`}
    >
      {isInitiating ? (
        <Loader2 className={`${iconSizes[size]} animate-spin`} />
      ) : (
        <Video className={iconSizes[size]} />
      )}
    </button>
  );
};

export default CallButton;

// ==========================================
// USAGE EXAMPLES
// ==========================================

/*
// EXAMPLE 1: Icon button (minimal)
<CallButton 
  recipientId="user123"
  recipientName="John Doe"
  recipientImage="https://..."
/>

// EXAMPLE 2: Full button with text
<CallButton 
  recipientId="user123"
  recipientName="John Doe"
  variant="button"
  size="lg"
/>

// EXAMPLE 3: In a user profile
<div className="flex gap-2">
  <CallButton 
    recipientId={profile._id}
    recipientName={profile.name}
    recipientImage={profile.image}
    size="md"
  />
  <button className="p-3 bg-blue-600 text-white rounded-full">
    <MessageCircle className="w-5 h-5" />
  </button>
</div>

// EXAMPLE 4: In a contact list
{contacts.map(contact => (
  <div key={contact._id} className="flex justify-between items-center p-4">
    <div className="flex items-center gap-3">
      <img src={contact.image} className="w-10 h-10 rounded-full" />
      <span>{contact.name}</span>
    </div>
    <CallButton
      recipientId={contact._id}
      recipientName={contact.name}
      recipientImage={contact.image}
      size="sm"
    />
  </div>
))}
*/