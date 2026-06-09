import { z } from 'zod';

export const createUserSchema = z.object({
	name: z.string().trim().min(2),
	email: z.string().trim().email(),
	mobile: z.string().trim().regex(/^[0-9]{10,15}$/, 'Mobile number must contain 10 to 15 digits'),
	password: z.string().min(8),
	role: z.enum([
		'PRIVATE_SECRETARY',
		'PRIVATE_ASSISTANT',
		'COMMISSIONER',
		'LEGAL_ASSISTANT',
		'REGISTRAR',
		'PROGRAMMER',
		'STATIONERY',
		'ADMIN',
		'CITIZEN'
	])
});

export const listUsersSchema = z.object({
	q: z.string().optional(),
	role: z
		.enum([
			'PRIVATE_SECRETARY',
			'PRIVATE_ASSISTANT',
			'COMMISSIONER',
			'LEGAL_ASSISTANT',
			'REGISTRAR',
			'PROGRAMMER',
			'STATIONERY',
			'ADMIN',
			'CITIZEN'
		])
		.optional(),
	page: z.coerce.number().int().min(1).default(1),
	pageSize: z.coerce.number().int().min(1).max(200).default(20)
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type ListUsersQuery = z.infer<typeof listUsersSchema>;
