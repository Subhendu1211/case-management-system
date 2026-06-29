import { describe, expect, it } from 'vitest';
import { createUserSchema } from './user.schemas.js';

const validUser = {
	name: 'Legal Officer',
	email: 'legal@example.com',
	mobile: '9876543210',
	password: 'Legal@123456',
	role: 'LEGAL_ASSISTANT'
} as const;

describe('createUserSchema', () => {
	it('accepts a valid mobile number for SMS OTP delivery', () => {
		expect(createUserSchema.parse(validUser).mobile).toBe(validUser.mobile);
	});

	it('rejects a mobile number that is not 10 to 15 digits', () => {
		expect(() => createUserSchema.parse({ ...validUser, mobile: '12345' })).toThrow(
			'Mobile number must contain 10 to 15 digits'
		);
	});
});
