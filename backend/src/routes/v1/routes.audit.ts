import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { listAuditLogsSchema } from '../../schemas/audit.schemas.js';
import { listAuditLogs } from '../../services/audit-read.service.js';

export const auditRouter = Router();

auditRouter.use(authenticate);

auditRouter.get(
	'/audit-logs',
	requireRole(['ADMIN', 'PROGRAMMER']),
	asyncHandler(async (req, res) => {
		const query = listAuditLogsSchema.parse(req.query);
		res.json(await listAuditLogs(query));
	})
);
