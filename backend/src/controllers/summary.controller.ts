import { Request, Response } from "express";
import Feedback from "../models/Feedback";
import { sendSuccess, sendError } from "../utils/response";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export const getFeedbackSummary = async (req: Request, res: Response) => {
  try {
    // Fetch last 7 days of feedback
    const since = new Date();
    since.setDate(since.getDate() - 7);

    const recentFeedback = await Feedback.find({
      createdAt: { $gte: since },
    }).sort({ createdAt: -1 });

    if (recentFeedback.length === 0) {
      return sendSuccess(
        res,
        {
          summary: "No feedback submitted in the last 7 days.",
          feedbackCount: 0,
          period: "Last 7 days",
          generatedAt: new Date().toISOString(),
        },
        "No recent feedback found"
      );
    }

    // Build context for Gemini from titles, descriptions, and AI tags
    const feedbackContext = recentFeedback
      .map((f, i) => {
        const tags = f.ai_tags && f.ai_tags.length > 0
          ? `Tags: ${f.ai_tags.join(", ")}`
          : "";
        const sentiment = f.ai_sentiment ? `Sentiment: ${f.ai_sentiment}` : "";
        const priority  = f.ai_priority  ? `Priority: ${f.ai_priority}/10` : "";

        return [
          `[${i + 1}] Title: ${f.title}`,
          `Description: ${f.description.slice(0, 200)}${f.description.length > 200 ? "…" : ""}`,
          tags, sentiment, priority,
        ]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n\n---\n\n");

    const prompt = `You are a product analyst. Analyze the following ${recentFeedback.length} feedback submissions from the last 7 days and identify the top 3 most important themes.

Feedback submissions:
${feedbackContext}

Return ONLY valid JSON with no extra text, no markdown, no code blocks:
{
  "themes": [
    {
      "title": "Short theme title (5 words max)",
      "description": "2-3 sentence explanation of this theme and why it matters",
      "count": <number of feedback items related to this theme>,
      "priority": "High" | "Medium" | "Low"
    }
  ],
  "overall_insight": "One paragraph (3-4 sentences) summarizing the overall product feedback landscape this week and the single most important thing the team should focus on."
}`;

    const model  = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const text   = result.response.text();

    const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsed  = JSON.parse(cleaned);

    return sendSuccess(
      res,
      {
        ...parsed,
        feedbackCount: recentFeedback.length,
        period: "Last 7 days",
        generatedAt: new Date().toISOString(),
      },
      "Summary generated successfully"
    );
  } catch (error) {
    console.error("❌ Summary generation failed:", error);
    return sendError(res, "Failed to generate summary", 500, error);
  }
};

// GET /api/feedback/stats — quick stats for dashboard header
export const getFeedbackStats = async (_req: Request, res: Response) => {
  try {
    const [total, openCount, resolvedCount, aiProcessed, priorityData, tagData] =
      await Promise.all([
        Feedback.countDocuments(),
        Feedback.countDocuments({ status: { $in: ["New", "In Review"] } }),
        Feedback.countDocuments({ status: "Resolved" }),
        Feedback.countDocuments({ ai_processed: true }),
        Feedback.aggregate([
          { $match: { ai_priority: { $exists: true, $ne: null } } },
          { $group: { _id: null, avg: { $avg: "$ai_priority" }, max: { $max: "$ai_priority" } } },
        ]),
        Feedback.aggregate([
          { $unwind: "$ai_tags" },
          { $group: { _id: "$ai_tags", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 },
        ]),
      ]);

    const avgPriority = priorityData[0]?.avg
      ? parseFloat(priorityData[0].avg.toFixed(1))
      : null;

    const topTags = tagData.map((t: { _id: string; count: number }) => ({
      tag: t._id,
      count: t.count,
    }));

    // Sentiment breakdown
    const sentimentData = await Feedback.aggregate([
      { $match: { ai_sentiment: { $exists: true } } },
      { $group: { _id: "$ai_sentiment", count: { $sum: 1 } } },
    ]);
    const sentiment = sentimentData.reduce(
      (acc: Record<string, number>, s: { _id: string; count: number }) => {
        acc[s._id] = s.count;
        return acc;
      },
      {}
    );

    return sendSuccess(
      res,
      {
        total,
        openCount,
        resolvedCount,
        aiProcessed,
        avgPriority,
        topTags,
        sentiment,
      },
      "Stats fetched successfully"
    );
  } catch (error) {
    return sendError(res, "Failed to fetch stats", 500, error);
  }
};