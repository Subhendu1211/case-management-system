import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { createPublicRegistrationSchema } from '../../schemas/publicRegistration.schemas.js';
import { createPublicRegistration } from '../../services/publicRegistration.service.js';

export const publicRouter = Router();

publicRouter.post(
	'/registrations',
	asyncHandler(async (req, res) => {
		const input = createPublicRegistrationSchema.parse(req.body);
		const created = await createPublicRegistration({
			...input,
			createdIp: req.ip ?? null
		});
		res.status(201).json(created);
	})
);
