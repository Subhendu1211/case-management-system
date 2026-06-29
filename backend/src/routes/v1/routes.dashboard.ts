import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRole, type Role } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
	getCaseSummary,
	getCommissionerWorkload,
	getDashboardCards,
	getDispatchTracking,
	getLegalPendency,
	getRegistrarQueue,
	getRolePendency,
	getComplaintPendingCount,
	getProcessingHouseCount
} from '../../services/dashboard.service.js';

export const dashboardRouter = Router();

const staffRoles: Role[] = [
	'PRIVATE_SECRETARY',
	'PRIVATE_ASSISTANT',
	'COMMISSIONER',
	'LEGAL_ASSISTANT',
	'REGISTRAR',
	'PROGRAMMER',
	'STATIONERY',
	'COMPUTER_ASSISTANT',
	'ADMIN'
];

dashboardRouter.use(authenticate);

dashboardRouter.get(
	'/cards',
	requireRole(staffRoles),
	asyncHandler(async (_req, res) => {
		res.json(await getDashboardCards());
	})
);

dashboardRouter.get(
	'/case-summary',
	requireRole(['ADMIN', 'PRIVATE_SECRETARY', 'COMMISSIONER']),
	asyncHandler(async (_req, res) => {
		res.json(await getCaseSummary());
	})
);

dashboardRouter.get(
	'/legal-pendency',
	requireRole(['LEGAL_ASSISTANT']),
	asyncHandler(async (_req, res) => {
		res.json(await getLegalPendency());
	})
);

dashboardRouter.get(
	'/commissioner-workload',
	requireRole(['COMMISSIONER']),
	asyncHandler(async (_req, res) => {
		res.json(await getCommissionerWorkload());
	})
);

dashboardRouter.get(
	'/registrar-queue',
	requireRole(['REGISTRAR']),
	asyncHandler(async (_req, res) => {
		res.json(await getRegistrarQueue());
	})
);

dashboardRouter.get(
	'/dispatch-tracking',
	requireRole(['STATIONERY', 'COMPUTER_ASSISTANT']),
	asyncHandler(async (_req, res) => {
		res.json(await getDispatchTracking());
	})
);

dashboardRouter.get(
	'/role-pendency',
	requireRole(['ADMIN']),
	asyncHandler(async (_req, res) => {
		res.json(await getRolePendency());
	})
);

dashboardRouter.get(
	'/complaint-pending',
	requireRole(['PRIVATE_SECRETARY', 'ADMIN']),
	asyncHandler(async (_req, res) => {
		res.json(await getComplaintPendingCount());
	})
);
dashboardRouter.get(
	'/processing-house',
	requireRole(['ADMIN']),
	asyncHandler(async (_req, res) => {
		res.json(await getProcessingHouseCount());
	})
);
