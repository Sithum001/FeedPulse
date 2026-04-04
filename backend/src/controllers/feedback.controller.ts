import { Request, Response } from "express";
import type { SortOrder } from "mongoose";
import Feedback from "../models/Feedback";
import { sendSuccess, sendError } from "../utils/response";
import { analyzeFeedback } from "../services/gemini.service";

// POST /api/feedback — Submit new feedback + trigger Gemini
export const createFeedback = async (req: Request, res: Response) => {
  try {
    const { title, description, category, submitterName, submitterEmail } = req.body;

    const feedback = await Feedback.create({
      title, description, category, submitterName, submitterEmail,
      ai_processed: false,
    });

    // Call Gemini after saving — failure is safe
    const analysis = await analyzeFeedback(title, description);
    if (analysis) {
      feedback.ai_category  = analysis.category;
      feedback.ai_sentiment = analysis.sentiment;
      feedback.ai_priority  = analysis.priority_score;
      feedback.ai_summary   = analysis.summary;
      feedback.ai_tags      = analysis.tags;
      feedback.ai_processed = true;
      await feedback.save();
      console.log(`✅ Gemini saved for: ${feedback._id}`);
    } else {
      console.warn(`⚠️ Gemini failed for: ${feedback._id}`);
    }

    return sendSuccess(res, feedback, "Feedback submitted successfully", 201);
  } catch (error: unknown) {
    if (isValidationError(error)) {
      const msgs = Object.values((error as { errors: Record<string, { message: string }> }).errors)
        .map(e => e.message);
      return sendError(res, msgs.join(", "), 400);
    }
    return sendError(res, "Failed to submit feedback", 500, error);
  }
};

// GET /api/feedback — Get all feedback with filters, search, sort, pagination
export const getAllFeedback = async (req: Request, res: Response) => {
  try {
    const {
      category,
      status,
      search,
      sortBy  = "createdAt",
      page    = "1",
      limit   = "10",
    } = req.query;

    // ── Build filter ──────────────────────────────────────
    const filter: Record<string, unknown> = {};
    if (category) filter.category = category;
    if (status)   filter.status   = status;

    // Search across title and ai_summary
    if (search) {
      filter.$or = [
        { title:      { $regex: search, $options: "i" } },
        { ai_summary: { $regex: search, $options: "i" } },
      ];
    }

    // ── Sort ──
    const sortMap: Record<string, Record<string, SortOrder>> = {
      createdAt:    { createdAt: -1 },
      ai_priority:  { ai_priority: -1 },
      ai_sentiment: { ai_sentiment: 1 },
    };
    const sort: Record<string, SortOrder | { $meta: unknown }> =
      sortMap[sortBy as string] || { createdAt: -1 };

    // ── Pagination ──
    const pageNum  = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.max(1, Math.min(50, parseInt(limit as string, 10)));
    const skip     = (pageNum - 1) * limitNum;

    const [feedbackList, total] = await Promise.all([
      Feedback.find(filter).sort(sort).skip(skip).limit(limitNum),
      Feedback.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      feedback: feedbackList,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    }, "Feedback fetched successfully");
  } catch (error) {
    return sendError(res, "Failed to fetch feedback", 500, error);
  }
};

// GET /api/feedback/:id
export const getFeedbackById = async (req: Request, res: Response) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) return sendError(res, "Feedback not found", 404);
    return sendSuccess(res, feedback, "Feedback fetched successfully");
  } catch (error: unknown) {
    if (isCastError(error)) return sendError(res, "Invalid feedback ID", 400);
    return sendError(res, "Failed to fetch feedback", 500, error);
  }
};

// PATCH /api/feedback/:id — Update status
export const updateFeedbackStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!["New", "In Review", "Resolved"].includes(status)) {
      return sendError(res, "Invalid status. Must be New, In Review, or Resolved", 400);
    }

    const feedback = await Feedback.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );
    if (!feedback) return sendError(res, "Feedback not found", 404);
    return sendSuccess(res, feedback, "Status updated successfully");
  } catch (error: unknown) {
    if (isCastError(error)) return sendError(res, "Invalid feedback ID", 400);
    return sendError(res, "Failed to update feedback", 500, error);
  }
};

// DELETE /api/feedback/:id
export const deleteFeedback = async (req: Request, res: Response) => {
  try {
    const feedback = await Feedback.findByIdAndDelete(req.params.id);
    if (!feedback) return sendError(res, "Feedback not found", 404);
    return sendSuccess(res, null, "Feedback deleted successfully");
  } catch (error: unknown) {
    if (isCastError(error)) return sendError(res, "Invalid feedback ID", 400);
    return sendError(res, "Failed to delete feedback", 500, error);
  }
};

// POST /api/feedback/:id/reanalyze — Re-run Gemini (admin)
export const reanalyzeFeedback = async (req: Request, res: Response) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) return sendError(res, "Feedback not found", 404);

    const analysis = await analyzeFeedback(feedback.title, feedback.description);
    if (!analysis) {
      return sendError(
        res,
        "Gemini analysis unavailable. Check key/model/quota and try again",
        502
      );
    }

    feedback.ai_category  = analysis.category;
    feedback.ai_sentiment = analysis.sentiment;
    feedback.ai_priority  = analysis.priority_score;
    feedback.ai_summary   = analysis.summary;
    feedback.ai_tags      = analysis.tags;
    feedback.ai_processed = true;
    await feedback.save();

    return sendSuccess(res, feedback, "Re-analyzed successfully");
  } catch (error: unknown) {
    if (isCastError(error)) return sendError(res, "Invalid feedback ID", 400);
    return sendError(res, "Failed to re-analyze", 500, error);
  }
};

// ── Helpers ───────────────────────────────────────────────
const isValidationError = (e: unknown) =>
  typeof e === "object" && e !== null && "name" in e && (e as { name: string }).name === "ValidationError";

const isCastError = (e: unknown) =>
  typeof e === "object" && e !== null && "name" in e && (e as { name: string }).name === "CastError";