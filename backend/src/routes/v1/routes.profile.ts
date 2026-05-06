import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { updatePublicProfileSchema } from '../../schemas/publicRegistration.schemas.js';
import { getPublicProfile, upsertPublicProfile } from '../../services/publicProfile.service.js';

export const profileRouter = Router();

profileRouter.use(authenticate);

profileRouter.get(
	'/',
	requireRole(['CITIZEN']),
	asyncHandler(async (req, res) => {
		const userId = (req as any).user?.id as string;
		res.json(await getPublicProfile(userId));
	})
);

profileRouter.put(
	'/',
	requireRole(['CITIZEN']),
	asyncHandler(async (req, res) => {
		const userId = (req as any).user?.id as string;
		const input = updatePublicProfileSchema.parse(req.body);
		res.json(await upsertPublicProfile(userId, input));
	})
);
