import { Router } from "express";
import {
  createFeedback,
  getAllFeedback,
  getFeedbackById,
  updateFeedbackStatus,
  deleteFeedback,
  reanalyzeFeedback,
} from "../controllers/feedback.controller";
import { protect } from "../middleware/auth.middleware";

const router = Router();

// ─── Public ───────────────────────────────────────────────
router.post("/", createFeedback);                         // POST   /api/feedback

// ─── Admin protected ──────────────────────────────────────
router.get("/", protect, getAllFeedback);                  // GET    /api/feedback
router.get("/:id", protect, getFeedbackById);             // GET    /api/feedback/:id
router.patch("/:id", protect, updateFeedbackStatus);      // PATCH  /api/feedback/:id
router.delete("/:id", protect, deleteFeedback);           // DELETE /api/feedback/:id
router.post("/:id/reanalyze", protect, reanalyzeFeedback);// POST   /api/feedback/:id/reanalyze

export default router;