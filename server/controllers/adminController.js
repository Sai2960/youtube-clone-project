import User from "../Modals/User.js";

// Get all pending users
export const getPendingUsers = async (req, res) => {
  try {
    console.log("📋 Fetching pending users...");

    const pendingUsers = await User.find({
      approvalStatus: "pending",
      isApproved: false,
    })
      .select("email name channelname image createdAt approvalStatus")
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${pendingUsers.length} pending users`);

    res.status(200).json({
      success: true,
      count: pendingUsers.length,
      users: pendingUsers,
    });
  } catch (error) {
    console.error("❌ Get pending users error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Approve a user
export const approveUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const adminId = req.user.id || req.user._id || req.userId;

    console.log("✅ Approving user:", userId, "by admin:", adminId);

    const user = await User.findByIdAndUpdate(
      userId,
      {
        isApproved: true,
        approvalStatus: "approved",
        approvedBy: adminId,
        approvedAt: new Date(),
      },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    console.log("✅ User approved:", user.email);

    res.status(200).json({
      success: true,
      message: "User approved successfully",
      user: user,
    });
  } catch (error) {
    console.error("❌ Approve user error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Reject a user
export const rejectUser = async (req, res) => {
  try {
    const { userId } = req.params;

    console.log("❌ Rejecting user:", userId);

    const user = await User.findByIdAndUpdate(
      userId,
      {
        isApproved: false,
        approvalStatus: "rejected",
      },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    console.log("❌ User rejected:", user.email);

    res.status(200).json({
      success: true,
      message: "User rejected",
      user: user,
    });
  } catch (error) {
    console.error("❌ Reject user error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all users (approved, pending, rejected)
export const getAllUsersWithStatus = async (req, res) => {
  try {
    const users = await User.find()
      .select(
        "email name channelname image approvalStatus isApproved createdAt approvedAt"
      )
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      total: users.length,
      approved: users.filter((u) => u.approvalStatus === "approved").length,
      pending: users.filter((u) => u.approvalStatus === "pending").length,
      rejected: users.filter((u) => u.approvalStatus === "rejected").length,
      users: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
