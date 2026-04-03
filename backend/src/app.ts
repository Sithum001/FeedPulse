import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import feedbackRoutes from "./routes/feedback.routes";
import authRoutes from "./routes/auth.routes";

const app = express();

// ─── Security & utility middleware ────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Health check ─────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.status(200).json({ success: true, message: "FeedPulse API is running" });
});

// ─── Routes ───────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/feedback", feedbackRoutes);

// ─── 404 handler ──────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

export default app;