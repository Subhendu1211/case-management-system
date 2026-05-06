import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../utils/httpError.js';

export type Role =
	| 'PRIVATE_SECRETARY'
	| 'PRIVATE_ASSISTANT'
	| 'COMMISSIONER'
	| 'LEGAL_ASSISTANT'
	| 'REGISTRAR'
	| 'PROGRAMMER'
	| 'STATIONERY'
	| 'COMPUTER_ASSISTANT'
	| 'ADMIN'
	| 'CITIZEN';

export type AuthUser = {
	id: string;
	email: string;
	role: Role;
	name: string;
};

export function requireRole(allowed: Role[]) {
	return (req: Request, _res: Response, next: NextFunction) => {
		const user = (req as any).user as AuthUser | undefined;
		if (!user) return next(new HttpError(401, 'Unauthorized'));
		if (!allowed.includes(user.role)) return next(new HttpError(403, 'Forbidden'));
		next();
	};
}
