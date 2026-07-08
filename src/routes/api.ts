import { Hono } from 'hono';
import { Database } from '../shared/db';
import { getAuthUser } from '../middleware/auth';
import { renderPetCard, renderPlaceholderCard } from '../card/renderer';
import { deleteCookie } from 'hono/cookie';
import { Bindings } from '../types';
import {
    getSafeDifficulty,
    getSafeLocale,
    requireSameOrigin,
    safeRedirectPath,
    sanitizePetName,
    setLocaleCookie,
} from '../shared/security';

export const apiRouter = new Hono<{ Bindings: Bindings }>({ strict: false });

apiRouter.use('*', requireSameOrigin);

apiRouter.get('/card/:username', async (c) => {
    const username = c.req.param('username');
    const db = new Database(c.env.DB);

    const user = await c.env.DB.prepare('SELECT * FROM users WHERE github_username = ?')
        .bind(username)
        .first<any>();

    if (!user) return c.body(renderPlaceholderCard(), 200, { 'Content-Type': 'image/svg+xml' });

    const pet = await db.fetchPet(user.user_id);
    if (!pet) return c.body(renderPlaceholderCard(), 200, { 'Content-Type': 'image/svg+xml' });

    const origin = new URL(c.req.url).origin;
    const dashboardUrl = `${origin}/dashboard`;

    return c.body(renderPetCard(pet, dashboardUrl), 200, {
        'Content-Type': 'image/svg+xml',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'public, max-age=300',
    });
});

apiRouter.post('/user/settings', async (c) => {
    const db = new Database(c.env.DB);
    const user = await getAuthUser(c, db);
    if (!user) return c.redirect('/auth/login');

    const { allowPrivateRepos } = await c.req.parseBody();
    const enablePrivate = allowPrivateRepos === 'true';

    if (enablePrivate) {
        return c.redirect('/auth/login?private=true');
    } else {
        await db.updateUserSettings(user.userId, false);
        return c.redirect('/dashboard');
    }
});

apiRouter.post('/user/delete', async (c) => {
    const db = new Database(c.env.DB);
    const user = await getAuthUser(c, db);
    if (!user) return c.redirect('/auth/login');

    const { confirm } = await c.req.parseBody();
    if (confirm !== 'DELETE') {
        return c.json({ error: 'Please type DELETE to confirm' }, 400);
    }

    await db.deleteUser(user.userId);
    deleteCookie(c, 'session', { path: '/' });
    return c.redirect('/');
});

apiRouter.post('/pet/reset', async (c) => {
    const db = new Database(c.env.DB);
    const user = await getAuthUser(c, db);
    if (!user) return c.redirect('/auth/login');

    const pet = await db.fetchPet(user.userId);
    if (pet) {
        await db.deletePet(pet.petId);
    }
    
    return c.redirect('/onboarding');
});

apiRouter.post('/pet', async (c) => {
    const db = new Database(c.env.DB);
    const user = await getAuthUser(c, db);
    if (!user) return c.redirect('/auth/login');

    const { name, difficulty = 'normal' } = await c.req.parseBody();
    if (!name || typeof name !== 'string') return c.json({ error: 'Valid pet name required' }, 400);

    const petName = sanitizePetName(name);
    if (!petName) return c.json({ error: 'Valid pet name required' }, 400);

    const existingPet = await db.fetchPet(user.userId);
    if (existingPet) return c.redirect('/dashboard');

    await db.createPet({
        userId: user.userId,
        name: petName,
        difficulty: getSafeDifficulty(difficulty),
    });

    return c.redirect('/dashboard');
});

apiRouter.post('/pet/retire', async (c) => {
    const petId = c.req.query('petId');
    if (!petId) return c.json({ error: 'Missing petId' }, 400);

    const db = new Database(c.env.DB);
    const user = await getAuthUser(c, db);
    if (!user) return c.redirect('/auth/login');

    try {
        const pet = await db.fetchPetById(petId);
        if (!pet || pet.userId !== user.userId) {
            return c.json({ error: 'Pet not found' }, 404);
        }

        const { retirePet } = await import('../pet/prestige');
        await retirePet(db, petId);
        return c.redirect('/dashboard');
    } catch (error) {
        return c.json({ error: (error as Error).message }, 400);
    }
});

apiRouter.get('/locale', (c) => {
    const lang = getSafeLocale(c.req.query('lang'));
    const referer = c.req.header('Referer') || '/';

    setLocaleCookie(c, lang);
    return c.redirect(safeRedirectPath(referer, c.req.url));
});
