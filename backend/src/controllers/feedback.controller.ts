import { Request, Response } from "express";
import Feedback from "../models/Feedback";
import { sendSuccess, sendError } from "../utils/response";
import { analyzeFeedback } from "../services/gemini.service";

// POST /api/feedback — Submit new feedback + trigger Gemini analysis
export const createFeedback = async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      category,
      submitterName,
      submitterEmail,
    } = req.body;

    // Step 1 — Save raw feedback first (AI runs after)
    const feedback = await Feedback.create({
      title,
      description,
      category,
      submitterName,
      submitterEmail,
      ai_processed: false,
    });

    // Step 2 — Call Gemini (feedback already saved, so failure is safe)
    const analysis = await analyzeFeedback(title, description);

    if (analysis) {
      // Step 3 — Update feedback document with AI results
      feedback.ai_category = analysis.category;
      feedback.ai_sentiment = analysis.sentiment;
      feedback.ai_priority = analysis.priority_score;
      feedback.ai_summary = analysis.summary;
      feedback.ai_tags = analysis.tags;
      feedback.ai_processed = true;

      await feedback.save();
      console.log(`✅ Gemini analysis saved for feedback: ${feedback._id}`);
    } else {
      // Gemini failed — feedback still saved, just not AI-processed
      console.warn(
        `⚠️ Gemini failed for feedback: ${feedback._id} — saved without AI fields`
      );
    }

    return sendSuccess(res, feedback, "Feedback submitted successfully", 201);
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "name" in error &&
      (error as { name: string }).name === "ValidationError"
    ) {
      const mongoError = error as {
        errors: Record<string, { message: string }>;
      };
      const messages = Object.values(mongoError.errors).map((e) => e.message);
      return sendError(res, messages.join(", "), 400);
    }
    return sendError(res, "Failed to submit feedback", 500, error);
  }
};

// GET /api/feedback — Get all feedback (supports filters + pagination)
export const getAllFeedback = async (req: Request, res: Response) => {
  try {
    const { category, status, page = "1", limit = "10" } = req.query;

    const filter: Record<string, unknown> = {};
    if (category) filter.category = category;
    if (status) filter.status = status;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.max(1, Math.min(50, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [feedbackList, total] = await Promise.all([
      Feedback.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Feedback.countDocuments(filter),
    ]);

    return sendSuccess(
      res,
      {
        feedback: feedbackList,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
      "Feedback fetched successfully"
    );
  } catch (error) {
    return sendError(res, "Failed to fetch feedback", 500, error);
  }
};

// GET /api/feedback/:id — Get single feedback item
export const getFeedbackById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const feedback = await Feedback.findById(id);

    if (!feedback) {
      return sendError(res, "Feedback not found", 404);
    }

    return sendSuccess(res, feedback, "Feedback fetched successfully");
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "name" in error &&
      (error as { name: string }).name === "CastError"
    ) {
      return sendError(res, "Invalid feedback ID", 400);
    }
    return sendError(res, "Failed to fetch feedback", 500, error);
  }
};

// PATCH /api/feedback/:id — Update status (admin only)
export const updateFeedbackStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["New", "In Review", "Resolved"].includes(status)) {
      return sendError(
        res,
        "Invalid status. Must be New, In Review, or Resolved",
        400
      );
    }

    const feedback = await Feedback.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!feedback) {
      return sendError(res, "Feedback not found", 404);
    }

    return sendSuccess(res, feedback, "Status updated successfully");
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "name" in error &&
      (error as { name: string }).name === "CastError"
    ) {
      return sendError(res, "Invalid feedback ID", 400);
    }
    return sendError(res, "Failed to update feedback", 500, error);
  }
};

// DELETE /api/feedback/:id — Delete feedback (admin only)
export const deleteFeedback = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const feedback = await Feedback.findByIdAndDelete(id);

    if (!feedback) {
      return sendError(res, "Feedback not found", 404);
    }

    return sendSuccess(res, null, "Feedback deleted successfully");
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "name" in error &&
      (error as { name: string }).name === "CastError"
    ) {
      return sendError(res, "Invalid feedback ID", 400);
    }
    return sendError(res, "Failed to delete feedback", 500, error);
  }
};

// POST /api/feedback/:id/reanalyze — Re-trigger Gemini on existing feedback (admin nice-to-have)
export const reanalyzeFeedback = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const feedback = await Feedback.findById(id);

    if (!feedback) {
      return sendError(res, "Feedback not found", 404);
    }

    const analysis = await analyzeFeedback(feedback.title, feedback.description);

    if (!analysis) {
      return sendError(res, "Gemini analysis failed — please try again", 502);
    }

    feedback.ai_category = analysis.category;
    feedback.ai_sentiment = analysis.sentiment;
    feedback.ai_priority = analysis.priority_score;
    feedback.ai_summary = analysis.summary;
    feedback.ai_tags = analysis.tags;
    feedback.ai_processed = true;

    await feedback.save();

    return sendSuccess(res, feedback, "Feedback re-analyzed successfully");
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "name" in error &&
      (error as { name: string }).name === "CastError"
    ) {
      return sendError(res, "Invalid feedback ID", 400);
    }
    return sendError(res, "Failed to re-analyze feedback", 500, error);
  }
};