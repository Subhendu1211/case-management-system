import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../../db/prisma.js";
import { HttpError } from "../../utils/httpError.js";
import {
  issueAccessToken,
  issueRefreshToken,
  verifyRefreshToken,
} from "./tokens.js";
import { env } from "../../config/env.js";
import {
  inferNotificationChannel,
  maskRecipient,
  sendLoginOtp,
  sendRegistrationSuccessNotification,
} from "../notifications.service.js";

function addSeconds(date: Date, seconds: number) {
  return new Date(date.getTime() + seconds * 1000);
}

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID || undefined);

async function issueSession(user: {
  id: string;
  email: string;
  name: string;
  role: any;
}) {
  const access = issueAccessToken({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
  const refresh = issueRefreshToken({ userId: user.id });

  const now = new Date();
  await prisma.authSession.create({
    data: {
      id: randomUUID(),
      userId: user.id,
      refreshTokenJti: refresh.payload.jti,
      refreshHash: await bcrypt.hash(refresh.token, 10),
      expiresAt: addSeconds(now, env.JWT_REFRESH_TTL_SECONDS),
    },
  });

  return {
    accessToken: access.token,
    refreshToken: refresh.token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  };
}

import { RegisterInput } from "../../schemas/auth.schemas.js";

function generateNumericOtp(length: number) {
  const min = 10 ** (length - 1);
  const max = 10 ** length;
  return String(Math.floor(Math.random() * (max - min)) + min);
}

function normalizeIdentifier(identifier: string) {
  return identifier.includes("@")
    ? identifier.trim().toLowerCase()
    : identifier.trim();
}

type LoginOtpChallengeResponse = {
  requiresOtp: true;
  otpRequestId: string;
  channel: "EMAIL" | "SMS";
  recipientHint: string;
  message: string;
};

type LoginSuccessResponse = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; name: string; role: any };
};

export async function login(
  identifier: string,
  password: string,
): Promise<LoginOtpChallengeResponse> {
  const normalized = normalizeIdentifier(identifier);
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: normalized, mode: "insensitive" } },
        { mobile: normalized },
      ],
    },
  });
  if (!user || !user.isActive) throw new HttpError(401, "Invalid credentials");

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new HttpError(401, "Invalid credentials");

  const preferredChannel = inferNotificationChannel(normalized);
  const emailTarget = user.email.trim();
  const smsTarget = user.mobile?.trim() ? user.mobile.trim() : null;
  if (!emailTarget || !smsTarget) {
    throw new HttpError(
      400,
      "Both email and mobile number are required for OTP delivery. Please contact support.",
    );
  }

  const otp = generateNumericOtp(env.LOGIN_OTP_LENGTH);
  const expiresAt = addSeconds(new Date(), env.LOGIN_OTP_TTL_SECONDS);

  await prisma.loginOtpChallenge.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const challenge = await prisma.loginOtpChallenge.create({
    data: {
      id: randomUUID(),
      userId: user.id,
      identifier: normalized,
      channel: preferredChannel,
      otpHash: await bcrypt.hash(otp, 10),
      expiresAt,
    },
  });

  const results = await Promise.allSettled([
    sendLoginOtp({
      channel: "EMAIL",
      identifier: emailTarget,
      otp,
      expiresInSeconds: env.LOGIN_OTP_TTL_SECONDS,
    }),
    sendLoginOtp({
      channel: "SMS",
      identifier: smsTarget,
      otp,
      expiresInSeconds: env.LOGIN_OTP_TTL_SECONDS,
    }),
  ]);
  const failed = results.some((result) => result.status === "rejected");

  if (failed) {
    await prisma.loginOtpChallenge.update({
      where: { id: challenge.id },
      data: { usedAt: new Date() },
    });
    throw new HttpError(
      500,
      "Unable to send OTP on email and SMS right now. Please try again.",
    );
  }

  return {
    requiresOtp: true,
    otpRequestId: challenge.id,
    channel: preferredChannel,
    recipientHint: `${maskRecipient(emailTarget, "EMAIL")} & ${maskRecipient(
      smsTarget,
      "SMS",
    )}`,
    message: `OTP sent to your email ${maskRecipient(emailTarget, "EMAIL")} and mobile ${maskRecipient(smsTarget, "SMS")}.`,
  };
}

export async function loginVerifyOtp(
  otpRequestId: string,
  otp: string,
): Promise<LoginSuccessResponse> {
  const challenge = await prisma.loginOtpChallenge.findUnique({
    where: { id: otpRequestId },
    include: { user: true },
  });

  if (!challenge || challenge.usedAt || challenge.expiresAt <= new Date()) {
    throw new HttpError(401, "OTP expired or invalid. Please login again.");
  }

  if (challenge.attempts >= env.LOGIN_OTP_MAX_ATTEMPTS) {
    await prisma.loginOtpChallenge.update({
      where: { id: challenge.id },
      data: { usedAt: new Date() },
    });
    throw new HttpError(401, "OTP attempts exceeded. Please login again.");
  }

  const validOtp = await bcrypt.compare(otp.trim(), challenge.otpHash);
  if (!validOtp) {
    await prisma.loginOtpChallenge.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 } },
    });
    throw new HttpError(401, "Invalid OTP.");
  }

  await prisma.loginOtpChallenge.update({
    where: { id: challenge.id },
    data: { usedAt: new Date() },
  });

  if (!challenge.user.isActive) throw new HttpError(401, "Invalid credentials");
  return issueSession(challenge.user);
}

export async function register(data: RegisterInput) {
  const normalizedEmail = data.email.trim().toLowerCase();
  const normalizedMobile = data.mobile.trim();
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: normalizedEmail, mode: "insensitive" } },
        { mobile: normalizedMobile },
      ],
    },
  });

  if (existingUser) {
    throw new HttpError(409, "User with this email or mobile already exists");
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  const user = await prisma.user.create({
    data: {
      id: randomUUID(),
      name: data.name,
      email: normalizedEmail,
      mobile: normalizedMobile,
      passwordHash,
      address: data.address,
      policeStation: data.policeStation,
      block: data.block,
      pincode: data.pincode,
      role: "CITIZEN", // Default role
      isActive: true,
    },
  });

  await sendRegistrationSuccessNotification({
    name: user.name,
    email: user.email,
    mobile: user.mobile,
  });

  return issueSession(user);
}

export async function forgotPassword(identifier: string) {
  const value = normalizeIdentifier(identifier);
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: { equals: value, mode: "insensitive" } }, { mobile: value }],
    },
  });
  if (!user) {
    // return success even if user not found to prevent enumeration
    return { message: "If an account exists, a reset link has been sent." };
  }

  // TODO: Implement actual email sending logic here
  // For now, valid placeholders are fine.
  console.log(`[ForgotPassword] Reset link requested for ${value}`);

  return { message: "If an account exists, a reset link has been sent." };
}

export async function loginWithGoogle(idToken: string) {
  if (!env.GOOGLE_CLIENT_ID)
    throw new HttpError(500, "Google login not configured");

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  const email = payload?.email;
  const emailVerified = payload?.email_verified;
  if (!email || !emailVerified)
    throw new HttpError(401, "Invalid Google token");

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const name = payload?.name || email.split("@")[0] || "User";
    user = await prisma.user.create({
      data: {
        id: randomUUID(),
        email,
        name,
        role: "CITIZEN",
        passwordHash: await bcrypt.hash(randomUUID(), 10),
        isActive: true,
      },
    });
  }

  if (!user.isActive) throw new HttpError(401, "Account inactive");

  return issueSession(user);
}

export async function refresh(refreshToken: string) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new HttpError(401, "Invalid refresh token");
  }
  if (payload.type !== "refresh")
    throw new HttpError(401, "Invalid refresh token");

  const session = await prisma.authSession.findFirst({
    where: {
      userId: payload.sub,
      refreshTokenJti: payload.jti,
      revokedAt: null,
    },
  });
  if (!session) throw new HttpError(401, "Refresh session not found");

  const ok = await bcrypt.compare(refreshToken, session.refreshHash);
  if (!ok) throw new HttpError(401, "Refresh session invalid");

  // rotate
  await prisma.authSession.update({
    where: { id: session.id },
    data: { revokedAt: new Date() },
  });

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) throw new HttpError(401, "User inactive");

  const access = issueAccessToken({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
  const refresh2 = issueRefreshToken({ userId: user.id });

  await prisma.authSession.create({
    data: {
      id: randomUUID(),
      userId: user.id,
      refreshTokenJti: refresh2.payload.jti,
      refreshHash: await bcrypt.hash(refresh2.token, 10),
      expiresAt: addSeconds(new Date(), env.JWT_REFRESH_TTL_SECONDS),
    },
  });

  return { accessToken: access.token, refreshToken: refresh2.token };
}
