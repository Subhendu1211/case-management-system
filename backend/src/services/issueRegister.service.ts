import { prisma } from '../db/prisma.js';
import type { AuthUser } from '../middleware/rbac.js';
import { HttpError } from '../utils/httpError.js';

export async function listIssueRegisterAll(input: {
	page: number;
	pageSize: number;
	q?: string;
	caseYear?: number;
	kind?: string;
	user: AuthUser;
}) {
	if (input.user.role === 'CITIZEN') {
		throw new HttpError(403, 'Forbidden');
	}
	const where: any = {
		AND: [
			input.caseYear ? { caseYear: input.caseYear } : {},
			input.kind ? { kind: { equals: input.kind, mode: 'insensitive' } } : {},
			input.q
				? {
					OR: [
						{ subject: { contains: input.q, mode: 'insensitive' } },
						{ recipient: { contains: input.q, mode: 'insensitive' } },
						{ body: { contains: input.q, mode: 'insensitive' } },
						{ case: { registrationNo: { contains: input.q, mode: 'insensitive' } } },
						{ case: { subject: { contains: input.q, mode: 'insensitive' } } }
					]
				}
				: {}
		]
	};

	const [total, items] = await Promise.all([
		prisma.issueRegister.count({ where }),
		prisma.issueRegister.findMany({
			where,
			orderBy: { createdAt: 'desc' },
			skip: (input.page - 1) * input.pageSize,
			take: input.pageSize,
			include: {
				createdBy: { select: { id: true, name: true, role: true, email: true } },
				case: { select: { caseYear: true, id: true, registrationNo: true, subject: true, status: true, sectionAssigned: true } }
			}
		})
	]);

	if (!items.length) return { items, page: input.page, pageSize: input.pageSize, total };

	const refIds = items.map((e) => e.referenceId).filter(Boolean) as string[];
	const documents = await prisma.document.findMany({
		where: {
			caseYear: { in: items.map((e) => e.caseYear) },
			caseId: { in: items.map((e) => e.caseId) },
			id: { in: refIds }
		}
	});
	const docById = new Map(documents.map((d) => [d.id, d]));

	const mapped = items.map((entry) => {
		const doc = entry.referenceId ? docById.get(entry.referenceId) : undefined;
		return {
			...entry,
			downloadUrl: doc ? `/api/v1/cases/${entry.caseYear}/${entry.caseId}/documents/${doc.id}/download` : undefined
		};
	});

	return { items: mapped, page: input.page, pageSize: input.pageSize, total };
}
