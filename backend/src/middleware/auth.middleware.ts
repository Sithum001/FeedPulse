import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { sendError } from "../utils/response";

const JWT_SECRET = process.env.JWT_SECRET || "feedpulse_dev_secret";

export interface AuthRequest extends Request {
  admin?: { email: string; role: string };
}

export const protect = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  // Accept token from Authorization header: "Bearer <token>"
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendError(
      res,
      "Access denied. No token provided.",
      401
    );
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      email: string;
      role: string;
    };

    // Attach admin info to request for downstream use
    req.admin = decoded;
    next();
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.name === "TokenExpiredError"
    ) {
      return sendError(res, "Token expired. Please log in again.", 401);
    }
    return sendError(res, "Invalid token.", 401);
  }
};