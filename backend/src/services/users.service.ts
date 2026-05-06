import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { prisma } from '../db/prisma.js';
import type { Role } from '../middleware/rbac.js';
import { HttpError } from '../utils/httpError.js';

export async function createUser(input: { name: string; email: string; password: string; role: Role }) {
	const existing = await prisma.user.findUnique({ where: { email: input.email } });
	if (existing) throw new HttpError(409, 'Email already exists');

	const user = await prisma.user.create({
		data: {
			id: randomUUID(),
			name: input.name,
			email: input.email,
			passwordHash: await bcrypt.hash(input.password, 10),
			role: input.role,
			isActive: true
		}
	});

	return { id: user.id, name: user.name, email: user.email, role: user.role, isActive: user.isActive, createdAt: user.createdAt };
}

export async function listUsers(input: { q?: string; role?: Role; page: number; pageSize: number }) {
	const where = {
		AND: [
			input.role ? { role: input.role } : {},
			input.q
				? {
					OR: [
						{ email: { contains: input.q, mode: 'insensitive' as const } },
						{ name: { contains: input.q, mode: 'insensitive' as const } }
					]
				}
				: {}
		]
	};

	const [total, items] = await Promise.all([
		prisma.user.count({ where }),
		prisma.user.findMany({
			where,
			orderBy: { createdAt: 'desc' },
			skip: (input.page - 1) * input.pageSize,
			take: input.pageSize,
			select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true }
		})
	]);

	return { items, page: input.page, pageSize: input.pageSize, total };
}
