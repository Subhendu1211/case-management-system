import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { createDisabilityTypeSchema, listDisabilityTypesSchema } from '../../schemas/disability-type.schemas.js';
import { createDisabilityType, listDisabilityTypes } from '../../services/disabilityTypes.service.js';
import { audit } from '../../middleware/audit.js';

export const disabilityTypesRouter = Router();

disabilityTypesRouter.use(authenticate);

disabilityTypesRouter.get(
	'/',
	authenticate,
	asyncHandler(async (req, res) => {
		const query = listDisabilityTypesSchema.parse(req.query);
		res.json(await listDisabilityTypes({ ...query, user: (req as any).user }));
	})
);

disabilityTypesRouter.post(
	'/',
	requireRole(['ADMIN', 'PROGRAMMER']),
	audit('disability_types', 'create', 'disability_type'),
	asyncHandler(async (req, res) => {
		const input = createDisabilityTypeSchema.parse(req.body);
		const created = await createDisabilityType({ ...input, user: (req as any).user });
		res.status(201).json(created);
	})
);
