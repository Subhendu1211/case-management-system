import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { audit } from '../../middleware/audit.js';
import { createComplaintSchema, diaryEntrySchema, listComplaintsSchema, updateComplaintSchema } from '../../schemas/complaint.schemas.js';
import { createComplaint, diaryEntryFromComplaint, getComplaint, listComplaints, updateComplaint } from '../../services/complaints.service.js';
import { prisma } from '../../db/prisma.js';
import { HttpError } from '../../utils/httpError.js';
import {
	cleanupUploadedFiles,
	resolveStoredFilePath,
	resolveUploadDirAbs,
	sendSafeDownload,
	uploadFileFilter,
	validateUploadedFiles
} from '../../utils/uploadSecurity.js';

export const complaintsRouter = Router();

const upload = multer({
	storage: multer.diskStorage({
		destination: (req, _file, cb) => {
			const uploadDirAbs = resolveUploadDirAbs();
			const baseDir = path.resolve(uploadDirAbs, 'complaints', req.params.complaintId ?? 'unknown');
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

complaintsRouter.use(authenticate);

complaintsRouter.get(
	'/',
	requireRole(['PRIVATE_SECRETARY', 'ADMIN', 'CITIZEN']),
	asyncHandler(async (req, res) => {
		const query = listComplaintsSchema.parse(req.query);
		res.json(await listComplaints({ ...query, user: (req as any).user }));
	})
);

complaintsRouter.post(
	'/',
	requireRole(['PRIVATE_SECRETARY', 'ADMIN', 'CITIZEN']),
	audit('complaints', 'create', 'complaint'),
	asyncHandler(async (req, res) => {
		const input = createComplaintSchema.parse(req.body);
		const created = await createComplaint({
			...input,
			createdIp: req.ip ?? null,
			user: (req as any).user
		});
		res.status(201).json(created);
	})
);

complaintsRouter.get(
	'/:complaintId',
	requireRole(['PRIVATE_SECRETARY', 'ADMIN', 'CITIZEN']),
	asyncHandler(async (req, res) => {
		const complaint = await getComplaint(req.params.complaintId, (req as any).user);
		res.json({
			...complaint,
			documents: (complaint.documents ?? []).map((doc) => ({
				...doc,
				downloadUrl: `/api/v1/complaints/${req.params.complaintId}/documents/${doc.id}/download`
			}))
		});
	})
);

complaintsRouter.patch(
	'/:complaintId',
	requireRole(['PRIVATE_SECRETARY', 'ADMIN']),
	audit('complaints', 'update', 'complaint', (req) => req.params.complaintId),
	asyncHandler(async (req, res) => {
		const input = updateComplaintSchema.parse(req.body);
		res.json(await updateComplaint(req.params.complaintId, input, (req as any).user));
	})
);

complaintsRouter.post(
	'/:complaintId/diary',
	requireRole(['PRIVATE_SECRETARY', 'ADMIN']),
	audit('complaints', 'diary_entry', 'complaint', (req) => req.params.complaintId),
	asyncHandler(async (req, res) => {
		const input = diaryEntrySchema.parse(req.body);
		res.status(201).json(
			await diaryEntryFromComplaint({
				complaintId: req.params.complaintId,
				...input,
				user: (req as any).user
			})
		);
	})
);

complaintsRouter.post(
	'/:complaintId/documents',
	requireRole(['PRIVATE_SECRETARY', 'ADMIN', 'CITIZEN']),
	upload.array('files', 10),
	audit('complaints', 'upload_documents', 'complaint', (req) => req.params.complaintId),
	asyncHandler(async (req, res) => {
		const complaintId = req.params.complaintId;
		const files = (req.files as Express.Multer.File[]) ?? [];
		const userId = (req as any).user?.id ?? null;
		const role = (req as any).user?.role;

		if (role === 'CITIZEN') {
			const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } });
			if (!complaint || complaint.createdById !== userId) {
				return res.status(403).json({ error: { message: 'Forbidden' } });
			}
		}

		if (files.length === 0) {
			return res.status(400).json({ error: { message: 'No files uploaded' } });
		}

		const validatedFiles = await validateUploadedFiles(files);
		let records;
		try {
			records = await prisma.$transaction(
				validatedFiles.map((uploadItem) =>
					prisma.complaintDocument.create({
						data: {
							id: randomUUID(),
							complaintId,
							fileName: uploadItem.fileName,
							mimeType: uploadItem.mimeType,
							storageKey: uploadItem.storageKey,
							sizeBytes: uploadItem.file.size,
							uploadedById: userId
						}
					})
				)
			);
		} catch (error) {
			await cleanupUploadedFiles(files);
			throw error;
		}

		res.status(201).json(
			records.map((doc) => ({
				...doc,
				downloadUrl: `/api/v1/complaints/${complaintId}/documents/${doc.id}/download`
			}))
		);
	})
);

complaintsRouter.get(
	'/:complaintId/documents/:documentId/download',
	requireRole(['PRIVATE_SECRETARY', 'ADMIN', 'CITIZEN']),
	asyncHandler(async (req, res) => {
		const complaintId = req.params.complaintId;
		const documentId = req.params.documentId;
		await getComplaint(complaintId, (req as any).user);

		const doc = await prisma.complaintDocument.findFirst({
			where: { id: documentId, complaintId }
		});
		if (!doc) throw new HttpError(404, 'Complaint document not found');

		const filePath = resolveStoredFilePath(doc.storageKey);
		if (!fs.existsSync(filePath)) {
			throw new HttpError(404, 'File missing on server');
		}

		sendSafeDownload(res, filePath, doc.fileName);
	})
);
