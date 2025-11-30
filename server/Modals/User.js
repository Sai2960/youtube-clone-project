// server/Modals/User.js - COMPLETE FULLY FIXED & ENHANCED USER MODEL
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({

  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v);
      },
      message: props => `${props.value} is not a valid email address!`
    }
  },
  name: { 
    type: String,
    required: true,
    trim: true,
    default: function() {
      return this.email ? this.email.split('@')[0] : 'User';
    }
  },
  channelname: {
    type: String,
    trim: true,
    default: function() {
      return this.name || (this.email ? this.email.split('@')[0] : 'Channel');
    }
  },
  description: {
    type: String,
    default: '',
    maxlength: 5000
  },
  

  image: { 
    type: String,
    default: "https://github.com/shadcn.png",
    validate: {
      validator: function(v) {
        return !v || v.startsWith('http') || v.startsWith('/uploads');
      },
      message: 'Image must be a valid URL or upload path'
    }
  },
  bannerImage: {
    type: String,
    default: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&h=300&fit=crop",
    validate: {
      validator: function(v) {
        return !v || v.startsWith('http') || v.startsWith('/uploads');
      },
      message: 'Banner image must be a valid URL or upload path'
    }
  },
  

  joinedon: { 
    type: Date, 
    default: Date.now,
    immutable: true 
  },
  lastLoginTime: {
    type: Date,
    default: Date.now
  },
  

  subscribers: {
    type: Number,
    default: 0,
    min: 0,
    validate: {
      validator: Number.isInteger,
      message: 'Subscribers must be an integer'
    }
  },
  subscribedChannels: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  

  currentPlan: {
    type: String,
    enum: ["FREE", "BRONZE", "SILVER", "GOLD", "PREMIUM", "MONTHLY", "YEARLY"],
    default: "FREE",
    uppercase: true
  },
  subscriptionExpiry: { 
    type: Date,
    default: null
  },
  watchTimeLimit: {
    type: Number,
    default: 5, 
    min: -1
  },
  

  theme: {
    type: String,
    enum: ['light', 'dark'],
    default: 'dark',
    lowercase: true
  },
  preferredOtpMethod: {
    type: String,
    enum: ['email', 'sms'],
    default: 'email',
    lowercase: true
  },
  

  location: {
    state: { 
      type: String, 
      default: null,
      trim: true
    },
    country: { 
      type: String, 
      default: null,
      trim: true
    },
    timezone: { 
      type: String, 
      default: null,
      trim: true
    }
  },
  

  totalVideoViews: {
    type: Number,
    default: 0,
    min: 0
  },
  totalVideoUploads: {
    type: Number,
    default: 0,
    min: 0
  },
  

  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isBanned: {
    type: Boolean,
    default: false
  }
  
}, { 
  timestamps: true 
});


userSchema.index({ email: 1 });
userSchema.index({ channelname: 1 });
userSchema.index({ subscribers: -1 }); // For leaderboards
userSchema.index({ subscribedChannels: 1 });
userSchema.index({ currentPlan: 1 });
userSchema.index({ createdAt: -1 }); // For "newest channels"
userSchema.index({ lastLoginTime: -1 }); // For "active users"


userSchema.pre('save', function(next) {
  // Ensure name exists
  if (!this.name && this.email) {
    this.name = this.email.split('@')[0];
    console.log('✅ Auto-generated name from email:', this.name);
  }
  
  // Ensure channelname exists
  if (!this.channelname) {
    this.channelname = this.name || (this.email ? this.email.split('@')[0] : 'Channel');
    console.log('✅ Auto-generated channelname:', this.channelname);
  }
  
 
  if (!Array.isArray(this.subscribedChannels)) {
    console.warn('⚠️ Fixing subscribedChannels - was:', typeof this.subscribedChannels);
    this.subscribedChannels = [];
  }
  

  if (typeof this.subscribers !== 'number' || isNaN(this.subscribers)) {
    console.warn('⚠️ Fixing subscribers - was:', this.subscribers);
    this.subscribers = 0;
  }
  
  // Ensure subscribers is not negative
  if (this.subscribers < 0) {
    console.warn('⚠️ Fixing negative subscribers:', this.subscribers);
    this.subscribers = 0;
  }
  
  // Ensure watchTimeLimit is valid
  if (typeof this.watchTimeLimit !== 'number' || this.watchTimeLimit < 0) {
    console.warn('⚠️ Fixing watchTimeLimit:', this.watchTimeLimit);
    this.watchTimeLimit = 5;
  }
  
  // Ensure totalVideoViews and totalVideoUploads are valid
  if (typeof this.totalVideoViews !== 'number' || this.totalVideoViews < 0) {
    this.totalVideoViews = 0;
  }
  
  if (typeof this.totalVideoUploads !== 'number' || this.totalVideoUploads < 0) {
    this.totalVideoUploads = 0;
  }
  
  next();
});


userSchema.post('save', function(doc) {
  console.log('✅ User saved successfully:', {
    id: doc._id,
    email: doc.email,
    name: doc.name,
    channelname: doc.channelname,
    subscribers: doc.subscribers,
    subscribedChannels: doc.subscribedChannels.length
  });
});



// Check if user has premium subscription
userSchema.methods.isPremium = function() {
  if (!this.subscriptionExpiry) return false;
  return this.subscriptionExpiry > new Date();
};

// Get remaining watch time
userSchema.methods.getRemainingWatchTime = function() {
  if (this.isPremium()) return Infinity;
  return this.watchTimeLimit;
};

// Check if subscribed to a channel
userSchema.methods.isSubscribedTo = function(channelId) {
  if (!channelId) return false;
  return this.subscribedChannels.some(
    id => id.toString() === channelId.toString()
  );
};

// Add subscription
userSchema.methods.subscribeTo = async function(channelId) {
  if (!channelId || this._id.toString() === channelId.toString()) {
    throw new Error('Cannot subscribe to own channel or invalid channel');
  }
  
  if (this.isSubscribedTo(channelId)) {
    throw new Error('Already subscribed to this channel');
  }
  
  this.subscribedChannels.push(channelId);
  await this.save();
  
  // Update target channel's subscriber count
  await mongoose.model('User').findByIdAndUpdate(
    channelId,
    { $inc: { subscribers: 1 } }
  );
  
  return true;
};

// Remove subscription
userSchema.methods.unsubscribeFrom = async function(channelId) {
  if (!channelId) {
    throw new Error('Invalid channel ID');
  }
  
  if (!this.isSubscribedTo(channelId)) {
    throw new Error('Not subscribed to this channel');
  }
  
  this.subscribedChannels = this.subscribedChannels.filter(
    id => id.toString() !== channelId.toString()
  );
  await this.save();
  
  // Update target channel's subscriber count
  await mongoose.model('User').findByIdAndUpdate(
    channelId,
    { $inc: { subscribers: -1 } }
  );
  
  return true;
};

// Check if account is active (logged in within 30 days)
userSchema.methods.isActiveUser = function() {
  if (!this.lastLoginTime) return false;
  const daysSinceLogin = (Date.now() - this.lastLoginTime) / (1000 * 60 * 60 * 24);
  return daysSinceLogin < 30;
};

// Get user profile summary
userSchema.methods.getProfileSummary = function() {
  return {
    _id: this._id,
    name: this.name,
    channelname: this.channelname,
    description: this.description,
    image: this.image,
    bannerImage: this.bannerImage,
    subscribers: this.subscribers,
    totalVideoUploads: this.totalVideoUploads,
    totalVideoViews: this.totalVideoViews,
    joinedon: this.joinedon,
    currentPlan: this.currentPlan,
    isPremium: this.isPremium(),
    isActive: this.isActiveUser()
  };
};

// ==================== STATIC METHODS ====================

// Find user by email
userSchema.statics.findByEmail = function(email) {
  if (!email) return null;
  return this.findOne({ email: email.toLowerCase().trim() });
};

// Update subscriber count for a channel
userSchema.statics.updateSubscriberCount = async function(userId) {
  if (!userId) return 0;
  
  const count = await this.countDocuments({ 
    subscribedChannels: userId 
  });
  
  await this.findByIdAndUpdate(userId, { 
    subscribers: count 
  });
  
  console.log(`✅ Updated subscriber count for ${userId}: ${count}`);
  return count;
};

// Get top channels by subscribers
userSchema.statics.getTopChannels = function(limit = 10) {
  return this.find({ subscribers: { $gt: 0 } })
    .sort({ subscribers: -1 })
    .limit(limit)
    .select('name channelname image bannerImage subscribers totalVideoUploads');
};

// Get recently joined channels
userSchema.statics.getRecentChannels = function(limit = 10) {
  return this.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('name channelname image bannerImage subscribers joinedon');
};

// Search channels by name
userSchema.statics.searchChannels = function(query, limit = 20) {
  if (!query) return this.find().limit(limit);
  
  const searchRegex = new RegExp(query, 'i');
  return this.find({
    $or: [
      { name: searchRegex },
      { channelname: searchRegex },
      { description: searchRegex }
    ]
  })
  .limit(limit)
  .select('name channelname image bannerImage subscribers description');
};

// ==================== VIRTUAL FIELDS ====================

// Virtual for active status
userSchema.virtual('isActiveVirtual').get(function() {
  if (!this.lastLoginTime) return false;
  const daysSinceLogin = (Date.now() - this.lastLoginTime) / (1000 * 60 * 60 * 24);
  return daysSinceLogin < 30;
});

// Virtual for days since joined
userSchema.virtual('daysSinceJoined').get(function() {
  if (!this.joinedon) return 0;
  return Math.floor((Date.now() - this.joinedon) / (1000 * 60 * 60 * 24));
});

// ==================== JSON TRANSFORMATION ====================

// Ensure virtuals are included in JSON
userSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    // Remove sensitive fields
    delete ret.__v;
    return ret;
  }
});

userSchema.set('toObject', { 
  virtuals: true 
});


const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;