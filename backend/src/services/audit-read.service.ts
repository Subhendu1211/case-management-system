import { prisma } from '../db/prisma.js';

export async function listAuditLogs(input: {
	q?: string;
	module?: string;
	action?: string;
	entityType?: string;
	entityId?: string;
	userId?: string;
	statusCode?: number;
	from?: Date;
	to?: Date;
	page: number;
	pageSize: number;
}) {
	const createdAt =
		input.from || input.to
			? {
				gte: input.from,
				lte: input.to
			}
			: undefined;

	const where = {
		AND: [
			input.module ? { module: { equals: input.module } } : {},
			input.action ? { action: { equals: input.action } } : {},
			input.entityType ? { entityType: { equals: input.entityType } } : {},
			input.entityId ? { entityId: { equals: input.entityId } } : {},
			input.userId ? { userId: { equals: input.userId } } : {},
			input.statusCode ? { statusCode: { equals: input.statusCode } } : {},
			createdAt ? { createdAt } : {},
			input.q
				? {
					OR: [
						{ module: { contains: input.q, mode: 'insensitive' as const } },
						{ action: { contains: input.q, mode: 'insensitive' as const } },
						{ entityType: { contains: input.q, mode: 'insensitive' as const } },
						{ entityId: { contains: input.q, mode: 'insensitive' as const } },
						{ user: { is: { email: { contains: input.q, mode: 'insensitive' as const } } } },
						{ user: { is: { name: { contains: input.q, mode: 'insensitive' as const } } } }
					]
				}
				: {}
		]
	};

	const [total, items] = await Promise.all([
		prisma.auditLog.count({ where }),
		prisma.auditLog.findMany({
			where,
			orderBy: { createdAt: 'desc' },
			skip: (input.page - 1) * input.pageSize,
			take: input.pageSize,
			select: {
				createdAt: true,
				id: true,
				module: true,
				action: true,
				entityType: true,
				entityId: true,
				statusCode: true,
				ip: true,
				ipAddress: true,
				userAgent: true,
				payloadSnapshot: true,
				user: { select: { id: true, name: true, email: true, role: true } }
			}
		})
	]);

	return { items, page: input.page, pageSize: input.pageSize, total };
}
