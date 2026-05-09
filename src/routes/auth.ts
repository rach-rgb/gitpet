import { Hono } from 'hono';
import { Database } from '../shared/db';
import { GithubAuth } from '../auth/github';
import { encryptToken, signSession } from '../shared/utils';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import { rateLimiter } from '../middleware/rateLimit';
import { Bindings } from '../types';

export const authRouter = new Hono<{ Bindings: Bindings }>({ strict: false });

authRouter.use('/login', rateLimiter);

authRouter.get('/login', async (c) => {
    const auth = new GithubAuth(c.env.GITHUB_CLIENT_ID, c.env.GITHUB_CLIENT_SECRET);
    const db = new Database(c.env.DB);

    const { url, state } = auth.getAuthUrl();
    await db.storeOAuthState(state);

    return c.redirect(url);
});

authRouter.get('/logout', async (c) => {
    const sessionCookie = getCookie(c, 'session');
    if (sessionCookie) {
        const db = new Database(c.env.DB);
        await db.deleteSession(sessionCookie);
    }
    deleteCookie(c, 'session', { path: '/' });
    return c.redirect('/');
});
