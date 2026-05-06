import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { audit } from '../../middleware/audit.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { dispatchActionSchema, updateDispatchDeliverySchema } from '../../schemas/dispatch.schemas.js';
import { markDispatchReceived, updateDispatchDelivery } from '../../services/dispatch.service.js';

export const dispatchRouter = Router();

dispatchRouter.use(authenticate);

dispatchRouter.post(
	'/:id/mark-received',
	requireRole(['STATIONERY', 'COMPUTER_ASSISTANT', 'ADMIN']),
	audit('dispatch', 'mark_received', 'dispatch', (req) => req.params.id),
	asyncHandler(async (req, res) => {
		const input = dispatchActionSchema.parse(req.body);
		res.json(await markDispatchReceived(req.params.id, input, (req as any).user));
	})
);

dispatchRouter.patch(
	'/:id/delivery',
	requireRole(['STATIONERY', 'COMPUTER_ASSISTANT', 'ADMIN']),
	audit('dispatch', 'update_delivery', 'dispatch', (req) => req.params.id),
	asyncHandler(async (req, res) => {
		const input = updateDispatchDeliverySchema.parse(req.body);
		res.json(await updateDispatchDelivery(req.params.id, input, (req as any).user));
	})
);
