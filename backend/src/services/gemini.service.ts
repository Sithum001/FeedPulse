import { GoogleGenerativeAI } from "@google/generative-ai";

// Gemini response shape
export interface GeminiAnalysis {
  category: "Bug" | "Feature Request" | "Improvement" | "Other";
  sentiment: "Positive" | "Neutral" | "Negative";
  priority_score: number;
  summary: string;
  tags: string[];
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

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
  )
    return false;
  if (typeof obj.summary !== "string" || obj.summary.trim() === "")
    return false;
  if (!Array.isArray(obj.tags)) return false;

  return true;
};

export const analyzeFeedback = async (
  title: string,
  description: string
): Promise<GeminiAnalysis | null> => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = buildPrompt(title, description);
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Strip any accidental markdown code fences just in case
    const cleaned = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    // Validate the shape before trusting it
    if (!validateAnalysis(parsed)) {
      console.error("❌ Gemini returned unexpected shape:", parsed);
      return null;
    }

    // Clamp priority_score to 1–10 range just to be safe
    parsed.priority_score = Math.min(10, Math.max(1, parsed.priority_score));

    return parsed as GeminiAnalysis;
  } catch (error) {
    console.error("❌ Gemini analysis failed:", error);
    return null; // caller handles null gracefully
  }
};