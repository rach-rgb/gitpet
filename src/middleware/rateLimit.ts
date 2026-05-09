import { Context, Next } from 'hono';

// Simple in-memory rate limiting for sensitive routes
const loginRateLimit = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 5;

export const rateLimiter = async (c: Context, next: Next) => {
    const ip = c.req.header('CF-Connecting-IP') || 'unknown';
    const now = Date.now();
    const entry = loginRateLimit.get(ip) || { count: 0, lastReset: now };

    if (now - entry.lastReset > RATE_LIMIT_WINDOW) {
        entry.count = 1;
        entry.lastReset = now;
    } else {
        entry.count++;
    }

    loginRateLimit.set(ip, entry);

    if (entry.count > MAX_REQUESTS) {
        return c.text('Too many login attempts. Please try again in a minute.', 429);
    }
    await next();
};
