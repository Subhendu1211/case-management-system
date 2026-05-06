import { randomUUID } from 'crypto';
import { prisma } from '../db/prisma.js';
import type { AuthUser } from '../middleware/rbac.js';
import { HttpError } from '../utils/httpError.js';
import { getCase, updateCaseStatusWithClient } from './cases.service.js';

export type ForwardingLetterStatus = 'DRAFT' | 'PENDING_SIGNATURE' | 'SIGNED' | 'CANCELLED';

export async function listForwardingLetters(caseYear: number, caseId: string, user: AuthUser) {
	await getCase(caseYear, caseId, user);
	return prisma.forwardingLetter.findMany({
		where: { caseYear, caseId },
		orderBy: { createdAt: 'desc' },
		include: {
			preparedBy: { select: { id: true, name: true, role: true, email: true } },
			signedBy: { select: { id: true, name: true, role: true, email: true } }
		}
	});
}

export async function createForwardingLetter(
	caseYear: number,
	caseId: string,
	input: { subject: string; body: string },
	user: AuthUser
) {
	if (!(user.role === 'REGISTRAR' || user.role === 'PRIVATE_SECRETARY' || user.role === 'LEGAL_ASSISTANT' || user.role === 'PROGRAMMER' || user.role === 'ADMIN')) {
		throw new HttpError(403, 'Forbidden');
	}
	const c = await getCase(caseYear, caseId, user);
	if (c.status !== 'APPROVED' && c.status !== 'LEGAL_FORWARDING') {
		throw new HttpError(409, 'Forwarding letters can be created only after the case is approved');
	}

	return prisma.forwardingLetter.create({
		data: {
			id: randomUUID(),
			caseYear,
			caseId,
			subject: input.subject,
			body: input.body,
			status: 'DRAFT',
			preparedById: user.id
		},
		include: {
			preparedBy: { select: { id: true, name: true, role: true } },
			signedBy: { select: { id: true, name: true, role: true } }
		}
	}).then(async (created) => {
		await prisma.issueRegister.create({
			data: {
				id: randomUUID(),
				caseYear,
				caseId,
				kind: 'FORWARDING_LETTER',
				recipient: null,
				channel: null,
				subject: input.subject,
				body: input.body,
				referenceId: created.id,
				createdById: user.id
			}
		});
		return created;
	});
}

export async function updateForwardingLetter(letterId: string, input: { subject?: string; body?: string }, user: AuthUser) {
	const existing = await prisma.forwardingLetter.findUnique({ where: { id: letterId } });
	if (!existing) throw new HttpError(404, 'Forwarding letter not found');
	await getCase(existing.caseYear, existing.caseId, user);

	if (existing.status !== 'DRAFT' && existing.status !== 'PENDING_SIGNATURE') {
		throw new HttpError(409, `Forwarding letter is not editable in status ${existing.status}`);
	}
	if (!(user.role === 'ADMIN' || user.role === 'REGISTRAR')) throw new HttpError(403, 'Forbidden');

	return prisma.forwardingLetter.update({
		where: { id: letterId },
		data: {
			subject: input.subject ?? undefined,
			body: input.body ?? undefined
		}
	});
}

export async function submitForSignature(letterId: string, input: { remarks?: string }, user: AuthUser) {
	const existing = await prisma.forwardingLetter.findUnique({ where: { id: letterId } });
	if (!existing) throw new HttpError(404, 'Forwarding letter not found');
	await getCase(existing.caseYear, existing.caseId, user);

	if (!(user.role === 'ADMIN' || existing.preparedById === user.id)) throw new HttpError(403, 'Forbidden');
	if (existing.status !== 'DRAFT') throw new HttpError(409, `Cannot submit from status ${existing.status}`);

	return prisma.forwardingLetter.update({
		where: { id: letterId },
		data: { status: 'PENDING_SIGNATURE' }
	});
}

export async function signForwardingLetter(letterId: string, input: { remarks?: string }, user: AuthUser) {
	if (!(user.role === 'REGISTRAR' || user.role === 'ADMIN')) throw new HttpError(403, 'Forbidden');

	const existing = await prisma.forwardingLetter.findUnique({ where: { id: letterId } });
	if (!existing) throw new HttpError(404, 'Forwarding letter not found');
	const c = await getCase(existing.caseYear, existing.caseId, user);

	if (existing.status !== 'PENDING_SIGNATURE') throw new HttpError(409, `Cannot sign from status ${existing.status}`);
	if (c.status !== 'REGISTRAR_SIGNING' && user.role !== 'ADMIN') {
		throw new HttpError(409, `Case must be in REGISTRAR_SIGNING before signing (current: ${c.status})`);
	}

	// Atomically mark the letter as SIGNED and move the case to PS step for letter-number assignment.
	return prisma.$transaction(async (tx) => {
		const updated = await tx.forwardingLetter.update({
			where: { id: letterId },
			data: {
				status: 'SIGNED',
				signedById: user.id,
				signedAt: new Date()
			}
		});

		// Transition to FORWARDING_STATIONERY (PS assigns letter number before Stationery dispatch).
		await updateCaseStatusWithClient(tx, existing.caseYear, existing.caseId, { newStatus: 'FORWARDING_STATIONERY', remarks: 'Forwarding letter signed by Registrar' }, user as any);

		return updated;
	});
}
