import { randomUUID } from 'node:crypto';
import type { CaseStatus, Role } from '@prisma/client';
import { prisma } from '../db/prisma.js';
import { logger } from '../config/logger.js';

type TransitionSpec = {
	fromStatus: CaseStatus | null;
	toStatus: CaseStatus;
	roles: Role[];
	description: string;
	autoTransition?: boolean;
};

const REQUIRED_TRANSITIONS: TransitionSpec[] = [
	// Step 1: PS creates diary entry
	{ fromStatus: null, toStatus: 'DIARY_ENTERED', roles: ['PRIVATE_SECRETARY', 'ADMIN'], description: 'Initial diary entry by Private Secretary' },
	// Step 2: PS sends to Commissioner for review
	{ fromStatus: 'DIARY_ENTERED', toStatus: 'UNDER_REVIEW', roles: ['PRIVATE_SECRETARY', 'ADMIN'], description: 'PS sends to Commissioner for review', autoTransition: true },
	// Commissioner actions on review
	{ fromStatus: 'UNDER_REVIEW', toStatus: 'DIARY_ENTERED', roles: ['COMMISSIONER', 'ADMIN'], description: 'Commissioner returns to PS' },
	{ fromStatus: 'UNDER_REVIEW', toStatus: 'REVIEW_DONE', roles: ['COMMISSIONER', 'ADMIN'], description: 'Commissioner marks review done' },
	{ fromStatus: 'UNDER_REVIEW', toStatus: 'CLOSED', roles: ['COMMISSIONER', 'ADMIN'], description: 'Case not related; close case' },
	{ fromStatus: 'UNDER_REVIEW', toStatus: 'CASE_ACCEPTED', roles: ['COMMISSIONER', 'ADMIN'], description: 'Commissioner accepts case for processing' },
	{ fromStatus: 'REVIEW_DONE', toStatus: 'CASE_ACCEPTED', roles: ['COMMISSIONER', 'ADMIN'], description: 'Commissioner accepts case for processing' },
	// Step 3: Accepted case goes back to PS
	{ fromStatus: 'CASE_ACCEPTED', toStatus: 'PS_POST_ACCEPTANCE', roles: ['PRIVATE_SECRETARY', 'ADMIN'], description: 'PS receives accepted case' },
	// Step 4: PS sends to PA for initial review
	{ fromStatus: 'PS_POST_ACCEPTANCE', toStatus: 'PA_INITIAL_REVIEW', roles: ['PRIVATE_SECRETARY', 'ADMIN'], description: 'PS sends to PA for initial review' },
	// Step 5: PA sends to Registrar for review and sign
	{ fromStatus: 'PA_INITIAL_REVIEW', toStatus: 'REGISTRAR_INITIAL_REVIEW', roles: ['PRIVATE_ASSISTANT', 'ADMIN'], description: 'PA sends to Registrar for review and sign' },
	// Step 6: Registrar sends back to PA to route to legal
	{ fromStatus: 'REGISTRAR_INITIAL_REVIEW', toStatus: 'ROUTED_TO_LEGAL', roles: ['REGISTRAR', 'ADMIN'], description: 'Registrar sends to PA to route to legal' },
	// Step 7: PA routes to Programmer for case registration
	{ fromStatus: 'ROUTED_TO_LEGAL', toStatus: 'PROGRAMMER_REVIEW', roles: ['PRIVATE_ASSISTANT', 'ADMIN'], description: 'PA routes to Programmer for case registration' },
	// Step 8: Programmer sends to Stationery
	{ fromStatus: 'PROGRAMMER_REVIEW', toStatus: 'STATIONERY_REVIEW', roles: ['PROGRAMMER', 'ADMIN'], description: 'Programmer sends to Stationery' },
	// Step 9: Stationery sends for order-sheet preparation
	{ fromStatus: 'STATIONERY_REVIEW', toStatus: 'REGISTERED', roles: ['STATIONERY', 'ADMIN'], description: 'Stationery prints and sends for order-sheet preparation' },
	// Step 10: Legal Assistant or Registrar prepares order sheet
	{ fromStatus: 'REGISTERED', toStatus: 'ORDER_SHEET_DRAFTED', roles: ['LEGAL_ASSISTANT', 'REGISTRAR', 'ADMIN'], description: 'Legal Assistant or Registrar drafts order sheet' },
	{ fromStatus: 'ORDER_SHEET_DRAFTED', toStatus: 'REGISTRAR_REVIEW', roles: ['LEGAL_ASSISTANT', 'REGISTRAR', 'ADMIN'], description: 'Send draft order sheet to Registrar review stage' },
	// Step 11: Registrar sends to PA for Commissioner routing
	{ fromStatus: 'REGISTRAR_REVIEW', toStatus: 'PA_TO_COMMISSIONER', roles: ['REGISTRAR', 'ADMIN'], description: 'Registrar sends to PA for Commissioner routing' },
	// Step 12: PA routes to Commissioner for approval
	{ fromStatus: 'PA_TO_COMMISSIONER', toStatus: 'COMMISSIONER_APPROVAL', roles: ['PRIVATE_ASSISTANT', 'ADMIN'], description: 'PA routes to Commissioner for approval' },
	// Step 13: Commissioner approves
	{ fromStatus: 'COMMISSIONER_APPROVAL', toStatus: 'APPROVED', roles: ['COMMISSIONER', 'ADMIN'], description: 'Commissioner approves order' },
	{ fromStatus: 'APPROVED', toStatus: 'PA_POST_APPROVAL', roles: ['PRIVATE_ASSISTANT', 'COMMISSIONER', 'ADMIN'], description: 'Approved case goes to PA' },
	// Step 14: PA sends back to Registrar
	{ fromStatus: 'PA_POST_APPROVAL', toStatus: 'REGISTRAR_HANDOVER', roles: ['PRIVATE_ASSISTANT', 'ADMIN'], description: 'PA sends to Registrar' },
	// Step 15: Registrar forwards to Programmer for forwarding letter
	{ fromStatus: 'REGISTRAR_HANDOVER', toStatus: 'LEGAL_FORWARDING', roles: ['REGISTRAR', 'ADMIN'], description: 'Registrar sends to Programmer for forwarding letter' },
	// Step 16: Programmer prepares forwarding letter, sends to Registrar for signing
	{ fromStatus: 'LEGAL_FORWARDING', toStatus: 'REGISTRAR_SIGNING', roles: ['PROGRAMMER', 'ADMIN'], description: 'Programmer prepares forwarding letter and sends to Registrar for signing' },
	// Step 17: Registrar signs and sends to PS for letter number
	{ fromStatus: 'REGISTRAR_SIGNING', toStatus: 'FORWARDING_STATIONERY', roles: ['REGISTRAR', 'ADMIN'], description: 'Registrar signs forwarding letter and sends to PS for letter number' },
	// Step 18: PS assigns letter number and sends to Stationery
	{ fromStatus: 'FORWARDING_STATIONERY', toStatus: 'DISPATCH_PENDING', roles: ['PRIVATE_SECRETARY', 'ADMIN'], description: 'PS assigns letter number and sends to Stationery for dispatch' },
	// Step 19: CA or Stationery dispatches the case
	{ fromStatus: 'DISPATCH_PENDING', toStatus: 'DISPATCHED', roles: ['COMPUTER_ASSISTANT', 'STATIONERY', 'ADMIN'], description: 'Computer Assistant or Stationery dispatches the case' },
	// Re-open transitions
	{ fromStatus: 'CLOSED', toStatus: 'ORDER_SHEET_DRAFTED', roles: ['LEGAL_ASSISTANT', 'REGISTRAR', 'ADMIN'], description: 'Re-open case from Processing House (New Communication)' },
	{ fromStatus: 'CLOSED', toStatus: 'REGISTERED', roles: ['PRIVATE_ASSISTANT', 'ADMIN'], description: 'Re-open closed case to Registered when PA uploads new communication' }
];

const TRANSITIONS_TO_REMOVE: Array<{ fromStatus: CaseStatus; toStatus: CaseStatus }> = [
	{ fromStatus: 'DIARY_ENTERED', toStatus: 'PROGRAMMER_REVIEW' },
	{ fromStatus: 'DIARY_ENTERED', toStatus: 'ROUTED_TO_LEGAL' },
	{ fromStatus: 'DIARY_ENTERED', toStatus: 'ROUTED_TO_OE' },
	{ fromStatus: 'DIARY_ENTERED', toStatus: 'PS_POST_ACCEPTANCE' },
	{ fromStatus: 'UNDER_REVIEW', toStatus: 'NOT_RELATED' },
	{ fromStatus: 'UNDER_REVIEW', toStatus: 'ROUTED_TO_LEGAL' },
	{ fromStatus: 'UNDER_REVIEW', toStatus: 'ROUTED_TO_OE' },
	{ fromStatus: 'UNDER_REVIEW', toStatus: 'PS_POST_ACCEPTANCE' },
	{ fromStatus: 'CASE_ACCEPTED', toStatus: 'ROUTED_TO_LEGAL' },
	{ fromStatus: 'CASE_ACCEPTED', toStatus: 'ROUTED_TO_OE' },
	{ fromStatus: 'PS_POST_ACCEPTANCE', toStatus: 'PROGRAMMER_REVIEW' },
	{ fromStatus: 'PS_POST_ACCEPTANCE', toStatus: 'ROUTED_TO_OE' },
	{ fromStatus: 'ROUTED_TO_LEGAL', toStatus: 'REGISTERED' },
	{ fromStatus: 'ROUTED_TO_LEGAL', toStatus: 'PENDING_QUERY' },
	{ fromStatus: 'ROUTED_TO_LEGAL', toStatus: 'DIARY_ENTERED' },
	{ fromStatus: 'ROUTED_TO_LEGAL', toStatus: 'PROGRAMMER_REVIEW' },
	{ fromStatus: 'ORDER_SHEET_DRAFTED', toStatus: 'PENDING_QUERY' },
	{ fromStatus: 'PENDING_QUERY', toStatus: 'ROUTED_TO_LEGAL' },
	{ fromStatus: 'REGISTRAR_REVIEW', toStatus: 'ORDER_SHEET_DRAFTED' },
	{ fromStatus: 'COMMISSIONER_APPROVAL', toStatus: 'ORDER_SHEET_DRAFTED' },
	{ fromStatus: 'DISPATCHED', toStatus: 'CLOSED' },
	{ fromStatus: 'APPROVED', toStatus: 'DISPATCH_PENDING' },
	// Remove old direct transitions replaced by PA intermediary
	{ fromStatus: 'REGISTRAR_REVIEW', toStatus: 'COMMISSIONER_APPROVAL' },
	{ fromStatus: 'APPROVED', toStatus: 'LEGAL_FORWARDING' },
	// Remove old forwarding/dispatch transitions replaced by new flow
	{ fromStatus: 'LEGAL_FORWARDING', toStatus: 'FORWARDING_STATIONERY' },
	{ fromStatus: 'FORWARDING_STATIONERY', toStatus: 'REGISTRAR_SIGNING' },
	{ fromStatus: 'REGISTRAR_SIGNING', toStatus: 'DISPATCH_PENDING' },
	{ fromStatus: 'DISPATCH_PENDING', toStatus: 'CLOSED' },
	{ fromStatus: 'DISPATCH_PENDING', toStatus: 'LEGAL_FORWARDING' },
	{ fromStatus: 'DISPATCH_PENDING', toStatus: 'REGISTRAR_FINAL_REVIEW' },
	{ fromStatus: 'DISPATCHED', toStatus: 'REGISTRAR_FINAL_REVIEW' },
	{ fromStatus: 'REGISTRAR_FINAL_REVIEW', toStatus: 'CLOSED' }
];

function normalizeRoles(roles: Role[]) {
	return Array.from(new Set(roles)).sort();
}

function sameRoles(a: Role[] = [], b: Role[] = []) {
	if (a.length !== b.length) return false;
	const aSorted = [...a].sort();
	const bSorted = [...b].sort();
	return aSorted.every((val, idx) => val === bSorted[idx]);
}

async function ensureTransition(spec: TransitionSpec) {
	const desiredRoles = normalizeRoles(spec.roles);
	const existingRows = await prisma.workflowTransition.findMany({
		where: { fromStatus: spec.fromStatus ?? null, toStatus: spec.toStatus }
	});
	const existing = existingRows[0];

	if (!existing) {
		await prisma.workflowTransition.create({
			data: {
				id: randomUUID(),
				fromStatus: spec.fromStatus ?? null,
				toStatus: spec.toStatus,
				allowedRoles: desiredRoles,
				autoTransition: !!spec.autoTransition,
				description: spec.description
			}
		});
		return;
	}

	const needsUpdate =
		!sameRoles(desiredRoles, existing.allowedRoles) ||
		existing.autoTransition !== !!spec.autoTransition ||
		existing.description !== spec.description;

	if (needsUpdate) {
		await prisma.workflowTransition.update({
			where: { id: existing.id },
			data: {
				allowedRoles: desiredRoles,
				autoTransition: !!spec.autoTransition,
				description: spec.description
			}
		});
	}

	// Remove duplicate rows for the same transition pair.
	if (existingRows.length > 1) {
		await prisma.workflowTransition.deleteMany({
			where: {
				id: { in: existingRows.slice(1).map((row) => row.id) }
			}
		});
	}
}

async function removeTransition(fromStatus: CaseStatus, toStatus: CaseStatus) {
	const existing = await prisma.workflowTransition.findFirst({ where: { fromStatus, toStatus } });
	if (existing) {
		await prisma.workflowTransition.delete({ where: { id: existing.id } });
	}
}

export async function ensureWorkflowBootstrap(retries = 6, delayMs = 2000) {
	try {
		// Ensure all required enum values exist before any transition queries run.
		// ADD VALUE IF NOT EXISTS is idempotent so this is safe to run every startup.
		const allStatuses = [
			'REVIEW_DONE', 'CASE_ACCEPTED', 'PS_POST_ACCEPTANCE', 'PENDING_QUERY',
			'ROUTED_TO_LEGAL', 'PA_INITIAL_REVIEW', 'REGISTRAR_INITIAL_REVIEW', 'PROGRAMMER_REVIEW', 'STATIONERY_REVIEW', 'ROUTED_TO_OE',
			'NOT_RELATED', 'ORDER_SHEET_DRAFTED', 'REGISTRAR_REVIEW', 'PA_TO_COMMISSIONER',
			'COMMISSIONER_APPROVAL', 'APPROVED', 'PA_POST_APPROVAL', 'REGISTRAR_HANDOVER',
			'LEGAL_FORWARDING', 'FORWARDING_STATIONERY', 'REGISTRAR_SIGNING',
			'DISPATCH_PENDING', 'DISPATCHED', 'REGISTRAR_FINAL_REVIEW', 'CLOSED'
		];
		for (const status of allStatuses) {
			try {
				await prisma.$executeRawUnsafe(`ALTER TYPE "CaseStatus" ADD VALUE IF NOT EXISTS '${status}'`);
			} catch (enumErr) {
				logger.warn({ err: enumErr }, `Failed to add CaseStatus enum value ${status}`);
			}
		}

		for (const item of TRANSITIONS_TO_REMOVE) {
			await removeTransition(item.fromStatus, item.toStatus);
		}
		await prisma.workflowTransition.deleteMany({
			where: {
				fromStatus: 'DISPATCH_PENDING',
				description: 'Registrar returns to Programmer for updates'
			}
		});
		await prisma.workflowTransition.deleteMany({
			where: {
				fromStatus: 'UNDER_REVIEW',
				description: { in: ['Commissioner accepts case, sends to PS', 'Commissioner accepts case and sends to PS'] }
			}
		});

		for (const spec of REQUIRED_TRANSITIONS) {
			await ensureTransition(spec);
		}
	} catch (err) {
		if (retries > 0) {
			logger.warn({ err, retries }, 'Workflow bootstrap failed; retrying');
			await new Promise((resolve) => setTimeout(resolve, delayMs));
			await ensureWorkflowBootstrap(retries - 1, delayMs);
			return;
		}
		// Best-effort: don't block server start in dev if DB is unavailable
		logger.warn({ err }, 'Workflow bootstrap skipped (DB unavailable or misconfigured)');
	}
}
