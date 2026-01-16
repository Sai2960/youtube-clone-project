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

// ✅ CRITICAL: Most specific routes FIRST
routes.get("/eligibility/:userId", checkDownloadEligibility);
routes.get("/stats/:userId", getDownloadStats);
routes.get("/history/:userId", getUserDownloads);
routes.delete("/:downloadId", deleteDownload);

// ✅ FIXED: POST route for video download
routes.post("/video/:videoId", downloadVideo);

// ✅ Stream route
routes.get("/stream/:videoId", streamVideoDownload);

export default routes;