import { randomUUID } from 'crypto';
import { prisma } from '../db/prisma.js';
import type { AuthUser } from '../middleware/rbac.js';
import { HttpError } from '../utils/httpError.js';
import { getCase, updateCaseStatusWithClient } from './cases.service.js';

export type DispatchStatus = 'DISPATCHED' | 'RECEIVED';

export async function listCaseDispatches(caseYear: number, caseId: string, user: AuthUser) {
	await getCase(caseYear, caseId, user);
	return prisma.caseDispatch.findMany({
		where: { caseYear, caseId },
		orderBy: { dispatchedAt: 'desc' }
	});
}

export async function createCaseDispatch(
	caseYear: number,
	caseId: string,
	input: { type: 'INWARD' | 'OUTWARD'; channel: 'BY_HAND' | 'POST' | 'COURIER' | 'EMAIL'; addressTo?: string; trackingNo?: string },
	user: AuthUser
) {
	if (!(user.role === 'STATIONERY' || user.role === 'COMPUTER_ASSISTANT' || user.role === 'ADMIN')) throw new HttpError(403, 'Forbidden');

	const c = await getCase(caseYear, caseId, user);
	if (c.status !== 'DISPATCH_PENDING') throw new HttpError(409, `Case must be in DISPATCH_PENDING to dispatch (current: ${c.status})`);

	return prisma.$transaction(async (tx) => {
		const created = await tx.caseDispatch.create({
			data: {
				dispatchedAt: new Date(),
				id: randomUUID(),
				caseYear,
				caseId,
				type: input.type,
				channel: input.channel,
				addressTo: input.addressTo ?? null,
				trackingNo: input.trackingNo ?? null,
				receivedAt: null,
				status: 'DISPATCHED',
				createdAt: new Date()
			}
		});

		await tx.issueRegister.create({
			data: {
				id: randomUUID(),
				caseYear,
				caseId,
				kind: 'DISPATCH',
				recipient: input.addressTo ?? null,
				channel: String(input.channel),
				subject: null,
				body: null,
				referenceId: created.id,
				createdById: user.id
			}
		});

		await updateCaseStatusWithClient(tx, caseYear, caseId, { newStatus: 'DISPATCHED', remarks: 'Dispatch created and case marked as dispatched' }, user);

		return created;
	});
}

async function findDispatchById(dispatchId: string) {
	// `case_dispatch` uses a composite PK (dispatched_at, id). We treat `id` as globally unique.
	return prisma.caseDispatch.findFirst({
		where: { id: dispatchId },
		orderBy: { dispatchedAt: 'desc' }
	});
}

export async function updateDispatchDelivery(
	dispatchId: string,
	input: { channel?: 'BY_HAND' | 'POST' | 'COURIER' | 'EMAIL'; addressTo?: string; trackingNo?: string },
	user: AuthUser
) {
	if (!(user.role === 'STATIONERY' || user.role === 'COMPUTER_ASSISTANT' || user.role === 'ADMIN')) throw new HttpError(403, 'Forbidden');

	const existing = await findDispatchById(dispatchId);
	if (!existing) throw new HttpError(404, 'Dispatch not found');
	await getCase(existing.caseYear, existing.caseId, user);

	if (existing.status === 'RECEIVED') throw new HttpError(409, 'Cannot update delivery after received');

	return prisma.caseDispatch.update({
		where: { dispatchedAt_id: { dispatchedAt: existing.dispatchedAt, id: existing.id } },
		data: {
			channel: input.channel ?? undefined,
			addressTo: input.addressTo ?? undefined,
			trackingNo: input.trackingNo ?? undefined
		}
	});
}

export async function markDispatchReceived(dispatchId: string, _input: { remarks?: string }, user: AuthUser) {
	if (!(user.role === 'STATIONERY' || user.role === 'COMPUTER_ASSISTANT' || user.role === 'ADMIN')) throw new HttpError(403, 'Forbidden');

	const existing = await findDispatchById(dispatchId);
	if (!existing) throw new HttpError(404, 'Dispatch not found');
	await getCase(existing.caseYear, existing.caseId, user);

	if (existing.status === 'RECEIVED') throw new HttpError(409, 'Already marked as received');

	return prisma.caseDispatch.update({
		where: { dispatchedAt_id: { dispatchedAt: existing.dispatchedAt, id: existing.id } },
		data: {
			receivedAt: new Date(),
			status: 'RECEIVED'
		}
	});
}
