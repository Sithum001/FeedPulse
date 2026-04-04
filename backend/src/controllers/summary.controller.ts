import { Request, Response } from "express";
import Feedback from "../models/Feedback";
import { sendSuccess, sendError } from "../utils/response";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

type ThemePriority = "High" | "Medium" | "Low";

interface Theme {
  title: string;
  description: string;
  count: number;
  priority: ThemePriority;
}

interface SummaryPayload {
  themes: Theme[];
  overall_insight: string;
  feedbackCount: number;
  period: string;
  generatedAt: string;
}

const normalizePriority = (value: unknown): ThemePriority => {
  if (value === "High" || value === "Medium" || value === "Low") return value;
  return "Medium";
};

const normalizeGeminiSummary = (parsed: unknown): Pick<SummaryPayload, "themes" | "overall_insight"> => {
  const obj = parsed as {
    themes?: Array<{
      title?: unknown;
      description?: unknown;
      count?: unknown;
      priority?: unknown;
    }>;
    overall_insight?: unknown;
  };

  const themes: Theme[] = Array.isArray(obj?.themes)
    ? obj.themes
        .map((t) => ({
          title: typeof t?.title === "string" ? t.title.trim() : "Untitled Theme",
          description:
            typeof t?.description === "string" && t.description.trim().length > 0
              ? t.description.trim()
              : "This theme appears repeatedly in recent submissions.",
          count: typeof t?.count === "number" && t.count > 0 ? Math.round(t.count) : 1,
          priority: normalizePriority(t?.priority),
        }))
        .slice(0, 3)
    : [];

  const overall_insight =
    typeof obj?.overall_insight === "string" && obj.overall_insight.trim().length > 0
      ? obj.overall_insight.trim()
      : "Recent feedback points to recurring themes that should be prioritized this week.";

  return { themes, overall_insight };
};

const buildFallbackSummary = (recentFeedback: Awaited<ReturnType<typeof Feedback.find>>): Pick<SummaryPayload, "themes" | "overall_insight"> => {
  const buckets = new Map<
    string,
    {
      title: string;
      descriptions: string[];
      count: number;
      priorities: number[];
    }
  >();

  for (const item of recentFeedback) {
    const rawTheme = item.ai_tags?.[0] || item.category || "General";
    const title = rawTheme.trim();
    if (!buckets.has(title)) {
      buckets.set(title, { title, descriptions: [], count: 0, priorities: [] });
    }

    const bucket = buckets.get(title)!;
    bucket.count += 1;
    bucket.descriptions.push(item.description.slice(0, 120));
    if (typeof item.ai_priority === "number") bucket.priorities.push(item.ai_priority);
  }

  const themes: Theme[] = Array.from(buckets.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((bucket) => {
      const avgPriority = bucket.priorities.length
        ? bucket.priorities.reduce((sum, p) => sum + p, 0) / bucket.priorities.length
        : 5;

      const priority: ThemePriority = avgPriority >= 7 ? "High" : avgPriority >= 4 ? "Medium" : "Low";
      const sample = bucket.descriptions[0] || "Recurring topic observed in submissions.";

      return {
        title: bucket.title,
        description: `Mentioned ${bucket.count} time${bucket.count === 1 ? "" : "s"} this week. Example context: ${sample}${sample.endsWith(".") ? "" : "."}`,
        count: bucket.count,
        priority,
      };
    });

  const highCount = recentFeedback.filter((f) => (f.ai_priority || 0) >= 7).length;
  const unresolvedCount = recentFeedback.filter((f) => f.status !== "Resolved").length;

  const overall_insight =
    `From ${recentFeedback.length} recent submissions, ${themes.length > 0 ? `the strongest theme is "${themes[0].title}"` : "no dominant theme emerged"}. ` +
    `${highCount} item${highCount === 1 ? " has" : "s have"} high urgency, and ${unresolvedCount} item${unresolvedCount === 1 ? " remains" : "s remain"} unresolved. ` +
    "Prioritize the top theme while closing high-urgency unresolved feedback.";

  return { themes, overall_insight };
};

export const getFeedbackSummary = async (req: Request, res: Response) => {
  try {
    // Fetch last 7 days of feedback
    const since = new Date();
    since.setDate(since.getDate() - 7);

    const recentFeedback = await Feedback.find({
      createdAt: { $gte: since },
    }).sort({ createdAt: -1 });

    if (recentFeedback.length === 0) {
      const emptyPayload: SummaryPayload = {
        themes: [],
        overall_insight: "No feedback submitted in the last 7 days.",
        feedbackCount: 0,
        period: "Last 7 days",
        generatedAt: new Date().toISOString(),
      };

      return sendSuccess(
        res,
        emptyPayload,
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

    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is missing");
      }

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      const normalized = normalizeGeminiSummary(parsed);

      const payload: SummaryPayload = {
        ...normalized,
        feedbackCount: recentFeedback.length,
        period: "Last 7 days",
        generatedAt: new Date().toISOString(),
      };

      return sendSuccess(res, payload, "Summary generated successfully");
    } catch (aiError) {
      console.warn("⚠️ Gemini summary unavailable, using fallback:", aiError);
      const fallback = buildFallbackSummary(recentFeedback);

      const payload: SummaryPayload = {
        ...fallback,
        feedbackCount: recentFeedback.length,
        period: "Last 7 days",
        generatedAt: new Date().toISOString(),
      };

      return sendSuccess(res, payload, "Summary generated with fallback analysis");
    }
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