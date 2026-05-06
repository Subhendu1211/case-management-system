import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma.js';
import type { UpdatePublicProfileInput } from '../schemas/publicRegistration.schemas.js';

function buildRegistrationNo() {
	const year = new Date().getFullYear();
	const suffix = Math.floor(100000 + Math.random() * 900000);
	return `REG-${year}-${suffix}`;
}

export async function getPublicProfile(userId: string) {
	return prisma.publicRegistration.findUnique({ where: { userId } });
}

export async function upsertPublicProfile(userId: string, input: UpdatePublicProfileInput) {
	let lastError: unknown;
	for (let attempt = 0; attempt < 5; attempt += 1) {
		const registrationNo = buildRegistrationNo();
		try {
			return await prisma.publicRegistration.upsert({
				where: { userId },
				update: {
					fullName: input.fullName,
					email: input.email,
					mobile: input.mobile,
					alternateMobile: input.alternateMobile ?? null,
					dateOfBirth: input.dateOfBirth ?? null,
					guardianName: input.guardianName ?? null,
					gender: input.gender ?? null,
					addressLine1: input.addressLine1,
					addressLine2: input.addressLine2 ?? null,
					state: input.state,
					district: input.district,
					pinCode: input.pinCode
				},
				create: {
					id: randomUUID(),
					registrationNo,
					userId,
					fullName: input.fullName,
					email: input.email,
					mobile: input.mobile,
					alternateMobile: input.alternateMobile ?? null,
					dateOfBirth: input.dateOfBirth ?? null,
					guardianName: input.guardianName ?? null,
					gender: input.gender ?? null,
					addressLine1: input.addressLine1,
					addressLine2: input.addressLine2 ?? null,
					state: input.state,
					district: input.district,
					pinCode: input.pinCode
				}
			});
		} catch (err) {
			lastError = err;
			if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
				continue;
			}
			throw err;
		}
	}

	throw lastError ?? new Error('Failed to generate registration number');
}
