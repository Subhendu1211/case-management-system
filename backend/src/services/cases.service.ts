import { prisma } from '../db/prisma.js';
import { randomUUID } from 'crypto';
import { HttpError } from '../utils/httpError.js';
import type { AuthUser } from '../middleware/rbac.js';
import { assertWorkflowTransitionAllowed } from './workflow.service.js';
import type { CaseStatus, Prisma, PrismaClient } from '@prisma/client';

type DbClient = PrismaClient | Prisma.TransactionClient;

export async function createCase(input: {
	caseYear: number;
	registrationNo: string;
	complainantName: string;
	subject: string;
	sectionAssigned: 'LEGAL' | 'OE' | 'REGISTRAR' | 'STATIONERY' | 'COMMISSIONER' | 'PROGRAMMER';
	createdBy: AuthUser;
}) {
	const existing = await prisma.case.findFirst({ where: { caseYear: input.caseYear, registrationNo: input.registrationNo } });
	if (existing) throw new HttpError(409, 'registrationNo already exists for year');

	const created = await prisma.case.create({
		data: {
			caseYear: input.caseYear,
			id: randomUUID(),
			registrationNo: input.registrationNo,
			complainantName: input.complainantName,
			subject: input.subject,
			sectionAssigned: input.sectionAssigned,
			status: 'DIARY_ENTERED'
		}
	});

	await prisma.caseStatusHistory.create({
		data: {
			id: randomUUID(),
			caseYear: created.caseYear,
			caseId: created.id,
			oldStatus: 'DRAFT',
			newStatus: created.status,
			changedById: input.createdBy.id,
			remarks: 'Case created'
		}
	});

	return created;
}

export async function listCases(input: {
	q?: string;
	status?: any;
	sectionAssigned?: any;
	assignedTo?: string;
	caseYear?: number;
	view?: 'processing_house';
	page: number;
	pageSize: number;
	user: AuthUser;
}) {
	const role = input.user.role;
	const processingHouseNonWorkingStatuses: CaseStatus[] = ['CLOSED', 'DISPATCHED', 'PENDING_QUERY'];
	const registrarDraftWorkStatuses: CaseStatus[] = ['REGISTERED', 'ORDER_SHEET_DRAFTED'];

	const citizenScope =
		role === 'CITIZEN'
			? {
				complaints: {
					some: { createdById: input.user.id }
				}
			}
			: {};

	// basic access scoping (can be expanded):
	// - ADMIN/PRIVATE_SECRETARY/COMMISSIONER see all
	// - PROGRAMMER sees cases assigned to them or in PROGRAMMER section
	// - others see their section, or cases assigned to them
	const accessScope =
		role === 'ADMIN' || role === 'PRIVATE_SECRETARY' || role === 'COMMISSIONER' || role === 'PRIVATE_ASSISTANT'
			? {}
			: role === 'PROGRAMMER'
				? {
					OR: [{ assignedToId: input.user.id }, { sectionAssigned: mapRoleToSection(role) }, { status: 'CLOSED' }, { status: 'DISPATCHED' }]
				}
				: role === 'CITIZEN'
					? citizenScope
				: role === 'REGISTRAR'
						? {
							OR: [
								{ assignedToId: input.user.id },
								{ sectionAssigned: mapRoleToSection(role) },
								{ status: { in: registrarDraftWorkStatuses } },
								{ forwardingLetters: { some: { status: 'PENDING_SIGNATURE' } } },
								{ status: 'CLOSED' },
								{ status: 'DISPATCHED' }
							]
						}
						: {
							OR: [{ assignedToId: input.user.id }, { sectionAssigned: mapRoleToSection(role) }, { status: 'CLOSED' }, { status: 'DISPATCHED' }]
						};

	// 1. Define the base "work scope" for the user's role (what they are currently working on)
	let workScope: any;
	if (role === 'ADMIN' || role === 'PRIVATE_SECRETARY' || role === 'COMMISSIONER' || role === 'PRIVATE_ASSISTANT') {
		workScope = {}; // Admins see everything
	} else if (role === 'REGISTRAR') {
		workScope = {
			OR: [
				{ assignedToId: input.user.id },
				{ sectionAssigned: 'REGISTRAR' },
				{ status: { in: registrarDraftWorkStatuses } },
				{ forwardingLetters: { some: { status: 'PENDING_SIGNATURE' } } }
			]
		};
	} else {
		workScope = {
			OR: [{ assignedToId: input.user.id }, { sectionAssigned: mapRoleToSection(role) }]
		};
	}

	const where: any = {
		AND: [
			input.view === 'processing_house'
				? { AND: [workScope, { status: { notIn: processingHouseNonWorkingStatuses } }] }
				: accessScope,
			input.status ? { status: input.status } : {},
			input.sectionAssigned ? { sectionAssigned: input.sectionAssigned } : {},
			input.assignedTo ? { assignedToId: input.assignedTo } : {},
			input.caseYear ? { caseYear: input.caseYear } : {},
			input.q
				? {
					OR: [
						{ registrationNo: { contains: input.q, mode: 'insensitive' } },
						{ caseNo: { contains: input.q, mode: 'insensitive' } },
						{ complainantName: { contains: input.q, mode: 'insensitive' } }
					]
				}
				: {}
		]
	};

	const [total, items] = await Promise.all([
		prisma.case.count({ where }),
		prisma.case.findMany({
			where,
			orderBy: { createdAt: 'desc' },
			skip: (input.page - 1) * input.pageSize,
			take: input.pageSize
		})
	]);

	return { items, page: input.page, pageSize: input.pageSize, total };
}

export async function getCase(caseYear: number, caseId: string, user: AuthUser) {
	const item = await prisma.case.findUnique({
		where: { caseYear_id: { caseYear, id: caseId } },
		include: {
			statusHistory: {
				orderBy: { changedAt: 'asc' },
				include: {
					changedBy: {
						select: {
							id: true,
							name: true,
							role: true
						}
					}
				}
			},
			orderSheets: { orderBy: { createdAt: 'desc' } },
			forwardingLetters: { orderBy: { createdAt: 'desc' } },
			documents: { orderBy: { createdAt: 'desc' } },
			dispatches: { orderBy: { dispatchedAt: 'desc' } },
			complaints: { orderBy: { createdAt: 'asc' } }
		}
	});
	if (!item) throw new HttpError(404, 'Case not found');

	const role = user.role;
	// Allow any staff to view dispatched or closed cases
	if (item.status === 'DISPATCHED' || item.status === 'CLOSED') {
		if (role !== 'CITIZEN') return item;
		const ownsComplaint = item.complaints.some((c) => c.createdById === user.id);
		if (ownsComplaint) return item;
		throw new HttpError(403, 'Forbidden');
	}

	if (role === 'REGISTRAR') {
		const registrarAllowed =
			item.assignedToId === user.id ||
			item.sectionAssigned === mapRoleToSection(role) ||
			item.status === 'REGISTERED' ||
			item.status === 'ORDER_SHEET_DRAFTED' ||
			item.forwardingLetters.some((letter) => letter.status === 'PENDING_SIGNATURE');
		if (!registrarAllowed) throw new HttpError(403, 'Forbidden');
		return item;
	}
	if (role === 'CITIZEN') {
		const ownsComplaint = item.complaints.some((c) => c.createdById === user.id);
		if (!ownsComplaint) throw new HttpError(403, 'Forbidden');
		return item;
	}
	if (!(role === 'ADMIN' || role === 'PRIVATE_SECRETARY' || role === 'COMMISSIONER' || role === 'PRIVATE_ASSISTANT')) {
		if (role === 'PROGRAMMER') {
			const section = mapRoleToSection(role);
			if (item.assignedToId !== user.id && item.sectionAssigned !== section) throw new HttpError(403, 'Forbidden');
			return item;
		}
		const section = mapRoleToSection(role);
		if (item.assignedToId !== user.id && item.sectionAssigned !== section) throw new HttpError(403, 'Forbidden');
	}

	return item;
}


export async function updateCaseStatusWithClient(
	client: DbClient,
	caseYear: number,
	caseId: string,
	input: { newStatus: any; remarks?: string },
	user: AuthUser
) {
	const current = await client.case.findUnique({ where: { caseYear_id: { caseYear, id: caseId } } });
	if (!current) throw new HttpError(404, 'Case not found');

	await assertWorkflowTransitionAllowed({
		fromStatus: current.status as CaseStatus,
		toStatus: input.newStatus as CaseStatus,
		user
	});

	// Ensure Commissioner only approves a case after an order sheet is approved
	if (
		input.newStatus === 'APPROVED' &&
		!(user.role === 'ADMIN' || user.role === 'PROGRAMMER')
	) {
		const approvedOrderSheet = await client.orderSheet.count({
			where: {
				caseYear,
				caseId,
				status: 'APPROVED_BY_COMMISSIONER'
			}
		});
		if (approvedOrderSheet === 0) {
			throw new HttpError(409, 'Case can be approved only after an order sheet is approved by the Commissioner');
		}
	}

	// Ensure draft status is only set after an order sheet exists
	if (input.newStatus === 'ORDER_SHEET_DRAFTED') {
		const existingOrderSheets = await client.orderSheet.count({
			where: {
				caseYear,
				caseId
			}
		});
		if (existingOrderSheets === 0) {
			throw new HttpError(409, 'Create an order sheet before marking the case as drafted');
		}
	}

	// Digital signatures are accepted for review transitions; image uploads are optional.

	// Auto-adjust section when routed to specific teams
	let sectionAssigned = current.sectionAssigned as any;
	switch (input.newStatus as CaseStatus) {
		case 'ROUTED_TO_LEGAL':
			sectionAssigned = 'COMMISSIONER'; // PA routes it
			break;
		case 'PA_INITIAL_REVIEW':
			sectionAssigned = 'COMMISSIONER';
			break;
		case 'PA_TO_COMMISSIONER':
			sectionAssigned = 'COMMISSIONER';
			break;
		case 'PA_POST_APPROVAL':
			sectionAssigned = 'COMMISSIONER';
			break;
		case 'REGISTRAR_INITIAL_REVIEW':
			sectionAssigned = 'REGISTRAR';
			break;
		case 'PROGRAMMER_REVIEW':
			sectionAssigned = 'PROGRAMMER';
			break;
		case 'STATIONERY_REVIEW':
			sectionAssigned = 'STATIONERY';
			break;
		case 'ROUTED_TO_OE':
			sectionAssigned = 'OE';
			break;
		case 'REGISTERED':
			sectionAssigned = 'LEGAL';
			break;
		case 'PENDING_QUERY':
			sectionAssigned = 'LEGAL';
			break;
		case 'REVIEW_DONE':
			sectionAssigned = 'COMMISSIONER';
			break;
		case 'CASE_ACCEPTED':
			sectionAssigned = 'COMMISSIONER';
			break;
		case 'PS_POST_ACCEPTANCE':
			sectionAssigned = 'COMMISSIONER'; // with PS
			break;
		case 'UNDER_REVIEW':
			sectionAssigned = 'COMMISSIONER';
			break;
		case 'REGISTRAR_REVIEW':
			sectionAssigned = 'REGISTRAR';
			break;
		case 'COMMISSIONER_APPROVAL':
			sectionAssigned = 'COMMISSIONER';
			break;
		case 'APPROVED':
			sectionAssigned = 'COMMISSIONER';
			break;
		case 'REGISTRAR_HANDOVER':
			sectionAssigned = 'REGISTRAR';
			break;
		case 'LEGAL_FORWARDING':
			sectionAssigned = 'PROGRAMMER';
			break;
		case 'FORWARDING_STATIONERY':
			sectionAssigned = 'COMMISSIONER'; // PS desk for letter number assignment
			break;
		case 'REGISTRAR_SIGNING':
			sectionAssigned = 'REGISTRAR';
			break;
		case 'ORDER_SHEET_DRAFTED':
			sectionAssigned = 'LEGAL';
			break;
		case 'DISPATCH_PENDING':
			sectionAssigned = 'STATIONERY';
			break;
		case 'CLOSED':
			// leave section as-is
			break;
		default:
			// no change
			break;
	}

	const updated = await client.case.update({
		where: { caseYear_id: { caseYear, id: caseId } },
		data: { status: input.newStatus, sectionAssigned }
	});

	await client.caseStatusHistory.create({
		data: {
			id: randomUUID(),
			caseYear,
			caseId,
			oldStatus: current.status,
			newStatus: input.newStatus,
			changedById: user.id,
			remarks: input.remarks
		}
	});

	return updated;
}

export async function updateCaseStatus(caseYear: number, caseId: string, input: { newStatus: any; remarks?: string }, user: AuthUser) {
	return updateCaseStatusWithClient(prisma, caseYear, caseId, input, user);
}

export async function assignCaseSection(caseYear: number, caseId: string, input: { sectionAssigned: any; reason: string }, user: AuthUser) {
	if (!(user.role === 'ADMIN' || user.role === 'COMMISSIONER')) throw new HttpError(403, 'Only admin or commissioner can reassign section');

	const current = await prisma.case.findUnique({ where: { caseYear_id: { caseYear, id: caseId } } });
	if (!current) throw new HttpError(404, 'Case not found');

	const updated = await prisma.$transaction(async (tx) => {
		const u = await tx.case.update({ where: { caseYear_id: { caseYear, id: caseId } }, data: { sectionAssigned: input.sectionAssigned } });
		await tx.caseStatusHistory.create({
			data: {
				id: randomUUID(),
				caseYear,
				caseId,
				oldStatus: current.status,
				newStatus: current.status,
				changedById: user.id,
				remarks: `Section reassigned to ${input.sectionAssigned}. Reason: ${input.reason}`
			}
		});
		return u;
	});

	return updated;
}

export async function updateCasePriority(caseYear: number, caseId: string, input: { priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' }, user: AuthUser) {
	const item = await prisma.case.findUnique({
		where: { caseYear_id: { caseYear, id: caseId } }
	});
	if (!item) throw new HttpError(404, 'Case not found');

	const role = user.role;
	// Only Commissioner and Admin can set priority
	if (role !== 'COMMISSIONER' && role !== 'ADMIN') {
		throw new HttpError(403, 'Only Commissioner and Admin can set case priority');
	}

	const updated = await prisma.case.update({
		where: { caseYear_id: { caseYear, id: caseId } },
		data: {
			priority: input.priority
		}
	});

	return updated;
}

function mapRoleToSection(role: AuthUser['role']): any {
	switch (role) {
		case 'LEGAL_ASSISTANT':
			return 'LEGAL';
		case 'REGISTRAR':
			return 'REGISTRAR';
		case 'STATIONERY':
			return 'STATIONERY';
		case 'COMPUTER_ASSISTANT':
			return 'STATIONERY';
		case 'PROGRAMMER':
			return 'PROGRAMMER';
		case 'COMMISSIONER':
			return 'COMMISSIONER';
		case 'PRIVATE_ASSISTANT':
			return 'COMMISSIONER';
		case 'PRIVATE_SECRETARY':
			return 'COMMISSIONER';
		default:
			return undefined;
	}
}
