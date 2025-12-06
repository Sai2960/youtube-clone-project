// Modals/Call.js - COMPLETE CALL MODEL WITH INDEXES AND VIRTUALS
import mongoose from 'mongoose';

const callSchema = new mongoose.Schema({
  initiator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Initiator is required'],
    index: true // ✅ Fast queries
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Receiver is required'],
    index: true // ✅ Fast queries
  },
  roomId: {
    type: String,
    required: [true, 'Room ID is required'],
    unique: true,
    index: true, // ✅ Fast lookups
    trim: true
  },
  status: {
    type: String,
    enum: {
      values: ['initiated', 'ringing', 'ongoing', 'ended', 'rejected', 'missed', 'cancelled'],
      message: '{VALUE} is not a valid call status'
    },
    default: 'initiated',
    index: true // ✅ Filter by status
  },
  callType: {
    type: String,
    enum: {
      values: ['video', 'audio', 'screen'],
      message: '{VALUE} is not a valid call type'
    },
    default: 'video'
  },
  startTime: {
    type: Date,
    default: null
  },
  endTime: {
    type: Date,
    default: null
  },
  duration: {
    type: Number, // Duration in seconds
    default: 0,
    min: [0, 'Duration cannot be negative']
  },
  recordingUrl: {
    type: String,
    default: null,
    trim: true
  },
  hasScreenShare: {
    type: Boolean,
    default: false
  },
  hasRecording: {
    type: Boolean,
    default: false
  },
  recordingSize: {
    type: Number, // Size in bytes
    default: 0
  },
  quality: {
    type: String,
    enum: ['excellent', 'good', 'poor', 'unknown'],
    default: 'unknown'
  },
  disconnectReason: {
    type: String,
    enum: ['user_ended', 'timeout', 'connection_lost', 'rejected', 'other'],
    default: null
  },
  metadata: {
    userAgent: String,
    browserName: String,
    browserVersion: String,
    os: String,
    deviceType: String
  }
}, { 
  timestamps: true, // Automatically adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ==========================================
// COMPOUND INDEXES FOR OPTIMIZED QUERIES
// ==========================================

// Query calls by user and date
callSchema.index({ initiator: 1, createdAt: -1 });
callSchema.index({ receiver: 1, createdAt: -1 });

// Query calls by status and date
callSchema.index({ status: 1, createdAt: -1 });

// Query calls between two users
callSchema.index({ initiator: 1, receiver: 1, createdAt: -1 });

// Query active calls
callSchema.index({ status: 1, startTime: -1 });

// ==========================================
// VIRTUAL PROPERTIES
// ==========================================

// Formatted duration (HH:MM:SS)
callSchema.virtual('durationFormatted').get(function() {
  if (!this.duration || this.duration === 0) return '00:00:00';
  
  const hours = Math.floor(this.duration / 3600);
  const minutes = Math.floor((this.duration % 3600) / 60);
  const seconds = this.duration % 60;
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
});

// Short duration format (MM:SS)
callSchema.virtual('durationShort').get(function() {
  if (!this.duration || this.duration === 0) return '00:00';
  
  const minutes = Math.floor(this.duration / 60);
  const seconds = this.duration % 60;
  
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
});

// Recording size in MB
callSchema.virtual('recordingSizeMB').get(function() {
  if (!this.recordingSize) return 0;
  return (this.recordingSize / 1024 / 1024).toFixed(2);
});

// Is call active
callSchema.virtual('isActive').get(function() {
  return this.status === 'ongoing' || this.status === 'ringing';
});

// Is call completed
callSchema.virtual('isCompleted').get(function() {
  return this.status === 'ended';
});

// Call success rate (for analytics)
callSchema.virtual('wasSuccessful').get(function() {
  return this.status === 'ended' && this.duration > 0;
});

// ==========================================
// INSTANCE METHODS
// ==========================================

// Start the call
callSchema.methods.start = function() {
  this.status = 'ongoing';
  this.startTime = new Date();
  return this.save();
};

// End the call
callSchema.methods.end = function() {
  this.status = 'ended';
  this.endTime = new Date();
  
  // Calculate duration if not already set
  if (this.startTime && !this.duration) {
    this.duration = Math.floor((this.endTime - this.startTime) / 1000);
  }
  
  return this.save();
};

// Reject the call
callSchema.methods.reject = function() {
  this.status = 'rejected';
  this.endTime = new Date();
  this.disconnectReason = 'rejected';
  return this.save();
};

// Mark as missed
callSchema.methods.markMissed = function() {
  this.status = 'missed';
  this.endTime = new Date();
  this.disconnectReason = 'timeout';
  return this.save();
};

// ==========================================
// STATIC METHODS
// ==========================================

// Get call history for a user
callSchema.statics.getHistoryForUser = function(userId, limit = 50) {
  return this.find({
    $or: [{ initiator: userId }, { receiver: userId }]
  })
    .populate('initiator', 'channelname name image')
    .populate('receiver', 'channelname name image')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Get active calls for a user
callSchema.statics.getActiveCalls = function(userId) {
  return this.find({
    $or: [{ initiator: userId }, { receiver: userId }],
    status: { $in: ['initiated', 'ringing', 'ongoing'] }
  })
    .populate('initiator', 'channelname name image')
    .populate('receiver', 'channelname name image')
    .sort({ startTime: -1 });
};

// Get call statistics for a user
callSchema.statics.getStats = function(userId) {
  return this.aggregate([
    {
      $match: {
        $or: [{ initiator: userId }, { receiver: userId }]
      }
    },
    {
      $group: {
        _id: null,
        totalCalls: { $sum: 1 },
        completedCalls: {
          $sum: { $cond: [{ $eq: ['$status', 'ended'] }, 1, 0] }
        },
        missedCalls: {
          $sum: { $cond: [{ $eq: ['$status', 'missed'] }, 1, 0] }
        },
        rejectedCalls: {
          $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
        },
        totalDuration: {
          $sum: { $cond: [{ $ne: ['$duration', null] }, '$duration', 0] }
        },
        totalRecordings: {
          $sum: { $cond: ['$hasRecording', 1, 0] }
        },
        totalRecordingSize: {
          $sum: { $cond: [{ $ne: ['$recordingSize', null] }, '$recordingSize', 0] }
        }
      }
    }
  ]);
};

// ==========================================
// PRE-SAVE HOOKS
// ==========================================

// Auto-calculate duration before saving
callSchema.pre('save', function(next) {
  // Only calculate if call is ending and duration not already set
  if (this.status === 'ended' && this.startTime && this.endTime && !this.duration) {
    this.duration = Math.floor((this.endTime - this.startTime) / 1000);
  }
  
  // Update hasRecording flag
  if (this.recordingUrl) {
    this.hasRecording = true;
  }
  
  next();
});

// Validate dates before saving
callSchema.pre('save', function(next) {
  if (this.endTime && this.startTime && this.endTime < this.startTime) {
    return next(new Error('End time cannot be before start time'));
  }
  next();
});

// ==========================================
// POST-SAVE HOOKS
// ==========================================

callSchema.post('save', function(doc) {
  console.log(`📞 Call ${doc._id} saved: ${doc.status}`);
});

// ==========================================
// QUERY HELPERS
// ==========================================

// Find completed calls
callSchema.query.completed = function() {
  return this.where({ status: 'ended' });
};

// Find missed calls
callSchema.query.missed = function() {
  return this.where({ status: 'missed' });
};

// Find calls with recordings
callSchema.query.withRecordings = function() {
  return this.where({ hasRecording: true });
};

// ==========================================
// EXPORT MODEL
// ==========================================

export default mongoose.model('Call', callSchema);