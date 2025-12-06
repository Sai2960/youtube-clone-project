// controllers/callController.js - COMPLETE FIXED VERSION
import Call from '../Modals/Call.js';
import User from '../Modals/User.js';
import mongoose from 'mongoose';

// Initiate a call
export const initiateCall = async (req, res) => {
  try {
    const { receiverId } = req.body;
    
    // ✅ FIX: Handle different possible JWT payload structures
    const initiatorId = req.user.id || req.user._id || req.user.userId;
    
    console.log('📞 Initiating call');
    console.log('   From:', initiatorId);
    console.log('   To:', receiverId);
    console.log('   req.user:', req.user);

    // Validate initiatorId
    if (!initiatorId) {
      console.error('❌ No initiator ID found in token');
      return res.status(400).json({ 
        success: false,
        message: 'Invalid authentication token',
      });
    }

    // Validate receiverId
    if (!receiverId) {
      console.error('❌ No receiver ID provided');
      return res.status(400).json({ 
        success: false,
        message: 'Receiver ID is required' 
      });
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid receiver ID format'
      });
    }

    // Check if receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      console.error('❌ Receiver not found:', receiverId);
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Prevent self-calling
    if (initiatorId.toString() === receiverId.toString()) {
      console.error('❌ User trying to call themselves');
      return res.status(400).json({ 
        success: false,
        message: 'Cannot call yourself' 
      });
    }

    // Check if initiator exists
    const initiator = await User.findById(initiatorId);
    if (!initiator) {
      console.error('❌ Initiator not found:', initiatorId);
      return res.status(404).json({ 
        success: false,
        message: 'Initiator user not found' 
      });
    }

    // Generate unique room ID
    const roomId = `call_${initiatorId}_${receiverId}_${Date.now()}`;

    const call = new Call({
      initiator: initiatorId,
      receiver: receiverId,
      roomId,
      status: 'initiated',
      callType: 'video'
    });

    await call.save();

    console.log('✅ Call initiated:', roomId);

    res.status(201).json({
      success: true,
      call: {
        roomId: call.roomId,
        _id: call._id,
        receiverId,
        receiverName: receiver.name || receiver.channelname || 'Unknown',
        receiverImage: receiver.image || 'https://github.com/shadcn.png',
        initiatorId,
        initiatorName: initiator.name || initiator.channelname || 'Unknown',
        initiatorImage: initiator.image || 'https://github.com/shadcn.png'
      }
    });
  } catch (error) {
    console.error('❌ Error initiating call:', error);
    console.error('   Error name:', error.name);
    console.error('   Error message:', error.message);
    console.error('   Error stack:', error.stack);
    
    res.status(500).json({ 
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Update call status
export const updateCallStatus = async (req, res) => {
  try {
    const { callId } = req.params;
    const { status, duration, recordingUrl, hasScreenShare, startTime } = req.body;

    console.log('🔄 Updating call status:', callId, 'to', status);

    if (!mongoose.Types.ObjectId.isValid(callId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid call ID format'
      });
    }

    const call = await Call.findById(callId);
    if (!call) {
      return res.status(404).json({ 
        success: false,
        message: 'Call not found' 
      });
    }

    if (status) call.status = status;
    
    if (startTime) {
      call.startTime = new Date(startTime);
    }
    
    if (status === 'ongoing' && !call.startTime) {
      call.startTime = new Date();
    }
    
    if (status === 'ended') {
      call.endTime = new Date();
      if (duration) {
        call.duration = duration;
      } else if (call.startTime) {
        // Calculate duration in seconds
        call.duration = Math.floor((new Date() - call.startTime) / 1000);
      }
    }
    
    if (recordingUrl) {
      call.recordingUrl = recordingUrl;
      call.hasRecording = true;
    }
    
    if (hasScreenShare !== undefined) call.hasScreenShare = hasScreenShare;

    await call.save();

    console.log('✅ Call status updated');

    res.json({ 
      success: true, 
      call 
    });
  } catch (error) {
    console.error('❌ Error updating call:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Get call history
export const getCallHistory = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;

    console.log('📜 Getting call history for user:', userId);

    const calls = await Call.find({
      $or: [{ initiator: userId }, { receiver: userId }]
    })
      .populate('initiator', 'channelname name image email')
      .populate('receiver', 'channelname name image email')
      .sort({ createdAt: -1 })
      .limit(50);

    console.log(`✅ Found ${calls.length} calls`);

    res.json({ 
      success: true, 
      calls,
      count: calls.length
    });
  } catch (error) {
    console.error('❌ Error getting call history:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Get call details
export const getCallDetails = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id || req.user._id || req.user.userId;

    console.log('📞 Getting call details:', roomId);

    const call = await Call.findOne({ roomId })
      .populate('initiator', 'channelname name image email')
      .populate('receiver', 'channelname name image email');

    if (!call) {
      return res.status(404).json({ 
        success: false,
        message: 'Call not found' 
      });
    }

    // Check if user is part of this call
    const isInitiator = call.initiator._id.toString() === userId.toString();
    const isReceiver = call.receiver._id.toString() === userId.toString();
    
    if (!isInitiator && !isReceiver) {
      return res.status(403).json({ 
        success: false,
        message: 'Unauthorized: You are not part of this call' 
      });
    }

    res.json({ 
      success: true, 
      call 
    });
  } catch (error) {
    console.error('❌ Error getting call details:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Get call statistics
export const getCallStats = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;

    console.log('📊 Getting call stats for user:', userId);

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const stats = await Call.aggregate([
      {
        $match: {
          $or: [
            { initiator: userObjectId },
            { receiver: userObjectId }
          ]
        }
      },
      {
        $group: {
          _id: null,
          totalCalls: { $sum: 1 },
          completedCalls: {
            $sum: {
              $cond: [{ $eq: ['$status', 'ended'] }, 1, 0]
            }
          },
          totalDuration: {
            $sum: {
              $cond: [{ $ne: ['$duration', null] }, '$duration', 0]
            }
          },
          missedCalls: {
            $sum: {
              $cond: [{ $eq: ['$status', 'missed'] }, 1, 0]
            }
          },
          rejectedCalls: {
            $sum: {
              $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0]
            }
          },
          callsWithRecordings: {
            $sum: {
              $cond: ['$hasRecording', 1, 0]
            }
          },
          callsWithScreenShare: {
            $sum: {
              $cond: ['$hasScreenShare', 1, 0]
            }
          }
        }
      }
    ]);

    const result = stats.length > 0 ? stats[0] : {
      totalCalls: 0,
      completedCalls: 0,
      totalDuration: 0,
      missedCalls: 0,
      rejectedCalls: 0,
      callsWithRecordings: 0,
      callsWithScreenShare: 0
    };

    // Calculate average duration
    result.averageDuration = result.completedCalls > 0 
      ? Math.floor(result.totalDuration / result.completedCalls) 
      : 0;

    // Format total duration (HH:MM:SS)
    const hours = Math.floor(result.totalDuration / 3600);
    const minutes = Math.floor((result.totalDuration % 3600) / 60);
    const seconds = result.totalDuration % 60;
    result.totalDurationFormatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    console.log('✅ Stats calculated:', result);

    res.json({ 
      success: true, 
      stats: result 
    });
  } catch (error) {
    console.error('❌ Error getting call stats:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};