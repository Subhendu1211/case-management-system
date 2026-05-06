import { z } from 'zod';

export const createDisabilityTypeSchema = z.object({
	name: z.string().min(2).max(200),
	code: z.string().max(50).optional(),
	isActive: z.boolean().default(true)
});

export const listDisabilityTypesSchema = z.object({
	includeInactive: z.coerce.boolean().optional()
});

export type CreateDisabilityTypeInput = z.infer<typeof createDisabilityTypeSchema>;
export type ListDisabilityTypesQuery = z.infer<typeof listDisabilityTypesSchema>;
