import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { env } from '../../config/env.js';
import type { Role } from '../../middleware/rbac.js';

export type AccessTokenPayload = {
	sub: string;
	email: string;
	name: string;
	role: Role;
	sid: string;
	jti: string;
};

export type RefreshTokenPayload = {
	sub: string;
	jti: string;
	type: 'refresh';
};

export function issueAccessToken(input: { userId: string; email: string; name: string; role: Role; sessionId: string }) {
	const payload: AccessTokenPayload = {
		sub: input.userId,
		email: input.email,
		name: input.name,
		role: input.role,
		sid: input.sessionId,
		jti: randomUUID()
	};

	const token = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
		expiresIn: env.JWT_ACCESS_TTL_SECONDS
	});

	return { token, payload };
}

export function issueRefreshToken(input: { userId: string }) {
	const payload: RefreshTokenPayload = {
		sub: input.userId,
		jti: randomUUID(),
		type: 'refresh'
	};

	const token = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
		expiresIn: env.JWT_REFRESH_TTL_SECONDS
	});

	return { token, payload };
}

export function verifyRefreshToken(refreshToken: string) {
	return jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}
