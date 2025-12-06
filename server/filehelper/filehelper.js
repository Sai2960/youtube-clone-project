"use strict";
import multer from "multer";
import path from "path";
import fs from "fs";

// Ensure uploads directory exists
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads");
  },
  filename: (req, file, cb) => {
    // Clean filename for better compatibility
    const timestamp = new Date().toISOString().replace(/:/g, "-").replace(/\./g, "-");
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, "_");
    cb(null, `${timestamp}-${name}${ext}`);
  },
});

const filefilter = (req, file, cb) => {
  // Accept common video formats
  const allowedMimeTypes = [
    "video/mp4",
    "video/mpeg",
    "video/quicktime", // .mov files
    "video/x-msvideo", // .avi files  
    "video/webm",
    "video/x-ms-wmv"
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    // Return error instead of silently rejecting
    cb(new Error(`Unsupported file type: ${file.mimetype}. Only video files are allowed.`), false);
  }
};

const upload = multer({ 
  storage: storage, 
  fileFilter: filefilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  }
});

export default upload;