import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';
import { signSession } from '../shared/utils';

type Bindings = {
    SESSION_SIGNING_KEY: string;
};

const debugApp = new Hono<{ Bindings: Bindings }>();

/**
 * Debug login route for local development.
 * Automatically logs in as 'demo_user' (mock-user-123).
 */
debugApp.get('/debug', async (c) => {
    // Only allow in local development (simple check)
    const url = new URL(c.req.url);
    if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
        return c.text('Debug login only allowed on localhost', 403);
    }

    const mockUserId = 'mock-user-123';
    const sessionId = await signSession(mockUserId, c.env.SESSION_SIGNING_KEY);

    setCookie(c, 'session', sessionId, {
        httpOnly: true,
        secure: false, // Local dev might not be HTTPS
        sameSite: 'Lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
    });

    return c.redirect('/dashboard');
});

export { debugApp };
