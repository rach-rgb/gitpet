import { Context, Next } from 'hono';
import { setCookie } from 'hono/cookie';
import { Bindings } from '../types';

const SAFE_LOCALES = new Set(['ko', 'en']);

export function escapeHtml(value: unknown): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function encodePathSegment(value: unknown): string {
    return encodeURIComponent(String(value ?? ''));
}

export function getSafeLocale(value: unknown): 'ko' | 'en' {
    return value === 'ko' || value === 'en' ? value : 'ko';
}

export function sanitizePetName(value: string): string {
    return value.trim().replace(/\s+/g, ' ').slice(0, 20);
}

export function getSafeDifficulty(value: unknown): 'easy' | 'normal' | 'hard' {
    return value === 'easy' || value === 'normal' || value === 'hard' ? value : 'normal';
}

export function safeRedirectPath(value: string | undefined | null, requestUrl: string, fallback = '/'): string {
    if (!value) return fallback;

    try {
        const currentUrl = new URL(requestUrl);
        const redirectUrl = new URL(value, currentUrl.origin);
        if (redirectUrl.origin !== currentUrl.origin) return fallback;
        return `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`;
    } catch {
        return fallback;
    }
}

export function setLocaleCookie(c: Context, locale: string): void {
    const safeLocale = SAFE_LOCALES.has(locale) ? locale : 'ko';
    setCookie(c, 'lang', safeLocale, {
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
    });
}

export async function requireSameOrigin(c: Context<{ Bindings: Bindings }>, next: Next) {
    const method = c.req.method.toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
        await next();
        return;
    }

    const origin = c.req.header('Origin');
    const fetchSite = c.req.header('Sec-Fetch-Site');
    if (fetchSite === 'cross-site') {
        return c.text('Invalid request origin', 403);
    }

    if (!origin) {
        await next();
        return;
    }

    const requestOrigin = new URL(c.req.url).origin;
    if (origin !== requestOrigin) {
        return c.text('Invalid request origin', 403);
    }

    await next();
}

export async function securityHeaders(c: Context, next: Next) {
    await next();
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    c.header('X-Frame-Options', 'DENY');
    c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
}
