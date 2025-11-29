import Report from '../Modals/Report.js';
import Comment from '../Modals/comment.js';

export const submitReport = async (req, res) => {
  console.log('\n🚩 ===== NEW REPORT SUBMISSION =====');
  
  try {
    const { targetType, targetId, category, reason, description } = req.body;
    const userId = req.user?._id || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    if (!targetType || !targetId || !category || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // Check for duplicate reports
    const existingReport = await Report.findOne({
      reporterId: userId,
      targetType,
      targetId,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
    
    if (existingReport) {
      return res.status(400).json({
        success: false,
        message: 'You have already reported this content recently'
      });
    }
    
    // Get reporter info
    const User = (await import('../Modals/User.js')).default;
    const reporter = await User.findById(userId);
    
    // Create report
    const report = new Report({
      targetType,
      targetId,
      reporterId: userId,
      reporterName: reporter?.name || 'Anonymous',
      reporterEmail: reporter?.email,
      category,
      reason,
      description: description || '',
      status: 'pending'
    });
    
    await report.save();
    
    console.log('✅ Report created:', report._id);
    
    // Auto-actions based on report count
    const reportCount = await Report.countDocuments({
      targetType,
      targetId,
      status: { $in: ['pending', 'under_review'] }
    });
    
    console.log('📊 Total reports for this content:', reportCount);
    
    // Auto-hide if 5+ reports
    if (reportCount >= 5 && targetType === 'comment') {
      await Comment.updateOne(
        { _id: targetId },
        { isHidden: true, reportCount: reportCount }
      );
      console.log('⚠️ Auto-hidden comment due to multiple reports');
    }
    
    if (reportCount >= 10) {
      report.priority = 'high';
      await report.save();
      console.log('⚠️ Escalated to high priority');
    }
    
    return res.status(200).json({
      success: true,
      message: 'Report submitted successfully. Our team will review it.',
      data: { reportId: report._id, status: report.status }
    });
    
  } catch (error) {
    console.error('❌ Report submission error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit report',
      error: error.message
    });
  }
};

export const getAllReports = async (req, res) => {
  try {
    const { status, category, page = 1, limit = 20 } = req.query;
    
    // Check if user is admin (you need to implement admin middleware)
    if (!req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    
    const reports = await Report.find(filter)
      .populate('reporterId', 'name email avatar')
      .sort({ priority: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();
    
    const total = await Report.countDocuments(filter);
    
    return res.status(200).json({
      success: true,
      data: {
        reports,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Get reports error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch reports',
      error: error.message
    });
  }
};

export const updateReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, actionTaken, moderatorNotes } = req.body;
    
    if (!req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    
    const report = await Report.findByIdAndUpdate(
      id,
      {
        status,
        actionTaken: actionTaken || 'none',
        moderatorId: req.user._id,
        reviewedAt: new Date(),
        resolvedAt: status === 'action_taken' || status === 'dismissed' ? new Date() : null
      },
      { new: true }
    );
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }
    
    console.log('✅ Report updated:', report._id);
    
    return res.status(200).json({
      success: true,
      message: 'Report updated successfully',
      data: report
    });
    
  } catch (error) {
    console.error('❌ Update report error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update report',
      error: error.message
    });
  }
};