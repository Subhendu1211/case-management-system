import type { NextFunction, Request, Response } from 'express';
import { auditLog } from '../services/audit.service.js';

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function redact(value: unknown, depth = 0): unknown {
	if (depth > 6) return '[Truncated]';
	if (value == null) return value;
	if (typeof value === 'string') return value.length > 2000 ? `${value.slice(0, 2000)}…` : value;
	if (typeof value === 'number' || typeof value === 'boolean') return value;
	if (Array.isArray(value)) return value.slice(0, 50).map((v) => redact(v, depth + 1));
	if (!isPlainObject(value)) return '[Unsupported]';

	const out: Record<string, unknown> = {};
	for (const [key, v] of Object.entries(value)) {
		if (/(password|token|secret|authorization|cookie|refresh)/i.test(key)) {
			out[key] = '[REDACTED]';
			continue;
		}
		out[key] = redact(v, depth + 1);
	}
	return out;
}

function buildPayloadSnapshot(req: Request) {
	return {
		method: req.method,
		path: req.originalUrl,
		params: redact(req.params),
		query: redact(req.query),
		body: redact((req as any).body),
		userId: (req as any).user?.id ?? null,
		role: (req as any).user?.role ?? null
	};
}

export function audit(module: string, action: string, entityType: string, entityIdFromReq?: (req: Request) => string | undefined) {
	return async (req: Request, res: Response, next: NextFunction) => {
		res.on('finish', () => {
			const user = (req as any).user as { id: string } | undefined;
			const entityId = entityIdFromReq?.(req);
			// fire-and-forget; audit failures should not break API
			void auditLog({
				userId: user?.id ?? null,
				module,
				action,
				entityType,
				entityId: entityId ?? null,
				statusCode: res.statusCode,
				ip: req.ip ?? null,
				ipAddress: req.ip ?? null,
				userAgent: req.header('user-agent') ?? null,
				payloadSnapshot: buildPayloadSnapshot(req)
			});
		});
		next();
	};
}
