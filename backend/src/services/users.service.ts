import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { prisma } from '../db/prisma.js';
import type { Role } from '../middleware/rbac.js';
import type { CreateUserInput } from '../schemas/user.schemas.js';
import { HttpError } from '../utils/httpError.js';
import { validatePasswordPolicy } from '../utils/passwordPolicy.js';

export async function createUser(input: CreateUserInput) {
	const passwordPolicyError = validatePasswordPolicy(input.password);
	if (passwordPolicyError) throw new HttpError(400, passwordPolicyError);

	const [existingEmail, existingMobile] = await Promise.all([
		prisma.user.findUnique({ where: { email: input.email }, select: { id: true } }),
		prisma.user.findUnique({ where: { mobile: input.mobile }, select: { id: true } })
	]);
	if (existingEmail) throw new HttpError(409, 'Email already exists');
	if (existingMobile) throw new HttpError(409, 'Mobile number already exists');

	const user = await prisma.user.create({
		data: {
			id: randomUUID(),
			name: input.name,
			email: input.email,
			mobile: input.mobile,
			passwordHash: await bcrypt.hash(input.password, 10),
			role: input.role,
			isActive: true
		}
	});

	return {
		id: user.id,
		name: user.name,
		email: user.email,
		mobile: user.mobile,
		role: user.role,
		isActive: user.isActive,
		createdAt: user.createdAt
	};
}

export async function listUsers(input: { q?: string; role?: Role; page: number; pageSize: number }) {
	const where = {
		AND: [
			input.role ? { role: input.role } : {},
			input.q
				? {
					OR: [
						{ email: { contains: input.q, mode: 'insensitive' as const } },
						{ name: { contains: input.q, mode: 'insensitive' as const } },
						{ mobile: { contains: input.q } }
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
			select: { id: true, name: true, email: true, mobile: true, role: true, isActive: true, createdAt: true }
		})
	]);

	return { items, page: input.page, pageSize: input.pageSize, total };
}
