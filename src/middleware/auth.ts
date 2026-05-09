import { Context } from 'hono';
import { Database } from '../shared/db';
import { verifySession } from '../shared/utils';
import { getCookie } from 'hono/cookie';
import { Bindings } from '../types';

/**
 * Helper to get the authenticated user for layout rendering.
 */
export async function getAuthUser(c: Context<{ Bindings: Bindings }>, db: Database) {
    const sessionCookie = getCookie(c, 'session');
    if (!sessionCookie) return null;

    const userId = await verifySession(sessionCookie, c.env.SESSION_SIGNING_KEY);
    if (!userId) return null;

    // Verify session existence in DB
    const isSessionValid = await db.verifySessionInDb(sessionCookie);
    if (!isSessionValid) return null;

    return await db.fetchUserByUserId(userId);
}
