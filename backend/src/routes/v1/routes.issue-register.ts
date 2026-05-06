import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { listIssueRegisterSchema } from '../../schemas/issueRegister.schemas.js';
import { listIssueRegisterAll } from '../../services/issueRegister.service.js';

export const issueRegisterRouter = Router();

issueRegisterRouter.use(authenticate);

issueRegisterRouter.get(
	'/',
	asyncHandler(async (req, res) => {
		const query = listIssueRegisterSchema.parse(req.query);
		res.json(await listIssueRegisterAll({ ...query, user: (req as any).user }));
	})
);
