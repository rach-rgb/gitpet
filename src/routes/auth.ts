import { Hono } from 'hono';
import { Database } from '../shared/db';
import { GithubAuth } from '../auth/github';
import { encryptToken, signSession } from '../shared/utils';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import { rateLimiter } from '../middleware/rateLimit';
import { Bindings } from '../types';

export const authRouter = new Hono<{ Bindings: Bindings }>();

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


authRouter.get('/callback', async (c) => {
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

        const encryptedToken = await encryptToken(accessToken, c.env.TOKEN_ENCRYPTION_KEY);
        const user = await db.upsertUser({
            githubId: githubUser.id,
            githubUsername: githubUser.login,
            tokenEncrypted: encryptedToken,
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
