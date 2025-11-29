// server/models/Short.js - FINAL OPTIMIZED, CLEAN + BACKWARD-COMPATIBLE VERSION ✅

import mongoose from 'mongoose';

const shortSchema = new mongoose.Schema({
    // ------------------------------------------------------------------------
    // USER INFO
    // ------------------------------------------------------------------------
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    channelName: {
        type: String,
        required: true
    },
    channelAvatar: {
        type: String
    },

    // ------------------------------------------------------------------------
    // CONTENT INFO
    // ------------------------------------------------------------------------
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    description: {
        type: String,
        trim: true,
        maxlength: 500
    },
    videoUrl: {
        type: String,
        required: true
    },
    thumbnailUrl: {
        type: String
    },
    duration: {
        type: Number, // seconds
        max: 60 // short videos only
    },

    // ------------------------------------------------------------------------
    // TRANSLATION SUPPORT 🌐
    // ------------------------------------------------------------------------
    originalTitle: String,
    originalDescription: String,
    originalLanguage: {
        type: String,
        default: 'en'
    },
    translations: {
        type: Map,
        of: {
            title: String,
            description: String,
            translatedAt: Date
        },
        default: {}
    },

    // ------------------------------------------------------------------------
    // ENGAGEMENT METRICS
    // ------------------------------------------------------------------------
    views: {
        type: Number,
        default: 0
    },
    likesCount: {
        type: Number,
        default: 0
    },
    dislikesCount: {
        type: Number,
        default: 0
    },
    commentsCount: {
        type: Number,
        default: 0
    },
    shares: {
        type: Number,
        default: 0
    },

    // ------------------------------------------------------------------------
    // USER INTERACTIONS
    // ------------------------------------------------------------------------
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    dislikes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],

    // 🧩 Legacy compatibility arrays (if older data exists)
    likedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    dislikedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],

    uploadedBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User'
  
},

    // ------------------------------------------------------------------------
    // COMMENTS
    // ------------------------------------------------------------------------
    comments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment'
    }],

    // ------------------------------------------------------------------------
    // CATEGORIZATION / STATUS
    // ------------------------------------------------------------------------
    tags: [String],
    category: String,
    isPublic: {
        type: Boolean,
        default: true
    },
    status: {
        type: String,
        enum: ['processing', 'active', 'blocked'],
        default: 'active'
    }
}, {
    timestamps: true
});

// ---------------------------------------------------------------------------
// VIRTUALS 🧮 (computed fields that don't save to DB)
// ---------------------------------------------------------------------------
shortSchema.virtual('likeCount').get(function () {
    return this.likes?.length ||
           this.likedBy?.length ||
           this.likesCount || 0;
});

shortSchema.virtual('dislikeCount').get(function () {
    return this.dislikes?.length ||
           this.dislikedBy?.length ||
           this.dislikesCount || 0;
});

// ---------------------------------------------------------------------------
// INDEXES ⚡ (performance boost for queries)
// ---------------------------------------------------------------------------
shortSchema.index({ userId: 1, createdAt: -1 });
shortSchema.index({ views: -1 });
shortSchema.index({ createdAt: -1 });
shortSchema.index({ likesCount: -1 });
shortSchema.index({ status: 1 });

// ---------------------------------------------------------------------------
// MIDDLEWARE 🛠 (keep counts in sync before saving)
// ---------------------------------------------------------------------------
shortSchema.pre('save', function (next) {
    // Sync like/dislike counts (supports legacy fields too)
    this.likesCount = this.likes?.length ||
                      this.likedBy?.length || 0;

    this.dislikesCount = this.dislikes?.length ||
                         this.dislikedBy?.length || 0;

    this.commentsCount = this.comments?.length || 0;
    next();
});

// ---------------------------------------------------------------------------
// INSTANCE METHODS 🧠
// ---------------------------------------------------------------------------

// Increment view count
shortSchema.methods.incrementViews = async function () {
    this.views += 1;
    return await this.save();
};

// Check if user liked
shortSchema.methods.hasUserLiked = function (userId) {
    const id = userId.toString();
    return this.likes?.some(likeId => likeId.toString() === id) ||
           this.likedBy?.some(likeId => likeId.toString() === id) || false;
};

// Check if user disliked
shortSchema.methods.hasUserDisliked = function (userId) {
    const id = userId.toString();
    return this.dislikes?.some(dislikeId => dislikeId.toString() === id) ||
           this.dislikedBy?.some(dislikeId => dislikeId.toString() === id) || false;
};

// ---------------------------------------------------------------------------
// STATIC METHODS 🧩
// ---------------------------------------------------------------------------

// Get trending shorts (most viewed & recent)
shortSchema.statics.getTrending = function (limit = 10) {
    return this.find({ status: 'active', isPublic: true })
        .sort({ views: -1, createdAt: -1 })
        .limit(limit)
        .populate('userId', 'name avatar channelName subscribers');
};

// Get shorts by specific user
shortSchema.statics.getByUser = function (userId, limit = 20) {
    return this.find({ userId, status: 'active' })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('userId', 'name avatar channelName subscribers');
};

// ---------------------------------------------------------------------------
// EXPORT 🚀 - FIXED TO PREVENT OVERWRITE ERROR
// ---------------------------------------------------------------------------
// Check if model exists before creating to support hot-reload with nodemon
const Short = mongoose.models.Short || mongoose.model('Short', shortSchema);

export default Short;