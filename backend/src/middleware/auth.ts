import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';
import type { AuthUser } from './rbac.js';

type JwtPayload = {
	sub: string;
	email: string;
	role: AuthUser['role'];
	name: string;
	jti: string;
};

export function authenticate(req: Request, _res: Response, next: NextFunction) {
	const header = req.header('authorization');
	if (!header?.startsWith('Bearer ')) return next(new HttpError(401, 'Unauthorized'));

	const token = header.slice('Bearer '.length);
	try {
		const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
		(req as any).user = {
			id: payload.sub,
			email: payload.email,
			role: payload.role,
			name: payload.name
		} satisfies AuthUser;
		return next();
	} catch {
		return next(new HttpError(401, 'Invalid token'));
	}
}
