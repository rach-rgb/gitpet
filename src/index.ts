import { Hono } from 'hono';
import { Database } from './shared/db';
import { syncAndDecay } from './pet/sync';
import { Bindings } from './types';

// Routers
import { authRouter } from './routes/auth';
import { apiRouter } from './routes/api';
import { viewsRouter } from './routes/views';
import { debugApp } from './auth/debug';

const app = new Hono<{ Bindings: Bindings }>();

// Security middleware for debug routes
app.use('/debug/*', async (c, next) => {
    if (c.env.ENABLE_DEBUG_LOGIN !== 'true') {
        return c.text('Debug mode is disabled', 403);
    }
    await next();
});

// Mount routers
app.route('/debug', debugApp);
app.route('/auth', authRouter);
app.route('/api', apiRouter);
app.route('/', viewsRouter);

export default {
    fetch: app.fetch,
    async scheduled(event: any, env: Bindings, ctx: any) {
        const db = new Database(env.DB);
        ctx.waitUntil(Promise.all([
            syncAndDecay(env),
            db.cleanupOAuthStates(),
            db.cleanupExpiredSessions()
        ]));
    },
};
