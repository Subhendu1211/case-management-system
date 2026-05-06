import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
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

dashboardRouter.use(authenticate);

dashboardRouter.get(
	'/cards',
	asyncHandler(async (_req, res) => {
		res.json(await getDashboardCards());
	})
);

dashboardRouter.get(
	'/case-summary',
	asyncHandler(async (_req, res) => {
		res.json(await getCaseSummary());
	})
);

dashboardRouter.get(
	'/legal-pendency',
	asyncHandler(async (_req, res) => {
		res.json(await getLegalPendency());
	})
);

dashboardRouter.get(
	'/commissioner-workload',
	asyncHandler(async (_req, res) => {
		res.json(await getCommissionerWorkload());
	})
);

dashboardRouter.get(
	'/registrar-queue',
	asyncHandler(async (_req, res) => {
		res.json(await getRegistrarQueue());
	})
);

dashboardRouter.get(
	'/dispatch-tracking',
	asyncHandler(async (_req, res) => {
		res.json(await getDispatchTracking());
	})
);

dashboardRouter.get(
	'/role-pendency',
	asyncHandler(async (_req, res) => {
		res.json(await getRolePendency());
	})
);

dashboardRouter.get(
	'/complaint-pending',
	asyncHandler(async (_req, res) => {
		res.json(await getComplaintPendingCount());
	})
);
dashboardRouter.get(
	'/processing-house',
	asyncHandler(async (_req, res) => {
		res.json(await getProcessingHouseCount());
	})
);