// server/routes/user.js - MAKE SURE THIS ROUTE EXISTS
import express from "express";
import User from "../Modals/User.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// ✅ Get all users/channels (for browsing and calling)
router.get("/all", async (req, res) => {
  try {
    console.log("📋 Fetching all channels");

    const users = await User.find()
      .select("_id email name channelname description image currentPlan joinedon")
      .sort({ joinedon: -1 })
      .limit(100);

    console.log(`✅ Found ${users.length} channels`);

    res.json({
      success: true,
      users: users,
      count: users.length
    });
  } catch (error) {
    console.error("❌ Error fetching channels:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ Get channel by ID (for call functionality)
router.get("/channel/:id", async (req, res) => {
  try {
    const { id } = req.params;

    console.log("📺 Fetching channel for:", id);

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    const user = await User.findById(id).select(
      "_id email name channelname description image joinedon currentPlan"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Channel not found",
      });
    }

    console.log("✅ Channel found:", user.channelname || user.name);

    res.json({
      success: true,
      user: user,
    });
  } catch (error) {
    console.error("❌ Error fetching channel:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ... rest of your user routes

export default router;