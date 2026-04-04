import { GoogleGenerativeAI } from "@google/generative-ai";

// Gemini response shape
export interface GeminiAnalysis {
  category: "Bug" | "Feature Request" | "Improvement" | "Other";
  sentiment: "Positive" | "Neutral" | "Negative";
  priority_score: number;
  summary: string;
  tags: string[];
}

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const ENABLE_AI_FALLBACK = process.env.ENABLE_AI_FALLBACK !== "false";

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

const buildPrompt = (title: string, description: string): string => {
  return `Analyze this product feedback.
Return ONLY valid JSON with no extra text, no markdown, no code blocks.

Required fields:
- category: must be exactly one of: Bug, Feature Request, Improvement, Other
- sentiment: must be exactly one of: Positive, Neutral, Negative
- priority_score: a number from 1 (low) to 10 (critical)
- summary: a single sentence summarizing the feedback
- tags: an array of 2-5 short relevant strings

Feedback Title: ${title}
Feedback Description: ${description}

Respond with ONLY this JSON structure:
{
  "category": "...",
  "sentiment": "...",
  "priority_score": 0,
  "summary": "...",
  "tags": ["...", "..."]
}`;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const fallbackAnalyzeFeedback = (
  title: string,
  description: string
): GeminiAnalysis => {
  const text = `${title} ${description}`.toLowerCase();

  const bugWords = ["bug", "error", "crash", "broken", "issue", "failed", "exception", "not working"];
  const featureWords = ["feature", "request", "add", "support", "wish", "would like", "could you"];
  const improvementWords = ["improve", "better", "faster", "slow", "ui", "ux", "enhance", "optimize"];

  const negativeWords = ["bad", "terrible", "hate", "frustrating", "broken", "slow", "error", "crash"];
  const positiveWords = ["good", "great", "love", "nice", "awesome", "smooth", "helpful"];
  const highPriorityWords = ["urgent", "critical", "blocker", "cannot", "can't", "payment", "security", "down"];

  const hasAny = (words: string[]) => words.some((word) => text.includes(word));

  let category: GeminiAnalysis["category"] = "Other";
  if (hasAny(bugWords)) category = "Bug";
  else if (hasAny(featureWords)) category = "Feature Request";
  else if (hasAny(improvementWords)) category = "Improvement";

  const negativeCount = negativeWords.filter((word) => text.includes(word)).length;
  const positiveCount = positiveWords.filter((word) => text.includes(word)).length;

  let sentiment: GeminiAnalysis["sentiment"] = "Neutral";
  if (negativeCount > positiveCount) sentiment = "Negative";
  else if (positiveCount > negativeCount) sentiment = "Positive";

  let priority = 5;
  if (category === "Bug") priority += 2;
  if (sentiment === "Negative") priority += 1;
  if (hasAny(highPriorityWords)) priority += 2;
  if (description.trim().length < 40) priority -= 1;

  const cleanedDescription = description.trim().replace(/\s+/g, " ");
  const summary = (cleanedDescription || title.trim()).slice(0, 160);

  const tags = new Set<string>();
  tags.add(category.toLowerCase().replace(/\s+/g, "-"));
  if (sentiment === "Negative") tags.add("negative-feedback");
  if (hasAny(highPriorityWords)) tags.add("high-priority");
  if (text.includes("ui") || text.includes("ux")) tags.add("ui-ux");
  if (text.includes("performance") || text.includes("slow")) tags.add("performance");
  if (text.includes("login") || text.includes("auth")) tags.add("authentication");
  tags.add("fallback-local");

  return {
    category,
    sentiment,
    priority_score: clamp(priority, 1, 10),
    summary,
    tags: Array.from(tags).slice(0, 5),
  };
};

const validateAnalysis = (data: unknown): data is GeminiAnalysis => {
  if (typeof data !== "object" || data === null) return false;

  const obj = data as Record<string, unknown>;

  const validCategories = ["Bug", "Feature Request", "Improvement", "Other"];
  const validSentiments = ["Positive", "Neutral", "Negative"];

  if (!validCategories.includes(obj.category as string)) return false;
  if (!validSentiments.includes(obj.sentiment as string)) return false;
  if (
    typeof obj.priority_score !== "number" ||
    obj.priority_score < 1 ||
    obj.priority_score > 10
  ) {
    return false;
  }
  if (typeof obj.summary !== "string" || obj.summary.trim() === "") return false;
  if (!Array.isArray(obj.tags)) return false;

  return true;
};

export const analyzeFeedback = async (
  title: string,
  description: string
): Promise<GeminiAnalysis | null> => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Gemini analysis skipped: GEMINI_API_KEY is missing");
      if (ENABLE_AI_FALLBACK) {
        console.warn("Using local fallback analysis because GEMINI_API_KEY is missing");
        return fallbackAnalyzeFeedback(title, description);
      }
      return null;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const prompt = buildPrompt(title, description);
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text);

    if (!validateAnalysis(parsed)) {
      console.error("Gemini returned unexpected shape:", parsed);
      if (ENABLE_AI_FALLBACK) {
        console.warn("Using local fallback analysis due to unexpected Gemini response shape");
        return fallbackAnalyzeFeedback(title, description);
      }
      return null;
    }

    parsed.priority_score = clamp(parsed.priority_score, 1, 10);
    return parsed as GeminiAnalysis;
  } catch (error) {
    const message = getErrorMessage(error);

    if (message.includes("[404")) {
      console.error(
        `Gemini analysis failed: model '${GEMINI_MODEL}' is not available for generateContent in v1beta`
      );
    } else if (message.includes("[429")) {
      console.error(
        "Gemini analysis failed: API quota exceeded. Check Gemini plan/billing and rate limits for this key"
      );
    }

    console.error("Gemini analysis failed:", message);
    if (ENABLE_AI_FALLBACK) {
      console.warn("Using local fallback analysis due to Gemini API failure");
      return fallbackAnalyzeFeedback(title, description);
    }
    return null;
  }
};