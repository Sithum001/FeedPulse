import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { sendSuccess, sendError } from "../utils/response";

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || "admin@feedpulse.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const JWT_SECRET     = process.env.JWT_SECRET     || "feedpulse_dev_secret";
const JWT_EXPIRES_IN = "24h";

// POST /api/auth/login
export const login = (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return sendError(res, "Email and password are required", 400);
  }

  // Validate hardcoded admin credentials
  if (
    email.toLowerCase().trim() !== ADMIN_EMAIL.toLowerCase() ||
    password !== ADMIN_PASSWORD
  ) {
    return sendError(res, "Invalid email or password", 401);
  }

  // Sign JWT
  const token = jwt.sign(
    { email: ADMIN_EMAIL, role: "admin" },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return sendSuccess(
    res,
    { token, expiresIn: JWT_EXPIRES_IN },
    "Login successful"
  );
};

// GET /api/auth/verify — lets frontend check if token is still valid
export const verify = (req: Request, res: Response) => {
  // If this handler is reached, the auth middleware already validated the token
  return sendSuccess(res, { valid: true }, "Token is valid");
};