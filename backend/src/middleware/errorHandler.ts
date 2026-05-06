import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/httpError.js";
import { logger } from "../config/logger.js";
import { ZodError } from "zod";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library.js";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: {
        message: err.message,
        code: err.code,
      },
    });
  }

  // Zod validation errors
  if (err instanceof ZodError) {
    logger.error({ err, issues: err.issues }, "Zod validation error");
    return res.status(400).json({
      error: {
        message: "Validation error",
        details: err.issues,
      },
    });
  }

  // Prisma errors
  if (err instanceof PrismaClientKnownRequestError) {
    logger.error(
      { err, code: err.code, meta: err.meta },
      "Prisma database error",
    );

    // Handle common Prisma errors
    if (err.code === "P2002") {
      return res.status(409).json({
        error: { message: "Unique constraint violation" },
      });
    }
    if (err.code === "P2003") {
      return res.status(400).json({
        error: { message: "Foreign key constraint violation" },
      });
    }
    if (err.code === "P2025") {
      return res.status(404).json({
        error: { message: "Record not found" },
      });
    }
  }

  logger.error({ err }, "Unhandled error");
  return res.status(500).json({ error: { message: "Internal Server Error" } });
}
