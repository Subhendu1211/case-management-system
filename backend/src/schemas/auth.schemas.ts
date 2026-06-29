import { z } from "zod";
import { isStrongPassword, passwordPolicyMessage } from "../utils/passwordPolicy.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[0-9+\-\s]{6,20}$/;

const captchaSchema = z.object({
  id: z.string().min(1),
  solution: z.string().min(1),
});

const strongPasswordSchema = z.string().refine(isStrongPassword, passwordPolicyMessage);

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1)
    .refine(
      (value) => emailPattern.test(value) || phonePattern.test(value),
      "Enter a valid email or mobile number",
    ),
  password: z.string().min(1),
  captcha: captchaSchema.optional(), // kept optional for backwards compatibility; route enforces presence
});

export const registerSchema = z
  .object({
    name: z.string().min(1),
    email: z.string().email(),
    mobile: z.string().min(10), // Basic validation
    password: strongPasswordSchema,
    confirmPassword: z.string().min(1),
    address: z.string().min(1),
    policeStation: z.string().min(1),
    block: z.string().min(1),
    pincode: z.string().min(6),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1)
    .refine(
      (value) => emailPattern.test(value) || phonePattern.test(value),
      "Enter a valid email or phone number",
    ),
  captcha: captchaSchema,
});

export const resetPasswordSchema = z
  .object({
    resetRequestId: z.string().uuid(),
    otp: z
      .string()
      .trim()
      .regex(/^\d{4,8}$/, "OTP must be 4 to 8 digits"),
    password: strongPasswordSchema,
    confirmPassword: z.string().min(1, "Confirm password is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const verifyLoginOtpSchema = z.object({
  otpRequestId: z.string().uuid(),
  otp: z
    .string()
    .trim()
    .regex(/^\d{4,8}$/, "OTP must be 4 to 8 digits"),
});

export const googleLoginSchema = z.object({
  idToken: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type VerifyLoginOtpInput = z.infer<typeof verifyLoginOtpSchema>;
export type GoogleLoginInput = z.infer<typeof googleLoginSchema>;
