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
	GOOGLE_CLIENT_ID: z.string().optional().default('179354514031-hpipimke0r55gp1ps3fp6tsdq854ge18.apps.googleusercontent.com')
});

export const env = envSchema.parse(process.env);
