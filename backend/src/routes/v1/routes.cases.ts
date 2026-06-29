import { Router } from 'express';
import type { Express } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { assignCaseSectionSchema, createCaseSchema, listCasesSchema, updateCaseStatusSchema, updateCasePrioritySchema } from '../../schemas/case.schemas.js';
import { assignCaseSection, createCase, getCase, listCases, updateCaseStatus, updateCasePriority } from '../../services/cases.service.js';
import { audit } from '../../middleware/audit.js';
import { listAllowedWorkflowTransitions } from '../../services/workflow.service.js';
import { createOrderSheetSchema, orderSheetActionSchema, updateOrderSheetSchema } from '../../schemas/orderSheet.schemas.js';
import {
	commissionerApprove,
	commissionerRequestRevision,
	createOrderSheet,
	listOrderSheets,
	registrarForward,
	registrarRequestRevision,
	submitToRegistrar,
	updateOrderSheet
} from '../../services/orderSheets.service.js';
import { createForwardingLetterSchema, forwardingLetterActionSchema, updateForwardingLetterSchema } from '../../schemas/forwardingLetter.schemas.js';
import {
	createForwardingLetter,
	listForwardingLetters,
	signForwardingLetter,
	submitForSignature,
	updateForwardingLetter
} from '../../services/forwardingLetters.service.js';
import { createQueryLetterSchema } from '../../schemas/queryLetter.schemas.js';
import { createQueryLetter, dispatchQueryLetter, listIssueRegister, listQueryLetters } from '../../services/queryLetters.service.js';
import { createDispatchSchema } from '../../schemas/dispatch.schemas.js';
import { createCaseDispatch, listCaseDispatches } from '../../services/dispatch.service.js';
import { prisma } from '../../db/prisma.js';
import { HttpError } from '../../utils/httpError.js';
import { listAuditLogs } from '../../services/audit-read.service.js';
import {
	cleanupUploadedFiles,
	resolveStoredFilePath,
	resolveUploadDirAbs,
	sendSafeDownload,
	uploadFileFilter,
	validateUploadedFiles
} from '../../utils/uploadSecurity.js';

export const casesRouter = Router();

const upload = multer({
	storage: multer.diskStorage({
		destination: (req, _file, cb) => {
			const caseYear = req.params.caseYear ?? 'unknown';
			const caseId = req.params.caseId ?? 'unknown';
			const uploadDirAbs = resolveUploadDirAbs();
			const baseDir = path.resolve(uploadDirAbs, 'cases', String(caseYear), caseId);
			fs.mkdirSync(baseDir, { recursive: true });
			cb(null, baseDir);
		},
		filename: (_req, file, cb) => {
			const ext = path.extname(file.originalname);
			cb(null, `${randomUUID()}${ext}`);
		}
	}),
	fileFilter: uploadFileFilter,
	limits: { fileSize: 10 * 1024 * 1024, files: 10 }
});

casesRouter.use(authenticate);

casesRouter.get(
	'/',
	asyncHandler(async (req, res) => {
		const query = listCasesSchema.parse(req.query);
		res.json(await listCases({ ...query, user: (req as any).user }));
	})
);

casesRouter.post(
	'/',
	requireRole(['PRIVATE_SECRETARY', 'ADMIN']),
	audit('cases', 'create', 'case'),
	asyncHandler(async (req, res) => {
		const input = createCaseSchema.parse(req.body);
		const created = await createCase({ ...input, createdBy: (req as any).user });
		res.status(201).json(created);
	})
);

casesRouter.post(
	'/:caseYear/:caseId/assign-section',
	requireRole(['ADMIN', 'COMMISSIONER']),
	audit('cases', 'assign_section', 'case', (req) => req.params.caseId),
	asyncHandler(async (req, res) => {
		const caseYear = Number(req.params.caseYear);
		const caseId = req.params.caseId;
		const parsed = assignCaseSectionSchema.safeParse(req.body);
		if (!parsed.success) {
			const issues = parsed.error.issues.map((i) => ({ path: i.path, message: i.message }));
			return res.status(400).json({ error: 'ValidationError', issues });
		}
		res.json(await assignCaseSection(caseYear, caseId, parsed.data, (req as any).user));
	})
);

casesRouter.get(
	'/:caseYear/:caseId',
	asyncHandler(async (req, res) => {
		const caseYear = Number(req.params.caseYear);
		const caseId = req.params.caseId;
		res.json(await getCase(caseYear, caseId, (req as any).user));
	})
);

casesRouter.get(
	'/:caseYear/:caseId/activity',
	asyncHandler(async (req, res) => {
		const caseYear = Number(req.params.caseYear);
		const caseId = req.params.caseId;
		await getCase(caseYear, caseId, (req as any).user);

		const page = Math.max(1, Number(req.query.page ?? '1') || 1);
		const pageSizeRaw = Number(req.query.pageSize ?? '20');
		const pageSize = pageSizeRaw > 0 && pageSizeRaw <= 100 ? pageSizeRaw : 20;
		const q = typeof req.query.q === 'string' && req.query.q.trim() ? req.query.q.trim() : undefined;
		const action = typeof req.query.action === 'string' && req.query.action.trim() ? req.query.action.trim() : undefined;

		res.json(
			await listAuditLogs({
				module: 'cases',
				action,
				entityType: 'case',
				entityId: caseId,
				page,
				pageSize,
				q
			})
		);
	})
);

casesRouter.get(
	'/:caseYear/:caseId/documents',
	asyncHandler(async (req, res) => {
		const caseYear = Number(req.params.caseYear);
		const caseId = req.params.caseId;
		await getCase(caseYear, caseId, (req as any).user);

		const caseDocuments = await prisma.document.findMany({
			where: { caseYear, caseId },
			include: { uploadedBy: true },
			orderBy: { createdAt: 'desc' }
		});

		const complaintDocuments = await prisma.complaintDocument.findMany({
			where: { complaint: { linkedCaseYear: caseYear, linkedCaseId: caseId } },
			include: { uploadedBy: true, complaint: true },
			orderBy: { createdAt: 'desc' }
		});

		res.json({
			caseDocuments: caseDocuments.map((doc) => ({
				...doc,
				downloadUrl: `/api/v1/cases/${caseYear}/${caseId}/documents/${doc.id}/download`,
				source: 'case'
			})),
			complaintDocuments: complaintDocuments.map((doc) => ({
				...doc,
				downloadUrl: `/api/v1/cases/${caseYear}/${caseId}/complaint-documents/${doc.id}/download`,
				source: 'complaint'
			}))
		});
	})
);

casesRouter.post(
	'/:caseYear/:caseId/documents',
	requireRole([
		'ADMIN',
		'PRIVATE_SECRETARY',
		'PRIVATE_ASSISTANT',
		'COMMISSIONER',
		'LEGAL_ASSISTANT',
		'REGISTRAR',
		'PROGRAMMER',
		'STATIONERY',
		'COMPUTER_ASSISTANT',
		'CITIZEN'
	]),
	upload.array('files'),
	asyncHandler(async (req, res) => {
		const caseYear = Number(req.params.caseYear);
		const caseId = req.params.caseId;
		const caseItem = await getCase(caseYear, caseId, (req as any).user);

		const files = (req.files as Express.Multer.File[]) ?? [];
		if (!files.length) {
			throw new HttpError(400, 'No files provided');
		}

		const validatedFiles = await validateUploadedFiles(files);
		let created;
		try {
			created = await prisma.$transaction(
				validatedFiles.map((uploadItem) =>
					prisma.document.create({
						data: {
							id: randomUUID(),
							caseYear,
							caseId,
							kind: 'ATTACHMENT',
							fileName: uploadItem.fileName,
							mimeType: uploadItem.mimeType,
							storageKey: uploadItem.storageKey,
							sizeBytes: uploadItem.file.size,
							uploadedById: (req as any).user?.id ?? null
						}
					})
				)
			);
		} catch (error) {
			await cleanupUploadedFiles(files);
			throw error;
		}

		// If this case was closed and a Private Assistant uploaded new communication,
		// reopen the case to REGISTERED so Legal Assistant can pick it up for order sheet preparation.
		try {
			if (caseItem.status === 'CLOSED' && (req as any).user?.role === 'PRIVATE_ASSISTANT') {
				await updateCaseStatus(caseYear, caseId, { newStatus: 'REGISTERED', remarks: 'Re-opened on new communication uploaded by PA' }, (req as any).user);
			}
		} catch (err) {
			// Non-fatal: document upload should succeed even if reopening fails; log and continue.
			// eslint-disable-next-line no-console
			console.warn('Failed to reopen case after upload:', err && (err as any).message ? (err as any).message : err);
		}

		res.status(201).json(
			created.map((doc) => ({
				...doc,
				downloadUrl: `/api/v1/cases/${caseYear}/${caseId}/documents/${doc.id}/download`,
				source: 'case'
			}))
		);
	})
);

casesRouter.get(
	'/:caseYear/:caseId/documents/:documentId/download',
	asyncHandler(async (req, res) => {
		const caseYear = Number(req.params.caseYear);
		const caseId = req.params.caseId;
		const documentId = req.params.documentId;
		await getCase(caseYear, caseId, (req as any).user);

		const doc = await prisma.document.findUnique({ where: { caseId_id: { caseId, id: documentId } } });
		if (!doc || doc.caseYear !== caseYear) {
			throw new HttpError(404, 'Document not found');
		}

		const filePath = resolveStoredFilePath(doc.storageKey);
		if (!fs.existsSync(filePath)) {
			throw new HttpError(404, 'File missing on server');
		}

		sendSafeDownload(res, filePath, doc.fileName);
	})
);

casesRouter.get(
	'/:caseYear/:caseId/complaint-documents/:documentId/download',
	asyncHandler(async (req, res) => {
		const caseYear = Number(req.params.caseYear);
		const caseId = req.params.caseId;
		const documentId = req.params.documentId;
		await getCase(caseYear, caseId, (req as any).user);

		const doc = await prisma.complaintDocument.findUnique({ where: { id: documentId }, include: { complaint: true } });
		if (!doc || doc.complaint?.linkedCaseYear !== caseYear || doc.complaint?.linkedCaseId !== caseId) {
			throw new HttpError(404, 'Complaint document not found for this case');
		}

		const filePath = resolveStoredFilePath(doc.storageKey);
		if (!fs.existsSync(filePath)) {
			throw new HttpError(404, 'File missing on server');
		}

		sendSafeDownload(res, filePath, doc.fileName);
	})
);

casesRouter.get(
	'/:caseYear/:caseId/transitions',
	asyncHandler(async (req, res) => {
		const caseYear = Number(req.params.caseYear);
		const caseId = req.params.caseId;
		const item = await getCase(caseYear, caseId, (req as any).user);
		const transitions = await listAllowedWorkflowTransitions({
			fromStatus: item.status,
			user: (req as any).user
		});
		res.json(
			transitions.map((t) => ({
				fromStatus: t.fromStatus,
				toStatus: t.toStatus,
				autoTransition: t.autoTransition,
				description: t.description
			}))
		);
	})
);

casesRouter.get(
	'/:caseYear/:caseId/issue-register',
	asyncHandler(async (req, res) => {
		const caseYear = Number(req.params.caseYear);
		const caseId = req.params.caseId;
		res.json(await listIssueRegister(caseYear, caseId, (req as any).user));
	})
);

casesRouter.get(
	'/:caseYear/:caseId/query-letters',
	asyncHandler(async (req, res) => {
		const caseYear = Number(req.params.caseYear);
		const caseId = req.params.caseId;
		res.json(await listQueryLetters(caseYear, caseId, (req as any).user));
	})
);

casesRouter.post(
	'/:caseYear/:caseId/query-letters',
	audit('query_letters', 'create', 'query_letter', (req) => req.params.caseId),
	asyncHandler(async (req, res) => {
		const caseYear = Number(req.params.caseYear);
		const caseId = req.params.caseId;
		const input = createQueryLetterSchema.parse(req.body);
		res.status(201).json(await createQueryLetter(caseYear, caseId, input, (req as any).user));
	})
);

casesRouter.post(
	'/:caseYear/:caseId/query-letters/:queryLetterId/dispatch',
	audit('query_letters', 'dispatch', 'query_letter', (req) => req.params.queryLetterId),
	asyncHandler(async (req, res) => {
		const caseYear = Number(req.params.caseYear);
		const caseId = req.params.caseId;
		const queryLetterId = req.params.queryLetterId;
		res.status(201).json(await dispatchQueryLetter(caseYear, caseId, queryLetterId, (req as any).user));
	})
);

casesRouter.post(
	'/:caseYear/:caseId/status',
	audit('cases', 'status_change', 'case', (req) => req.params.caseId),
	asyncHandler(async (req, res) => {
		const caseYear = Number(req.params.caseYear);
		const caseId = req.params.caseId;
		const input = updateCaseStatusSchema.parse(req.body);
		res.json(await updateCaseStatus(caseYear, caseId, input, (req as any).user));
	})
);

casesRouter.patch(
	'/:caseYear/:caseId/case-no',
	requireRole(['PROGRAMMER', 'ADMIN']),
	audit('cases', 'set_case_no', 'case', (req) => req.params.caseId),
	asyncHandler(async (req, res) => {
		const caseYear = Number(req.params.caseYear);
		const caseId = req.params.caseId;
		const { caseNo } = req.body;
		if (!caseNo || typeof caseNo !== 'string' || caseNo.trim().length < 1) {
			throw new HttpError(400, 'caseNo is required');
		}
		const item = await getCase(caseYear, caseId, (req as any).user);
		if (item.status !== 'PROGRAMMER_REVIEW' && (req as any).user?.role !== 'ADMIN') {
			throw new HttpError(409, 'Case number can only be set during PROGRAMMER_REVIEW stage');
		}
		const updated = await prisma.case.update({
			where: { caseYear_id: { caseYear, id: caseId } },
			data: { caseNo: caseNo.trim() }
		});
		res.json(updated);
	})
);

// Order sheets
casesRouter.get(
	'/:caseYear/:caseId/order-sheets',
	requireRole(['LEGAL_ASSISTANT', 'REGISTRAR', 'COMMISSIONER', 'PRIVATE_SECRETARY', 'PRIVATE_ASSISTANT', 'ADMIN']),
	asyncHandler(async (req, res) => {
		const caseYear = Number(req.params.caseYear);
		const caseId = req.params.caseId;
		res.json(await listOrderSheets(caseYear, caseId, (req as any).user));
	})
);

casesRouter.post(
	'/:caseYear/:caseId/order-sheets',
	requireRole(['LEGAL_ASSISTANT', 'REGISTRAR', 'ADMIN']),
	audit('order_sheets', 'create', 'order_sheet'),
	asyncHandler(async (req, res) => {
		const caseYear = Number(req.params.caseYear);
		const caseId = req.params.caseId;
		const input = createOrderSheetSchema.parse(req.body);
		res.status(201).json(await createOrderSheet(caseYear, caseId, input, (req as any).user));
	})
);

casesRouter.patch(
	'/order-sheets/:orderSheetId',
	audit('order_sheets', 'update', 'order_sheet', (req) => req.params.orderSheetId),
	asyncHandler(async (req, res) => {
		const orderSheetId = req.params.orderSheetId;
		const input = updateOrderSheetSchema.parse(req.body);
		res.json(await updateOrderSheet(orderSheetId, input, (req as any).user));
	})
);

casesRouter.post(
	'/order-sheets/:orderSheetId/submit',
	requireRole(['LEGAL_ASSISTANT', 'REGISTRAR', 'ADMIN']),
	audit('order_sheets', 'submit', 'order_sheet', (req) => req.params.orderSheetId),
	asyncHandler(async (req, res) => {
		const orderSheetId = req.params.orderSheetId;
		const input = orderSheetActionSchema.parse(req.body);
		res.json(await submitToRegistrar(orderSheetId, input, (req as any).user));
	})
);

casesRouter.post(
	'/order-sheets/:orderSheetId/registrar/forward',
	requireRole(['REGISTRAR', 'ADMIN']),
	audit('order_sheets', 'registrar_forward', 'order_sheet', (req) => req.params.orderSheetId),
	asyncHandler(async (req, res) => {
		const orderSheetId = req.params.orderSheetId;
		const input = orderSheetActionSchema.parse(req.body);
		res.json(await registrarForward(orderSheetId, input, (req as any).user));
	})
);

casesRouter.post(
	'/order-sheets/:orderSheetId/registrar/revise',
	requireRole(['REGISTRAR', 'ADMIN']),
	audit('order_sheets', 'registrar_revision', 'order_sheet', (req) => req.params.orderSheetId),
	asyncHandler(async (req, res) => {
		const orderSheetId = req.params.orderSheetId;
		const input = orderSheetActionSchema.parse(req.body);
		res.json(await registrarRequestRevision(orderSheetId, input, (req as any).user));
	})
);

casesRouter.post(
	'/order-sheets/:orderSheetId/commissioner/approve',
	requireRole(['COMMISSIONER', 'ADMIN']),
	audit('order_sheets', 'commissioner_approve', 'order_sheet', (req) => req.params.orderSheetId),
	asyncHandler(async (req, res) => {
		const orderSheetId = req.params.orderSheetId;
		const input = orderSheetActionSchema.parse(req.body);
		res.json(await commissionerApprove(orderSheetId, input, (req as any).user));
	})
);

casesRouter.post(
	'/order-sheets/:orderSheetId/commissioner/revise',
	requireRole(['COMMISSIONER', 'ADMIN']),
	audit('order_sheets', 'commissioner_revision', 'order_sheet', (req) => req.params.orderSheetId),
	asyncHandler(async (req, res) => {
		const orderSheetId = req.params.orderSheetId;
		const input = orderSheetActionSchema.parse(req.body);
		res.json(await commissionerRequestRevision(orderSheetId, input, (req as any).user));
	})
);

// Forwarding letters
casesRouter.get(
	'/:caseYear/:caseId/forwarding-letters',
	asyncHandler(async (req, res) => {
		const caseYear = Number(req.params.caseYear);
		const caseId = req.params.caseId;
		res.json(await listForwardingLetters(caseYear, caseId, (req as any).user));
	})
);

casesRouter.post(
	'/:caseYear/:caseId/forwarding-letters',
	requireRole(['REGISTRAR', 'PRIVATE_SECRETARY', 'LEGAL_ASSISTANT', 'PROGRAMMER', 'ADMIN']),
	audit('forwarding_letters', 'create', 'forwarding_letter'),
	asyncHandler(async (req, res) => {
		const caseYear = Number(req.params.caseYear);
		const caseId = req.params.caseId;
		const input = createForwardingLetterSchema.parse(req.body);
		res.status(201).json(await createForwardingLetter(caseYear, caseId, input, (req as any).user));
	})
);

casesRouter.patch(
	'/forwarding-letters/:letterId',
	audit('forwarding_letters', 'update', 'forwarding_letter', (req) => req.params.letterId),
	asyncHandler(async (req, res) => {
		const letterId = req.params.letterId;
		const input = updateForwardingLetterSchema.parse(req.body);
		res.json(await updateForwardingLetter(letterId, input, (req as any).user));
	})
);

casesRouter.post(
	'/forwarding-letters/:letterId/submit',
	audit('forwarding_letters', 'submit_for_signature', 'forwarding_letter', (req) => req.params.letterId),
	asyncHandler(async (req, res) => {
		const letterId = req.params.letterId;
		const input = forwardingLetterActionSchema.parse(req.body);
		res.json(await submitForSignature(letterId, input, (req as any).user));
	})
);

casesRouter.post(
	'/forwarding-letters/:letterId/sign',
	requireRole(['REGISTRAR', 'ADMIN']),
	audit('forwarding_letters', 'sign', 'forwarding_letter', (req) => req.params.letterId),
	asyncHandler(async (req, res) => {
		const letterId = req.params.letterId;
		const input = forwardingLetterActionSchema.parse(req.body);
		res.json(await signForwardingLetter(letterId, input, (req as any).user));
	})
);

// Dispatch
casesRouter.get(
	'/:caseYear/:caseId/dispatch',
	asyncHandler(async (req, res) => {
		const caseYear = Number(req.params.caseYear);
		const caseId = req.params.caseId;
		res.json(await listCaseDispatches(caseYear, caseId, (req as any).user));
	})
);

casesRouter.post(
	'/:caseYear/:caseId/dispatch',
	requireRole(['STATIONERY', 'COMPUTER_ASSISTANT', 'ADMIN']),
	audit('dispatch', 'create', 'dispatch'),
	asyncHandler(async (req, res) => {
		const caseYear = Number(req.params.caseYear);
		const caseId = req.params.caseId;
		const input = createDispatchSchema.parse(req.body);
		res.status(201).json(await createCaseDispatch(caseYear, caseId, input, (req as any).user));
	})
);

// Update case priority (URGENT/IMMEDIATE marking)
casesRouter.patch(
	'/:caseYear/:caseId/priority',
	requireRole(['COMMISSIONER', 'ADMIN']),
	audit('cases', 'update_priority', 'case', (req) => req.params.caseId),
	asyncHandler(async (req, res) => {
		const caseYear = Number(req.params.caseYear);
		const caseId = req.params.caseId;
		const input = updateCasePrioritySchema.parse(req.body);
		res.json(await updateCasePriority(caseYear, caseId, input, (req as any).user));
	})
);
