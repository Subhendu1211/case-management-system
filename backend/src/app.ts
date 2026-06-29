import express from "express";
import path from "path";
import cors, { type CorsOptions } from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { requestId } from "./middleware/requestId.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { apiV1Router } from "./routes/v1/index.js";
import fs from "fs";



export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("etag", false);
  // Trust only the first proxy (nginx on localhost)
  // This prevents IP spoofing while allowing rate limiting to work correctly
  app.set("trust proxy", 1);

  app.use(requestId);
  app.use((req, res, next) => {
    if (env.NODE_ENV !== "production") return next();
    const forwardedProto = req.header("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
    const isHttps = req.secure || forwardedProto === "https";
    if (isHttps) return next();

    if (req.method === "GET" || req.method === "HEAD") {
      const host = req.header("host");
      if (host) return res.redirect(308, `https://${host}${req.originalUrl}`);
    }
    return res.status(426).json({ error: { message: "HTTPS is required" } });
  });
  app.use(
    pinoHttp({
      logger,
      customProps: (req: any, res: any) => ({
        requestId: (res.locals as any).requestId,
        userId: (req as any).user?.id,
      }),
    }),
  );
  app.use(
    helmet({
      frameguard: { action: "deny" },
      hsts: {
        maxAge: 31_536_000,
        includeSubDomains: true,
        preload: true,
      },
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "frame-ancestors": ["'none'"],
          "object-src": ["'none'"],
          "script-src": ["'self'"],
          "style-src": ["'self'", "'unsafe-inline'"],
          "img-src": ["'self'", "data:", "blob:"],
        },
      },
    }),
  );
  const allowedOrigins = env.CORS_ORIGIN.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  app.use(
    cors((req: express.Request, cb) => {
      const origin = req.header("origin");
      const host = req.header("host");
      const forwardedProto = req.header("x-forwarded-proto")?.split(",")[0]?.trim();
      const protocol = forwardedProto || req.protocol;
      const requestOrigin = host ? `${protocol}://${host}` : undefined;

      const corsOptions: CorsOptions = {
        origin: false,
        credentials: true,
        exposedHeaders: ["x-request-id"],
      };

      const allowOrigin = () => cb(null, { ...corsOptions, origin: true });

      if (!origin) {
        return allowOrigin();
      }

      if (requestOrigin && origin === requestOrigin) {
        return allowOrigin();
      }

      const isLocalDevOrigin =
        env.NODE_ENV !== "production" &&
        /^(http:\/\/)(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);

      if (isLocalDevOrigin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        return allowOrigin();
      }

      return cb(new Error(`CORS blocked for origin: ${origin}`), corsOptions);
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

  app.use("/api/v1", apiV1Router);

  const frontendDistDir = env.FRONTEND_DIST_DIR
    ? path.resolve(env.FRONTEND_DIST_DIR)
    : path.resolve(process.cwd(), "..", "frontend", "dist");

  if (fs.existsSync(frontendDistDir)) {
    app.use(express.static(frontendDistDir));

    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api/") || req.path === "/uploads" || req.path.startsWith("/uploads/")) {
        return next();
      }
      res.sendFile(path.join(frontendDistDir, "index.html"));
    });
  }

  app.use(errorHandler);

  return app;
}
