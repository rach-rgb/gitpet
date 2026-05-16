import { Hono } from 'hono';
import { Database } from './shared/db';
import { syncAndDecay } from './pet/sync';
import { Bindings } from './types';
import { GithubAuth } from './auth/github';
import { encryptToken, signSession } from './shared/utils';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';

// Routers
import { authRouter } from './routes/auth';
import { apiRouter } from './routes/api';
import { viewsRouter } from './routes/views';
import { debugApp } from './auth/debug';

const app = new Hono<{ Bindings: Bindings }>({ strict: false });

// Security middleware for debug routes
app.use('/debug/*', async (c, next) => {
    if (c.env.ENABLE_DEBUG_LOGIN !== 'true') {
        return c.text('Debug mode is disabled', 403);
    }
    await next();
});

// Explicitly handle the callback in the main app to ensure it's matched correctly
app.get('/auth/callback', async (c) => {
    const code = c.req.query('code');
    const state = c.req.query('state');

    if (!code || !state) return c.json({ error: 'Missing code or state' }, 400);

    const db = new Database(c.env.DB);
    const isStateValid = await db.consumeOAuthState(state);
    if (!isStateValid) return c.json({ error: 'Invalid or expired state' }, 403);

    const auth = new GithubAuth(c.env.GITHUB_CLIENT_ID, c.env.GITHUB_CLIENT_SECRET);
    try {
        const accessToken = await auth.exchangeCodeForToken(code);
        const githubUser = await auth.fetchUserData(accessToken);

        const allowPrivate = getCookie(c, 'oauth_private') === 'true';
        deleteCookie(c, 'oauth_private', { path: '/' });

        const encryptedToken = await encryptToken(accessToken, c.env.TOKEN_ENCRYPTION_KEY);
        const user = await db.upsertUser({
            githubId: githubUser.id,
            githubUsername: githubUser.login,
            tokenEncrypted: encryptedToken,
            allowPrivateRepos: allowPrivate,
        });

        const sessionId = await signSession(user.userId, c.env.SESSION_SIGNING_KEY);
        const expiresAt = Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 30);
        await db.createSession(user.userId, sessionId, expiresAt);

        setCookie(c, 'session', sessionId, {
            httpOnly: true,
            secure: true,
            sameSite: 'Lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 30,
        });

        const pet = await db.fetchPet(user.userId);
        return c.redirect(pet ? '/dashboard' : '/onboarding');
    } catch (error) {
        console.error('OAuth Error:', error);
        return c.json({ error: 'OAuth exchange failed' }, 502);
    }
});

// Mount routers
app.route('/debug', debugApp);
app.route('/auth', authRouter);
app.route('/api', apiRouter);
app.route('/', viewsRouter);


export default {
    fetch: (request: Request, env: Bindings, ctx: ExecutionContext) => app.fetch(request, env, ctx),
    async scheduled(event: any, env: Bindings, ctx: any) {
        const db = new Database(env.DB);
        ctx.waitUntil(Promise.all([
            syncAndDecay(env),
            db.cleanupOAuthStates(),
            db.cleanupExpiredSessions()
        ]));
    },
};
