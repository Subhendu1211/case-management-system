import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';

export function requestId(req: Request, res: Response, next: NextFunction) {
	const incoming = req.header('x-request-id');
	const id = incoming && incoming.length <= 128 ? incoming : randomUUID();
	(res.locals as any).requestId = id;
	res.setHeader('x-request-id', id);
	next();
}
