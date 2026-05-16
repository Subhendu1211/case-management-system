import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
	PORT: z.coerce.number().default(4001),
	NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
	CORS_ORIGIN: z.string().default('http://localhost:5173'),
	DATABASE_URL: z.string().min(1),
	JWT_ACCESS_SECRET: z.string().min(16),
	JWT_REFRESH_SECRET: z.string().min(16),
	JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
	JWT_REFRESH_TTL_SECONDS: z.coerce.number().int().positive().default(604800),
	RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
	RATE_LIMIT_MAX: z.coerce.number().int().positive().default(600),
	UPLOAD_DIR: z.string().default('uploads'),
	GOOGLE_CLIENT_ID: z.string().optional().default('179354514031-hpipimke0r55gp1ps3fp6tsdq854ge18.apps.googleusercontent.com'),
	LOGIN_OTP_TTL_SECONDS: z.coerce.number().int().positive().default(300),
	LOGIN_OTP_LENGTH: z.coerce.number().int().min(4).max(8).default(6),
	LOGIN_OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
	EMAIL_NOTIFICATION_WEBHOOK_URL: z.string().url().optional(),
	SMS_NOTIFICATION_WEBHOOK_URL: z.string().url().optional(),
	NOTIFICATION_WEBHOOK_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
	SMTP_HOST: z.string().optional(),
	SMTP_PORT: z.coerce.number().int().positive().default(587),
	SMTP_USER: z.string().optional(),
	SMTP_PASS: z.string().optional(),
	SMTP_FROM: z.string().optional(),
	SMTP_REQUIRE_TLS: z
		.string()
		.optional()
		.transform((value) => ['1', 'true', 'yes', 'on'].includes(String(value ?? '').trim().toLowerCase())),
	EMAIL_OTP_CONTENT: z.string().optional(),
	EMAIL_REGISTRATION_CONTENT: z.string().optional(),
	EMAIL_COMPLAINT_CONTENT: z.string().optional(),
	GOVT_SMS_API_URL: z.string().url().default('https://govtsms.odisha.gov.in/api/api.php'),
	GOVT_SMS_SOURCE: z.string().optional(),
	GOVT_SMS_DEPARTMENT_ID: z.string().optional(),
	GOVT_SMS_TEMPLATE_ID: z.string().optional(),
	GOVT_SMS_OTP_TEMPLATE_ID: z.string().optional(),
	GOVT_SMS_REGISTRATION_TEMPLATE_ID: z.string().optional(),
	GOVT_SMS_COMPLAINT_TEMPLATE_ID: z.string().optional(),
	GOVT_SMS_DEFAULT_ACTION: z.string().default('singleSMS'),
	GOVT_SMS_OTP_ACTION: z.string().default('sendOTPSMS'),
	GOVT_SMS_COUNTRY_CODE: z.string().default('91'),
	GOVT_SMS_FORCE_COUNTRY_CODE: z
		.string()
		.optional()
		.transform((value) => ['1', 'true', 'yes', 'on'].includes(String(value ?? '').trim().toLowerCase())),
	GOVT_SMS_OTP_CONTENT: z.string().optional(),
	GOVT_SMS_REGISTRATION_CONTENT: z.string().optional(),
	GOVT_SMS_COMPLAINT_CONTENT: z.string().optional()
});

export const env = envSchema.parse(process.env);
