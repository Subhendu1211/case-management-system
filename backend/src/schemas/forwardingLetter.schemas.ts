import { z } from 'zod';

export const createForwardingLetterSchema = z.object({
	subject: z.string().min(3).max(300),
	body: z.string().min(10).max(20000)
});

export const updateForwardingLetterSchema = z.object({
	subject: z.string().min(3).max(300).optional(),
	body: z.string().min(10).max(20000).optional()
});

export const forwardingLetterActionSchema = z.object({
	remarks: z.string().max(2000).optional()
});

export type CreateForwardingLetterInput = z.infer<typeof createForwardingLetterSchema>;
export type UpdateForwardingLetterInput = z.infer<typeof updateForwardingLetterSchema>;
export type ForwardingLetterActionInput = z.infer<typeof forwardingLetterActionSchema>;
