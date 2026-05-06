import express from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { requestId } from "./middleware/requestId.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { apiV1Router } from "./routes/v1/index.js";



export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("etag", false);
  // Trust only the first proxy (nginx on localhost)
  // This prevents IP spoofing while allowing rate limiting to work correctly
  app.set("trust proxy", 1);

  app.use(requestId);
  app.use(
    pinoHttp({
      logger,
      customProps: (req: any, res: any) => ({
        requestId: (res.locals as any).requestId,
        userId: (req as any).user?.id,
      }),
    }),
  );
  app.use(helmet());
  const allowedOrigins = env.CORS_ORIGIN.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  app.use(
    cors({
      origin: (origin, cb) => {
        // Allow non-browser requests (no Origin header)
        if (!origin) return cb(null, true);

        // In local dev, accept any localhost origin (Vite may choose another port)
        if (
          env.NODE_ENV !== "production" &&
          /^(http:\/\/)(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)
        ) {
          return cb(null, true);
        }

        // Wildcard support for local dev
        if (allowedOrigins.includes("*")) return cb(null, true);

        // Exact match support for one-or-many origins (comma-separated)
        if (allowedOrigins.includes(origin)) return cb(null, true);

        return cb(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true,
      exposedHeaders: ["x-request-id"],
    }),
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      limit: env.RATE_LIMIT_MAX,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  // Serve uploads directory statically
  const uploadDirAbs = path.isAbsolute(env.UPLOAD_DIR) 
    ? env.UPLOAD_DIR 
    : path.resolve(process.cwd(), env.UPLOAD_DIR);
  app.use("/uploads", express.static(uploadDirAbs));
  app.use("/api/v1", apiV1Router);
  app.use(errorHandler);

  return app;
}
