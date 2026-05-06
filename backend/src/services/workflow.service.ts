import { prisma } from '../db/prisma.js';
import { HttpError } from '../utils/httpError.js';
import type { AuthUser } from '../middleware/rbac.js';
import type { CaseStatus } from '@prisma/client';

export async function assertWorkflowTransitionAllowed(input: {
	fromStatus: CaseStatus;
	toStatus: CaseStatus;
	user: AuthUser;
}) {
	// privileged bypass (keeps the system operable during setup)
	if (input.user.role === 'ADMIN' || input.user.role === 'PROGRAMMER') return;

	const exact = await prisma.workflowTransition.findFirst({
		where: {
			fromStatus: input.fromStatus,
			toStatus: input.toStatus
		}
	});
	const fallback =
		exact ??
		(await prisma.workflowTransition.findFirst({
			where: {
				fromStatus: null,
				toStatus: input.toStatus
			}
		}));

	if (!fallback) throw new HttpError(400, `Invalid status transition: ${input.fromStatus} -> ${input.toStatus}`);

	if (!fallback.allowedRoles?.includes(input.user.role)) {
		throw new HttpError(403, `Role ${input.user.role} cannot transition: ${input.fromStatus} -> ${input.toStatus}`);
	}
}

export async function listAllowedWorkflowTransitions(input: {
	fromStatus: CaseStatus;
	user: AuthUser;
}) {
	// privileged bypass: allow all defined transitions from this status
	if (input.user.role === 'ADMIN' || input.user.role === 'PROGRAMMER') {
		return await prisma.workflowTransition.findMany({
			where: { fromStatus: input.fromStatus },
			orderBy: [{ toStatus: 'asc' }]
		});
	}

	return await prisma.workflowTransition.findMany({
		where: {
			fromStatus: input.fromStatus,
			allowedRoles: { has: input.user.role }
		},
		orderBy: [{ toStatus: 'asc' }]
	});
}
