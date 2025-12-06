// server/routes/comment.js - COMPLETE FIXED VERSION
import express from "express";
import { 
  postcomment, 
  getallcomment, 
  deletecomment, 
  editcomment,
  voteComment,
  reportComment,
  getCommentStats
} from "../controllers/comment.js";

const routes = express.Router();

// POST new comment
routes.post("/postcomment", postcomment);

// GET all comments for a video (MUST be before /:id routes)
routes.get("/stats/:videoid", getCommentStats);
routes.get("/:videoid", getallcomment);

// DELETE comment
routes.delete("/deletecomment/:id", deletecomment);

// EDIT/UPDATE comment
routes.post("/editcomment/:id", editcomment);

// VOTE on comment (like/dislike)
routes.post("/vote/:id", voteComment);

// REPORT comment
routes.post("/report/:id", reportComment);

export default routes;