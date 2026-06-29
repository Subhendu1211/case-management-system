import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  forgotPasswordSchema,
  googleLoginSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  refreshSchema,
  verifyLoginOtpSchema,
} from "../../schemas/auth.schemas.js";
import {
  forgotPassword,
  login,
  loginVerifyOtp,
  loginWithGoogle,
  logoutCurrentSession,
  register,
  resetPassword,
  refresh,
} from "../../services/auth/auth.service.js";
import { authenticate } from "../../middleware/auth.js";
import { HttpError } from "../../utils/httpError.js";
import {
  generateCaptcha,
  verifyCaptcha,
} from "../../services/auth/captcha.service.js";

export const authRouter = Router();

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body);
    if (!input.captcha) {
      throw new HttpError(400, "Captcha is required");
    }
    if (!verifyCaptcha(input.captcha)) {
      throw new HttpError(400, "Invalid captcha");
    }

    const result = await login(input.identifier, input.password);
    if (!result.requiresOtp) {
      throw new HttpError(500, "OTP verification must be completed before login.");
    }
    res.json(result);
  }),
);

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const input = registerSchema.parse(req.body);
    const result = await register(input);
    res.json(result);
  }),
);

authRouter.post(
  "/login/verify-otp",
  asyncHandler(async (req, res) => {
    const input = verifyLoginOtpSchema.parse(req.body);
    const result = await loginVerifyOtp(input.otpRequestId, input.otp);
    res.json(result);
  }),
);

authRouter.post(
  "/forgot-password",
  asyncHandler(async (req, res) => {
    const input = forgotPasswordSchema.parse(req.body);
    if (!verifyCaptcha(input.captcha)) {
      throw new HttpError(400, "Invalid captcha");
    }
    const result = await forgotPassword(input.identifier);
    res.json(result);
  }),
);

authRouter.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    const input = resetPasswordSchema.parse(req.body);
    const result = await resetPassword(input);
    res.json(result);
  }),
);

authRouter.get(
  "/captcha",
  asyncHandler(async (req, res) => {
    res.json(generateCaptcha());
  }),
);

authRouter.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const input = refreshSchema.parse(req.body);
    const result = await refresh(input.refreshToken);
    res.json(result);
  }),
);

authRouter.post(
  "/logout",
  authenticate,
  asyncHandler(async (req, res) => {
    const user = (req as any).user;
    res.json(await logoutCurrentSession(user));
  }),
);

authRouter.post(
  "/google",
  asyncHandler(async (req, res) => {
    const input = googleLoginSchema.parse(req.body);
    const result = await loginWithGoogle(input.idToken);
    res.json(result);
  }),
);

authRouter.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const user = (req as any).user;
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  }),
);
