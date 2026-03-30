import type { Response } from "express";

export const sendSuccess = (
  res: Response,
  data: unknown,
  message = "Success",
  statusCode = 200
) => {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
    error: null,
  });
};

export const sendError = (
  res: Response,
  message = "Something went wrong",
  statusCode = 500,
  error: unknown = null
) => {
  return res.status(statusCode).json({
    success: false,
    data: null,
    message,
    error: error instanceof Error ? error.message : error,
  });
};
