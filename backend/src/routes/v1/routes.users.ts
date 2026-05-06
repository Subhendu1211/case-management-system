import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { createUserSchema, listUsersSchema } from '../../schemas/user.schemas.js';
import { createUser, listUsers } from '../../services/users.service.js';
import { audit } from '../../middleware/audit.js';

export const usersRouter = Router();

usersRouter.use(authenticate);

usersRouter.get(
	'/',
	requireRole(['ADMIN', 'PROGRAMMER']),
	asyncHandler(async (req, res) => {
		const query = listUsersSchema.parse(req.query);
		res.json(await listUsers(query));
	})
);

usersRouter.post(
	'/',
	requireRole(['ADMIN']),
	audit('users', 'create', 'user'),
	asyncHandler(async (req, res) => {
		const input = createUserSchema.parse(req.body);
		const created = await createUser(input);
		res.status(201).json(created);
	})
);
