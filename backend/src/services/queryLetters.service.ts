import { randomUUID } from 'crypto';
import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '../db/prisma.js';
import type { AuthUser } from '../middleware/rbac.js';
import { HttpError } from '../utils/httpError.js';
import { getCase, updateCaseStatusWithClient } from './cases.service.js';
import { resolveUploadDirAbs, storageKeyFor } from '../utils/uploadSecurity.js';

export async function listQueryLetters(caseYear: number, caseId: string, user: AuthUser) {
	await getCase(caseYear, caseId, user);
	return prisma.queryLetter.findMany({
		where: { caseYear, caseId },
		orderBy: { createdAt: 'desc' },
		include: { createdBy: { select: { id: true, name: true, role: true, email: true } } }
	});
}

export async function createQueryLetter(
	caseYear: number,
	caseId: string,
	input: { recipientType: 'complainant' | 'accused'; channel: any; subject: string; body?: string },
	user: AuthUser
) {
	if (!(user.role === 'LEGAL_ASSISTANT' || user.role === 'ADMIN')) throw new HttpError(403, 'Forbidden');
	const c = await getCase(caseYear, caseId, user);
	if (c.sectionAssigned !== 'LEGAL' && user.role !== 'ADMIN') {
		throw new HttpError(409, 'Case must be in Legal section to send a query letter');
	}

	return prisma.$transaction(async (tx) => {
		const created = await tx.queryLetter.create({
			data: {
				id: randomUUID(),
				caseYear,
				caseId,
				recipientType: input.recipientType,
				channel: input.channel,
				subject: input.subject,
				body: input.body ?? '',
				createdById: user.id
			},
			include: { createdBy: { select: { id: true, name: true, role: true, email: true } } }
		});

		const fileName = `query-letter-${created.id}.txt`;
		const baseDir = path.resolve(resolveUploadDirAbs(), 'cases', String(caseYear), caseId);
		fs.mkdirSync(baseDir, { recursive: true });
		const filePath = path.join(baseDir, fileName);
		const bodyText = input.body ?? '';
		const content = `Subject: ${input.subject}\nRecipient: ${input.recipientType}\nChannel: ${String(input.channel)}\n\n${bodyText}`.trim() + '\n';
		fs.writeFileSync(filePath, content, 'utf8');
		const storageKey = storageKeyFor(filePath);

		await tx.document.create({
			data: {
				id: randomUUID(),
				caseYear,
				caseId,
				kind: 'OTHER',
				fileName,
				mimeType: 'text/plain',
				storageKey,
				sizeBytes: Buffer.byteLength(content),
				uploadedById: user.id
			}
		});

		if (c.status !== 'PENDING_QUERY') {
			await updateCaseStatusWithClient(tx, caseYear, caseId, { newStatus: 'PENDING_QUERY', remarks: 'Query sent to party' }, user);
		}

		return created;
	});
}

export async function dispatchQueryLetter(
	caseYear: number,
	caseId: string,
	queryLetterId: string,
	user: AuthUser
) {
	if (!(user.role === 'STATIONERY' || user.role === 'LEGAL_ASSISTANT' || user.role === 'ADMIN')) throw new HttpError(403, 'Forbidden');
	await getCase(caseYear, caseId, user);

	const letter = await prisma.queryLetter.findUnique({ where: { id: queryLetterId } });
	if (!letter) throw new HttpError(404, 'Query letter not found');
	if (letter.caseYear !== caseYear || letter.caseId !== caseId) throw new HttpError(400, 'Query letter does not belong to case');

	const doc = await prisma.document.findFirst({
		where: {
			caseYear,
			caseId,
			fileName: `query-letter-${queryLetterId}.txt`
		}
	});

	return prisma.$transaction(async (tx) => {
		const dispatch = await tx.caseDispatch.create({
			data: {
				dispatchedAt: new Date(),
				id: randomUUID(),
				caseYear,
				caseId,
				type: 'OUTWARD',
				channel: letter.channel,
				addressTo: letter.recipientType,
				trackingNo: null,
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
				kind: 'QUERY_DISPATCH',
				recipient: letter.recipientType,
				channel: String(letter.channel),
				subject: letter.subject,
				body: letter.body,
				referenceId: doc?.id ?? letter.id,
				createdById: user.id
			}
		});

		return dispatch;
	});
}

export async function listIssueRegister(caseYear: number, caseId: string, user: AuthUser) {
	if (user.role === 'CITIZEN') throw new HttpError(403, 'Forbidden');
	await getCase(caseYear, caseId, user);
	const entries = await prisma.issueRegister.findMany({
		where: { caseYear, caseId },
		orderBy: { createdAt: 'desc' },
		include: { createdBy: { select: { id: true, name: true, role: true, email: true } } }
	});
	if (!entries.length) return entries;

	const refIds = entries.map((e) => e.referenceId).filter(Boolean) as string[];
	const queryFileNames = entries
		.filter((e) => e.kind === 'QUERY_DISPATCH' && e.referenceId)
		.map((e) => `query-letter-${e.referenceId}.txt`);

	const documents = await prisma.document.findMany({
		where: {
			caseYear,
			caseId,
			OR: [
				refIds.length ? { id: { in: refIds } } : undefined,
				queryFileNames.length ? { fileName: { in: queryFileNames } } : undefined
			].filter(Boolean) as any
		}
	});

	const docById = new Map(documents.map((d) => [d.id, d]));
	const docByFile = new Map(documents.map((d) => [d.fileName, d]));

	return entries.map((entry) => {
		let doc = entry.referenceId ? docById.get(entry.referenceId) : undefined;
		if (!doc && entry.kind === 'QUERY_DISPATCH' && entry.referenceId) {
			doc = docByFile.get(`query-letter-${entry.referenceId}.txt`);
		}
		return {
			...entry,
			downloadUrl: doc ? `/api/v1/cases/${caseYear}/${caseId}/documents/${doc.id}/download` : undefined
		};
	});
}
