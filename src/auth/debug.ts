import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';
import { signSession } from '../shared/utils';

type Bindings = {
    DB: D1Database;
    SESSION_SIGNING_KEY: string;
};

const debugApp = new Hono<{ Bindings: Bindings }>();

/**
 * Debug login route for local development.
 * Automatically logs in as 'demo_user' (mock-user-123).
 */
debugApp.get('/debug', async (c) => {
    const mockUserId = 'mock-user-123';
    const sessionId = await signSession(mockUserId, c.env.SESSION_SIGNING_KEY);

    // Also create session in DB
    const { Database } = await import('../shared/db');
    const db = new Database(c.env.DB);
    const expiresAt = Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 30);
    await db.createSession(mockUserId, sessionId, expiresAt);

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
