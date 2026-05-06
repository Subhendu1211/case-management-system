import { z } from 'zod';

export const createQueryLetterSchema = z.object({
	recipientType: z.enum(['complainant', 'accused']),
	channel: z.preprocess(
		(v) => (typeof v === 'string' ? v.toUpperCase() : v),
		z.enum(['BY_HAND', 'POST', 'COURIER', 'EMAIL'])
	),
	subject: z.string().trim().min(1).max(500),
	body: z.string().optional().default('')
});

export type CreateQueryLetterInput = z.infer<typeof createQueryLetterSchema>;
