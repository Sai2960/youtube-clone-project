import express from "express";
import {
  checkDownloadEligibility,
  downloadVideo,
  streamVideoDownload,
  getUserDownloads,
  deleteDownload,
  getDownloadStats
} from "../controllers/download.js";

const routes = express.Router();

// ✅ Check if user can download (eligibility)
routes.get("/eligibility/:userId", checkDownloadEligibility);

// ✅ CRITICAL: POST must come BEFORE GET to avoid route collision
// Record download in database (POST - permission check + create record)
routes.post("/video/:videoId", downloadVideo);

// ✅ Stream video file for actual download (GET)
routes.get("/stream/:videoId", streamVideoDownload);

// ✅ Get user's download history
routes.get("/history/:userId", getUserDownloads);

// ✅ Get download statistics
routes.get("/stats/:userId", getDownloadStats);

// ✅ Delete download record
routes.delete("/:downloadId", deleteDownload);

export default routes;