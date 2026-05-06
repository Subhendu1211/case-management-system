import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { ensureWorkflowBootstrap } from './services/workflowBootstrap.service.js';

const app = createApp();

await ensureWorkflowBootstrap();

app.listen(env.PORT, () => {
	logger.info({ port: env.PORT }, 'API listening');
});
