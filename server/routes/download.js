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

// ✅ POST route (record download) MUST come BEFORE GET
routes.post("/video/:videoId", downloadVideo);
routes.get("/stream/:videoId", streamVideoDownload);

export default routes;