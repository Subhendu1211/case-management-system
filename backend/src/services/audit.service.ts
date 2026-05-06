import { prisma } from '../db/prisma.js';
import { randomUUID } from 'crypto';

export async function auditLog(input: {
	userId: string | null;
	module: string;
	action: string;
	entityType: string;
	entityId: string | null;
	statusCode: number;
	ip: string | null;
	ipAddress: string | null;
	userAgent: string | null;
	payloadSnapshot: unknown;
}) {
	await prisma.auditLog.create({
		data: {
			id: randomUUID(),
			userId: input.userId,
			module: input.module,
			action: input.action,
			entityType: input.entityType,
			entityId: input.entityId,
			statusCode: input.statusCode,
			ip: input.ip,
			ipAddress: input.ipAddress,
			userAgent: input.userAgent,
			payloadSnapshot: input.payloadSnapshot as any
		}
	});
}
