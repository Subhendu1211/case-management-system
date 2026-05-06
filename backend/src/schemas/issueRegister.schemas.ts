import { z } from 'zod';

export const listIssueRegisterSchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	pageSize: z.coerce.number().int().min(1).max(200).default(20),
	q: z.string().optional(),
	caseYear: z.coerce.number().int().min(2000).max(2100).optional(),
	kind: z.string().optional()
});

export type ListIssueRegisterQuery = z.infer<typeof listIssueRegisterSchema>;
