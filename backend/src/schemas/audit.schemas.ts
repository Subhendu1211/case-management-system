import { z } from 'zod';

export const listAuditLogsSchema = z.object({
	q: z.string().trim().min(1).optional(),
	module: z.string().trim().min(1).optional(),
	action: z.string().trim().min(1).optional(),
	entityType: z.string().trim().min(1).optional(),
	entityId: z.string().trim().min(1).optional(),
	userId: z.string().uuid().optional(),
	statusCode: z.coerce.number().int().min(100).max(599).optional(),
	from: z.coerce.date().optional(),
	to: z.coerce.date().optional(),
	page: z.coerce.number().int().min(1).default(1),
	pageSize: z.coerce.number().int().min(1).max(200).default(20)
});

export type ListAuditLogsQuery = z.infer<typeof listAuditLogsSchema>;
