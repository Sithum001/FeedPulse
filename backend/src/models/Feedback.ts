import mongoose, { Document, Schema } from "mongoose";

export interface IFeedback extends Document {
  title: string;
  description: string;
  category: "Bug" | "Feature Request" | "Improvement" | "Other";
  status: "New" | "In Review" | "Resolved";
  submitterName?: string;
  submitterEmail?: string;
  // AI fields
  ai_category?: string;
  ai_sentiment?: "Positive" | "Neutral" | "Negative";
  ai_priority?: number;
  ai_summary?: string;
  ai_tags?: string[];
  ai_processed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const FeedbackSchema = new Schema<IFeedback>(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [120, "Title cannot exceed 120 characters"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      minlength: [20, "Description must be at least 20 characters"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: {
        values: ["Bug", "Feature Request", "Improvement", "Other"],
        message: "Category must be Bug, Feature Request, Improvement, or Other",
      },
    },
    status: {
      type: String,
      enum: {
        values: ["New", "In Review", "Resolved"],
        message: "Status must be New, In Review, or Resolved",
      },
      default: "New",
    },
    submitterName: {
      type: String,
      trim: true,
    },
    submitterEmail: {
      type: String,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email address",
      ],
    },
    // AI fields — populated after Gemini responds
    ai_category: {
      type: String,
    },
    ai_sentiment: {
      type: String,
      enum: ["Positive", "Neutral", "Negative"],
    },
    ai_priority: {
      type: Number,
      min: 1,
      max: 10,
    },
    ai_summary: {
      type: String,
    },
    ai_tags: {
      type: [String],
      default: [],
    },
    ai_processed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // auto-manages createdAt and updatedAt
  }
);

// --- Indexes for query performance ---
FeedbackSchema.index({ status: 1 });
FeedbackSchema.index({ category: 1 });
FeedbackSchema.index({ ai_priority: -1 });
FeedbackSchema.index({ createdAt: -1 });

export default mongoose.model<IFeedback>("Feedback", FeedbackSchema);