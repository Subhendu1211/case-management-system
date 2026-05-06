import { randomUUID } from 'crypto';
import { prisma } from '../db/prisma.js';
import type { AuthUser } from '../middleware/rbac.js';
import { HttpError } from '../utils/httpError.js';
import { getCase, updateCaseStatusWithClient } from './cases.service.js';

export type OrderSheetStatus =
	| 'DRAFT'
	| 'SUBMITTED'
	| 'REVISIONS_REQUESTED_BY_REGISTRAR'
	| 'FORWARDED_BY_REGISTRAR'
	| 'REVISIONS_REQUESTED_BY_COMMISSIONER'
	| 'APPROVED_BY_COMMISSIONER'
	| 'CANCELLED';

function canEditOrderSheet(status: OrderSheetStatus) {
	return (
		status === 'DRAFT' ||
		status === 'REVISIONS_REQUESTED_BY_REGISTRAR' ||
		status === 'REVISIONS_REQUESTED_BY_COMMISSIONER'
	);
}

export async function listOrderSheets(caseYear: number, caseId: string, user: AuthUser) {
	await getCase(caseYear, caseId, user);
	return prisma.orderSheet.findMany({
		where: { caseYear, caseId },
		orderBy: { createdAt: 'desc' },
		include: {
			preparedBy: { select: { id: true, name: true, role: true, email: true } },
			reviewHistory: { orderBy: { createdAt: 'desc' }, include: { actor: { select: { id: true, name: true, role: true } } } }
		}
	});
}

export async function createOrderSheet(
	caseYear: number,
	caseId: string,
	input: { title: string; body: string },
	user: AuthUser
) {
	if (!(user.role === 'LEGAL_ASSISTANT' || user.role === 'REGISTRAR' || user.role === 'ADMIN')) throw new HttpError(403, 'Forbidden');

	const c = await getCase(caseYear, caseId, user);

	return prisma.$transaction(async (tx) => {
		const created = await tx.orderSheet.create({
			data: {
				id: randomUUID(),
				caseYear,
				caseId,
				title: input.title,
				body: input.body,
				status: 'DRAFT',
				preparedById: user.id
			},
			include: { preparedBy: { select: { id: true, name: true, role: true } }, reviewHistory: true }
		});

		await tx.orderSheetReviewHistory.create({
			data: {
				id: randomUUID(),
				orderSheetId: created.id,
				action: 'CREATED',
				remarks: null,
				actorId: user.id
			}
		});

		// Move case to ORDER_SHEET_DRAFTED if applicable
		if (c.status === 'REGISTERED' || c.status === 'CLOSED') {
			await updateCaseStatusWithClient(tx, caseYear, caseId, { newStatus: 'ORDER_SHEET_DRAFTED', remarks: 'Order sheet draft created' }, user);
		}

		return created;
	});
}

export async function updateOrderSheet(orderSheetId: string, input: { title?: string; body?: string }, user: AuthUser) {
	const existing = await prisma.orderSheet.findUnique({
		where: { id: orderSheetId },
		include: {
			preparedBy: {
				select: {
					role: true
				}
			}
		}
	});
	if (!existing) throw new HttpError(404, 'Order sheet not found');

	await getCase(existing.caseYear, existing.caseId, user);

	const status = existing.status as OrderSheetStatus;
	const canRegistrarEditLegalPreparedSubmitted =
		user.role === 'REGISTRAR' &&
		existing.preparedBy?.role === 'LEGAL_ASSISTANT' &&
		status === 'SUBMITTED';

	if (!canEditOrderSheet(status) && !canRegistrarEditLegalPreparedSubmitted) {
		throw new HttpError(409, `Order sheet is not editable in status ${existing.status}`);
	}
	if (!(user.role === 'ADMIN' || existing.preparedById === user.id || canRegistrarEditLegalPreparedSubmitted)) {
		throw new HttpError(403, 'Forbidden');
	}

	const updated = await prisma.orderSheet.update({
		where: { id: orderSheetId },
		data: {
			title: input.title ?? undefined,
			body: input.body ?? undefined
		}
	});

	await prisma.orderSheetReviewHistory.create({
		data: {
			id: randomUUID(),
			orderSheetId: orderSheetId,
			action: 'UPDATED',
			remarks: null,
			actorId: user.id
		}
	});

	return updated;
}

export async function submitToRegistrar(orderSheetId: string, input: { remarks?: string }, user: AuthUser) {
	const existing = await prisma.orderSheet.findUnique({ where: { id: orderSheetId } });
	if (!existing) throw new HttpError(404, 'Order sheet not found');
	await getCase(existing.caseYear, existing.caseId, user);

	if (!(user.role === 'LEGAL_ASSISTANT' || user.role === 'REGISTRAR' || user.role === 'ADMIN')) throw new HttpError(403, 'Forbidden');
	if (existing.status !== 'DRAFT' && existing.status !== 'REVISIONS_REQUESTED_BY_REGISTRAR' && existing.status !== 'REVISIONS_REQUESTED_BY_COMMISSIONER') {
		throw new HttpError(409, `Cannot submit order sheet from status ${existing.status}`);
	}
	if (!(user.role === 'ADMIN' || existing.preparedById === user.id)) throw new HttpError(403, 'Forbidden');

	return prisma.$transaction(async (tx) => {
		const updated = await tx.orderSheet.update({ where: { id: orderSheetId }, data: { status: 'SUBMITTED' } });
		await tx.orderSheetReviewHistory.create({
			data: {
				id: randomUUID(),
				orderSheetId,
				action: 'SUBMITTED_TO_REGISTRAR',
				remarks: input.remarks ?? null,
				actorId: user.id
			}
		});

		await updateCaseStatusWithClient(tx, existing.caseYear, existing.caseId, { newStatus: 'REGISTRAR_REVIEW', remarks: input.remarks ?? 'Submitted to registrar' }, user);
		return updated;
	});
}

export async function registrarForward(orderSheetId: string, input: { remarks?: string }, user: AuthUser) {
	if (!(user.role === 'REGISTRAR' || user.role === 'ADMIN')) throw new HttpError(403, 'Forbidden');

	const existing = await prisma.orderSheet.findUnique({ where: { id: orderSheetId } });
	if (!existing) throw new HttpError(404, 'Order sheet not found');
	await getCase(existing.caseYear, existing.caseId, user);

	if (existing.status !== 'SUBMITTED') throw new HttpError(409, `Cannot forward from status ${existing.status}`);

	return prisma.$transaction(async (tx) => {
		const updated = await tx.orderSheet.update({ where: { id: orderSheetId }, data: { status: 'FORWARDED_BY_REGISTRAR' } });
		await tx.orderSheetReviewHistory.create({
			data: {
				id: randomUUID(),
				orderSheetId,
				action: 'FORWARDED_TO_COMMISSIONER',
				remarks: input.remarks ?? null,
				actorId: user.id
			}
		});

		await updateCaseStatusWithClient(tx, existing.caseYear, existing.caseId, { newStatus: 'PA_TO_COMMISSIONER', remarks: input.remarks ?? 'Forwarded to Commissioner via PA' }, user);
		return updated;
	});
}

export async function registrarRequestRevision(orderSheetId: string, input: { remarks?: string }, user: AuthUser) {
	if (!(user.role === 'REGISTRAR' || user.role === 'ADMIN')) throw new HttpError(403, 'Forbidden');

	const existing = await prisma.orderSheet.findUnique({ where: { id: orderSheetId } });
	if (!existing) throw new HttpError(404, 'Order sheet not found');
	await getCase(existing.caseYear, existing.caseId, user);

	if (existing.status !== 'SUBMITTED') throw new HttpError(409, `Cannot request revision from status ${existing.status}`);

	return prisma.$transaction(async (tx) => {
		const updated = await tx.orderSheet.update({ where: { id: orderSheetId }, data: { status: 'REVISIONS_REQUESTED_BY_REGISTRAR' } });
		await tx.orderSheetReviewHistory.create({
			data: {
				id: randomUUID(),
				orderSheetId,
				action: 'REVISION_REQUESTED_BY_REGISTRAR',
				remarks: input.remarks ?? null,
				actorId: user.id
			}
		});

		await updateCaseStatusWithClient(tx, existing.caseYear, existing.caseId, { newStatus: 'ORDER_SHEET_DRAFTED', remarks: input.remarks ?? 'Revision requested by registrar' }, user);
		return updated;
	});
}

export async function commissionerApprove(orderSheetId: string, input: { remarks?: string }, user: AuthUser) {
	if (!(user.role === 'COMMISSIONER' || user.role === 'ADMIN')) throw new HttpError(403, 'Forbidden');

	const existing = await prisma.orderSheet.findUnique({ where: { id: orderSheetId } });
	if (!existing) throw new HttpError(404, 'Order sheet not found');
	await getCase(existing.caseYear, existing.caseId, user);

	if (existing.status !== 'FORWARDED_BY_REGISTRAR') throw new HttpError(409, `Cannot approve from status ${existing.status}`);

	return prisma.$transaction(async (tx) => {
		const updated = await tx.orderSheet.update({ where: { id: orderSheetId }, data: { status: 'APPROVED_BY_COMMISSIONER' } });
		await tx.orderSheetReviewHistory.create({
			data: {
				id: randomUUID(),
				orderSheetId,
				action: 'APPROVED_BY_COMMISSIONER',
				remarks: input.remarks ?? null,
				actorId: user.id
			}
		});

		await updateCaseStatusWithClient(tx, existing.caseYear, existing.caseId, { newStatus: 'APPROVED', remarks: input.remarks ?? 'Approved by commissioner' }, user);
		return updated;
	});
}

export async function commissionerRequestRevision(orderSheetId: string, input: { remarks?: string }, user: AuthUser) {
	if (!(user.role === 'COMMISSIONER' || user.role === 'ADMIN')) throw new HttpError(403, 'Forbidden');

	const existing = await prisma.orderSheet.findUnique({ where: { id: orderSheetId } });
	if (!existing) throw new HttpError(404, 'Order sheet not found');
	await getCase(existing.caseYear, existing.caseId, user);

	if (existing.status !== 'FORWARDED_BY_REGISTRAR') throw new HttpError(409, `Cannot request revision from status ${existing.status}`);

	return prisma.$transaction(async (tx) => {
		const updated = await tx.orderSheet.update({ where: { id: orderSheetId }, data: { status: 'REVISIONS_REQUESTED_BY_COMMISSIONER' } });
		await tx.orderSheetReviewHistory.create({
			data: {
				id: randomUUID(),
				orderSheetId,
				action: 'REVISION_REQUESTED_BY_COMMISSIONER',
				remarks: input.remarks ?? null,
				actorId: user.id
			}
		});

		await updateCaseStatusWithClient(tx, existing.caseYear, existing.caseId, { newStatus: 'ORDER_SHEET_DRAFTED', remarks: input.remarks ?? 'Revision requested by commissioner' }, user);
		return updated;
	});
}
