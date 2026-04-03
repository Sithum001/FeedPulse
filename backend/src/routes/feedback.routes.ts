import { Router } from "express";
import {
  createFeedback,
  getAllFeedback,
  getFeedbackById,
  updateFeedbackStatus,
  deleteFeedback,
  reanalyzeFeedback,
} from "../controllers/feedback.controller";

const router = Router();

// Public routes
router.post("/", createFeedback);                 // POST   /api/feedback
router.get("/", getAllFeedback);                   // GET    /api/feedback

// ⚠️ /summary route will be added in Day 7
// Must be defined BEFORE /:id so Express does not treat "summary" as an ID

router.get("/:id", getFeedbackById);              // GET    /api/feedback/:id

// Admin routes (auth middleware will be added in Day 5)
router.patch("/:id", updateFeedbackStatus);       // PATCH  /api/feedback/:id
router.delete("/:id", deleteFeedback);            // DELETE /api/feedback/:id
router.post("/:id/reanalyze", reanalyzeFeedback); // POST   /api/feedback/:id/reanalyze

export default router;