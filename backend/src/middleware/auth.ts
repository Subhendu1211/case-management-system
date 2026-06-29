import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../db/prisma.js';
import { HttpError } from '../utils/httpError.js';
import type { AuthUser } from './rbac.js';

type JwtPayload = {
	sub: string;
	email: string;
	role: AuthUser['role'];
	name: string;
	sid?: string;
	jti: string;
};

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
	const header = req.header('authorization');
	if (!header?.startsWith('Bearer ')) return next(new HttpError(401, 'Unauthorized'));

	const token = header.slice('Bearer '.length);
	try {
		const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
		if (!payload.sid) return next(new HttpError(401, 'Invalid token'));

		const session = await prisma.authSession.findFirst({
			where: {
				id: payload.sid,
				userId: payload.sub,
				revokedAt: null,
				expiresAt: { gt: new Date() }
			},
			include: {
				user: {
					select: {
						id: true,
						email: true,
						name: true,
						role: true,
						isActive: true
					}
				}
			}
		});
		if (!session || !session.user.isActive) {
			return next(new HttpError(401, 'Session expired'));
		}

		(req as any).user = {
			id: session.user.id,
			email: session.user.email,
			role: session.user.role,
			name: session.user.name,
			sessionId: session.id
		} satisfies AuthUser;
		return next();
	} catch {
		return next(new HttpError(401, 'Invalid token'));
	}
}
