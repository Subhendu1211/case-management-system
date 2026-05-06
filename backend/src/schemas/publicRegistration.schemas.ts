import { z } from 'zod';

const optionalString = z.preprocess((value) => {
	if (typeof value === 'string' && value.trim() === '') return undefined;
	return value;
}, z.string().min(1).optional());

const optionalDate = z.preprocess((value) => {
	if (typeof value === 'string' && value.trim() === '') return undefined;
	if (value instanceof Date) return value;
	if (typeof value === 'string' || typeof value === 'number') {
		const parsed = new Date(value);
		if (!Number.isNaN(parsed.getTime())) return parsed;
	}
	return undefined;
}, z.date().optional());

export const createPublicRegistrationSchema = z.object({
	fullName: z.string().min(2),
	email: z.string().email(),
	mobile: z.string().regex(/^[0-9]{10,15}$/),
	alternateMobile: optionalString.refine((val) => !val || /^[0-9]{10,15}$/.test(val), {
		message: 'Invalid mobile number'
	}),
	dateOfBirth: optionalDate,
	guardianName: optionalString,
	gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
	addressLine1: z.string().min(5),
	addressLine2: optionalString,
	state: z.string().min(2),
	district: z.string().min(2),
	pinCode: z.string().regex(/^[0-9]{6}$/)
});

export const updatePublicProfileSchema = createPublicRegistrationSchema;

export type CreatePublicRegistrationInput = z.infer<typeof createPublicRegistrationSchema>;
export type UpdatePublicProfileInput = z.infer<typeof updatePublicProfileSchema>;
