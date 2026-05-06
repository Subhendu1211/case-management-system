import { randomUUID } from 'crypto';
import { prisma } from '../db/prisma.js';
import { HttpError } from '../utils/httpError.js';
import type { AuthUser } from '../middleware/rbac.js';

export async function listDisabilityTypes(input: { includeInactive?: boolean; user: AuthUser }) {
	if (!input.user) throw new HttpError(401, 'Unauthorized');

	return prisma.disabilityType.findMany({
		where: input.includeInactive ? {} : { isActive: true },
		orderBy: { name: 'asc' }
	});
}

export async function createDisabilityType(input: { name: string; code?: string; isActive?: boolean; user: AuthUser }) {
	if (!(input.user.role === 'ADMIN' || input.user.role === 'PROGRAMMER')) {
		throw new HttpError(403, 'Forbidden');
	}

	try {
		return await prisma.disabilityType.create({
			data: {
				id: randomUUID(),
				name: input.name.trim(),
				code: input.code?.trim() || null,
				isActive: input.isActive ?? true
			}
		});
	} catch (e: any) {
		if (e?.code === 'P2002') {
			throw new HttpError(409, 'Disability type already exists');
		}
		throw e;
	}
}
