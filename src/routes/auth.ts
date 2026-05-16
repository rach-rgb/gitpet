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
    const allowPrivate = c.req.query('private') === 'true';
    const auth = new GithubAuth(c.env.GITHUB_CLIENT_ID, c.env.GITHUB_CLIENT_SECRET);
    const db = new Database(c.env.DB);

    const { url, state } = auth.getAuthUrl(allowPrivate);
    await db.storeOAuthState(state);

    setCookie(c, 'oauth_private', allowPrivate ? 'true' : 'false', {
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
        path: '/',
        maxAge: 600,
    });

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
