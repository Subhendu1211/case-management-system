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
import { logger } from "../../config/logger.js";
import {
  inferNotificationChannel,
  maskRecipient,
  sendLoginOtp,
  sendPasswordResetOtp,
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

import type {
  RegisterInput,
  ResetPasswordInput,
} from "../../schemas/auth.schemas.js";

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

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
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

type PasswordResetChallengeResponse = {
  resetRequestId: string;
  channel: "EMAIL" | "SMS";
  recipientHint: string;
  message: string;
};

type OtpDelivery = { channel: "EMAIL" | "SMS"; identifier: string };

type OtpDeliveryResult =
  | (OtpDelivery & { ok: true })
  | (OtpDelivery & { ok: false; deliveryError: string });

async function attemptLoginOtpDelivery(
  delivery: OtpDelivery,
  otp: string,
): Promise<OtpDeliveryResult> {
  try {
    await sendLoginOtp({
      channel: delivery.channel,
      identifier: delivery.identifier,
      otp,
      expiresInSeconds: env.LOGIN_OTP_TTL_SECONDS,
    });
    return { ...delivery, ok: true };
  } catch (error) {
    return {
      ...delivery,
      ok: false,
      deliveryError: getErrorMessage(error),
    };
  }
}

export async function login(
  identifier: string,
  password: string,
): Promise<LoginOtpChallengeResponse> {
  const normalized = normalizeIdentifier(identifier);
  const preferredChannel = inferNotificationChannel(normalized);
  const user =
    preferredChannel === "EMAIL"
      ? await prisma.user.findFirst({
          where: { email: { equals: normalized, mode: "insensitive" } },
        })
      : await prisma.user.findFirst({
          where: { mobile: normalized },
        });

  if (!user) {
    throw new HttpError(
      404,
      preferredChannel === "EMAIL"
        ? "Email does not exist."
        : "Mobile number does not exist.",
    );
  }
  if (!user.isActive) throw new HttpError(401, "Account is inactive.");

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new HttpError(401, "Invalid credentials");

  const emailTarget = user.email.trim();
  const smsTarget = user.mobile?.trim() ? user.mobile.trim() : null;
  const smsDelivery: OtpDelivery | null = smsTarget
    ? { channel: "SMS", identifier: smsTarget }
    : null;
  const emailDelivery: OtpDelivery | null = emailTarget
    ? { channel: "EMAIL", identifier: emailTarget }
    : null;
  const otpDeliveries: OtpDelivery[] = [smsDelivery, emailDelivery].filter(
    (delivery): delivery is OtpDelivery => Boolean(delivery),
  );
  if (!otpDeliveries.length) {
    throw new HttpError(
      400,
      "No email/mobile destination is available for OTP delivery.",
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
      channel: smsDelivery ? "SMS" : preferredChannel,
      otpHash: await bcrypt.hash(otp, 10),
      expiresAt,
    },
  });

  if (env.NODE_ENV !== "production") {
    logger.info(
      {
        userId: user.id,
        preferredChannel,
        destinations: otpDeliveries.map((delivery) => ({
          channel: delivery.channel,
          destination: maskRecipient(delivery.identifier, delivery.channel),
        })),
        otpRequestId: challenge.id,
        otp,
        expiresAt: expiresAt.toISOString(),
      },
      "[DEV_LOGIN_OTP]",
    );
  }

  const logFailedDeliveries = (
    failedDeliveries: Array<
      OtpDelivery & { deliveryError: string }
    >,
    marker = "[LOGIN_OTP_DELIVERY_FAILED_OTP_LOGGED]",
    includeOtp = true,
  ) => {
    if (!failedDeliveries.length) return;

    logger.warn(
      {
        userId: user.id,
        preferredChannel,
        otpRequestId: challenge.id,
        ...(includeOtp ? { otp } : {}),
        expiresAt: expiresAt.toISOString(),
        failedDeliveries: failedDeliveries.map((failure) => ({
          channel: failure.channel,
          destination: maskRecipient(failure.identifier, failure.channel),
          deliveryError: failure.deliveryError,
        })),
      },
      marker,
    );
  };

  const deliveryOutcomes: OtpDeliveryResult[] = [];
  const smsDeliveryPromise = smsDelivery
    ? attemptLoginOtpDelivery(smsDelivery, otp)
    : null;
  const emailDeliveryPromise = emailDelivery
    ? attemptLoginOtpDelivery(emailDelivery, otp)
    : null;

  if (smsDeliveryPromise) {
    const smsOutcome = await smsDeliveryPromise;
    deliveryOutcomes.push(smsOutcome);

    if (emailDeliveryPromise) {
      if (smsOutcome.ok) {
        void emailDeliveryPromise.then((emailOutcome) => {
          if (!emailOutcome.ok) {
            logFailedDeliveries(
              [emailOutcome],
              "[LOGIN_OTP_EMAIL_DELIVERY_FAILED_SMS_SENT]",
              false,
            );
          }
        });
      } else {
        deliveryOutcomes.push(await emailDeliveryPromise);
      }
    }
  } else if (emailDeliveryPromise) {
    deliveryOutcomes.push(await emailDeliveryPromise);
  }

  const successfulDeliveries = deliveryOutcomes.filter(
    (outcome): outcome is OtpDelivery & { ok: true } => outcome.ok,
  );
  const failedDeliveries = deliveryOutcomes.filter(
    (outcome): outcome is OtpDelivery & { ok: false; deliveryError: string } =>
      !outcome.ok,
  );

  logFailedDeliveries(failedDeliveries);

  const deliveryFailed = successfulDeliveries.length === 0;
  const sentEmail = successfulDeliveries.find(
    (delivery) => delivery.channel === "EMAIL",
  );
  const sentSms = successfulDeliveries.find(
    (delivery) => delivery.channel === "SMS",
  );
  const recipientHint = sentEmail && sentSms
    ? `${maskRecipient(sentEmail.identifier, "EMAIL")} & ${maskRecipient(
        sentSms.identifier,
        "SMS",
      )}`
    : sentEmail
      ? maskRecipient(sentEmail.identifier, "EMAIL")
      : sentSms
        ? maskRecipient(sentSms.identifier, "SMS")
        : `${maskRecipient(emailTarget, "EMAIL")}${smsTarget ? ` & ${maskRecipient(smsTarget, "SMS")}` : ""}`;

  if (deliveryFailed && env.NODE_ENV === "production") {
    throw new HttpError(
      502,
      smsTarget
        ? "OTP SMS delivery failed. Please check the mobile number and SMS gateway configuration."
        : "OTP email delivery failed. Please check the email gateway configuration.",
    );
  }

  return {
    requiresOtp: true,
    otpRequestId: challenge.id,
    channel: sentSms ? "SMS" : sentEmail ? "EMAIL" : preferredChannel,
    recipientHint,
    message: deliveryFailed
      ? "OTP delivery failed. Use the OTP printed in the backend server log to continue."
      : sentEmail && sentSms
        ? `OTP sent to your email ${maskRecipient(sentEmail.identifier, "EMAIL")} and mobile ${maskRecipient(sentSms.identifier, "SMS")}.`
        : sentEmail
          ? `OTP sent to your email ${maskRecipient(sentEmail.identifier, "EMAIL")}.`
          : `OTP sent to your mobile ${maskRecipient(sentSms!.identifier, "SMS")}.`,
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
  const preferredChannel = inferNotificationChannel(value);
  const user =
    preferredChannel === "EMAIL"
      ? await prisma.user.findFirst({
          where: { email: { equals: value, mode: "insensitive" } },
        })
      : await prisma.user.findFirst({
          where: { mobile: value },
        });

  if (!user) {
    throw new HttpError(
      404,
      preferredChannel === "EMAIL"
        ? "Email does not exist."
        : "Mobile number does not exist.",
    );
  }
  if (!user.isActive) {
    throw new HttpError(401, "Account is inactive.");
  }

  const emailTarget = user.email.trim();
  const smsTarget = user.mobile?.trim() ? user.mobile.trim() : null;
  const delivery =
    preferredChannel === "SMS"
      ? smsTarget
        ? { channel: "SMS" as const, identifier: smsTarget }
        : null
      : emailTarget
        ? { channel: "EMAIL" as const, identifier: emailTarget }
        : null;

  if (!delivery) {
    throw new HttpError(
      400,
      "No email/mobile destination is available for OTP delivery.",
    );
  }

  const otp = generateNumericOtp(env.PASSWORD_RESET_OTP_LENGTH);
  const expiresAt = addSeconds(new Date(), env.PASSWORD_RESET_OTP_TTL_SECONDS);

  await prisma.passwordResetChallenge.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const challenge = await prisma.passwordResetChallenge.create({
    data: {
      id: randomUUID(),
      userId: user.id,
      identifier: value,
      channel: delivery.channel,
      otpHash: await bcrypt.hash(otp, 10),
      expiresAt,
    },
  });

  if (env.NODE_ENV !== "production") {
    logger.info(
      {
        userId: user.id,
        channel: delivery.channel,
        destination: maskRecipient(delivery.identifier, delivery.channel),
        resetRequestId: challenge.id,
        otp,
        expiresAt: expiresAt.toISOString(),
      },
      "[DEV_PASSWORD_RESET_OTP]",
    );
  }

  let deliveryFailed = false;
  try {
    await sendPasswordResetOtp({
      channel: delivery.channel,
      identifier: delivery.identifier,
      otp,
      expiresInSeconds: env.PASSWORD_RESET_OTP_TTL_SECONDS,
    });
  } catch (error) {
    deliveryFailed = true;
    logger.warn(
      {
        userId: user.id,
        channel: delivery.channel,
        destination: maskRecipient(delivery.identifier, delivery.channel),
        resetRequestId: challenge.id,
        deliveryError: getErrorMessage(error),
        ...(env.NODE_ENV !== "production" ? { otp } : {}),
      },
      "[PASSWORD_RESET_OTP_DELIVERY_FAILED]",
    );
    if (env.NODE_ENV === "production") {
      throw new HttpError(
        502,
        delivery.channel === "SMS"
          ? "OTP SMS delivery failed. Please check the mobile number and SMS gateway configuration."
          : "OTP email delivery failed. Please check the email gateway configuration.",
      );
    }
  }

  const recipientHint = maskRecipient(delivery.identifier, delivery.channel);
  return {
    resetRequestId: challenge.id,
    channel: delivery.channel,
    recipientHint,
    message: deliveryFailed
      ? "OTP delivery failed. Use the OTP printed in the backend server log to continue."
      : delivery.channel === "SMS"
        ? `OTP sent to your mobile ${recipientHint}.`
        : `OTP sent to your email ${recipientHint}.`,
  } satisfies PasswordResetChallengeResponse;
}

export async function resetPassword(input: ResetPasswordInput) {
  const challenge = await prisma.passwordResetChallenge.findUnique({
    where: { id: input.resetRequestId },
    include: { user: true },
  });

  if (!challenge || challenge.usedAt || challenge.expiresAt <= new Date()) {
    throw new HttpError(401, "OTP expired or invalid. Please request a new code.");
  }

  if (challenge.attempts >= env.PASSWORD_RESET_OTP_MAX_ATTEMPTS) {
    await prisma.passwordResetChallenge.update({
      where: { id: challenge.id },
      data: { usedAt: new Date() },
    });
    throw new HttpError(401, "OTP attempts exceeded. Please request a new code.");
  }

  const validOtp = await bcrypt.compare(input.otp.trim(), challenge.otpHash);
  if (!validOtp) {
    await prisma.passwordResetChallenge.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 } },
    });
    throw new HttpError(401, "Invalid OTP.");
  }

  if (!challenge.user.isActive) {
    throw new HttpError(401, "Account is inactive.");
  }

  const now = new Date();
  const passwordHash = await bcrypt.hash(input.password, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: challenge.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetChallenge.update({
      where: { id: challenge.id },
      data: { usedAt: now },
    }),
    prisma.authSession.updateMany({
      where: { userId: challenge.userId, revokedAt: null },
      data: { revokedAt: now },
    }),
  ]);

  return { message: "Password updated successfully. You may now sign in." };
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
