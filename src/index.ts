import { Hono } from 'hono';
import { Database } from './shared/db';
import { GithubAuth } from './auth/github';
import { encryptToken, signSession } from './shared/utils';
import { setCookie } from 'hono/cookie';
import { syncAndDecay } from './pet/sync';
import { renderPetCard, renderPlaceholderCard } from './card/renderer';

type Bindings = {
    DB: D1Database;
    GITHUB_CLIENT_ID: string;
    GITHUB_CLIENT_SECRET: string;
    TOKEN_ENCRYPTION_KEY: string;
    SESSION_SIGNING_KEY: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get('/', (c) => c.text('Petgotchi API Live'));

// Auth Routes
app.get('/auth/login', async (c) => {
    const auth = new GithubAuth(c.env.GITHUB_CLIENT_ID, c.env.GITHUB_CLIENT_SECRET);
    const db = new Database(c.env.DB);

    const { url, state } = auth.getAuthUrl();
    await db.storeOAuthState(state);

    return c.redirect(url);
});

app.get('/auth/callback', async (c) => {
    const code = c.req.query('code');
    const state = c.req.query('state');

    if (!code || !state) {
        return c.json({ error: 'Missing code or state' }, 400);
    }

    const db = new Database(c.env.DB);
    const isStateValid = await db.consumeOAuthState(state);
    if (!isStateValid) {
        return c.json({ error: 'Invalid or expired state' }, 403);
    }

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
        setCookie(c, 'session', sessionId, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            maxAge: 60 * 60 * 24 * 30, // 30 days
        });

        const pet = await db.fetchPet(user.userId);
        if (!pet) {
            return c.redirect('/onboarding');
        }

        return c.redirect('/dashboard');
    } catch (error) {
        console.error('OAuth Error:', error);
        return c.json({ error: 'OAuth exchange failed' }, 502);
    }
});

app.get('/api/card/:username', async (c) => {
    const username = c.req.param('username');
    const db = new Database(c.env.DB);

    const user = await c.env.DB.prepare('SELECT * FROM users WHERE github_username = ?')
        .bind(username)
        .first<any>();

    if (!user) {
        return c.body(renderPlaceholderCard(), 200, { 'Content-Type': 'image/svg+xml' });
    }

    const pet = await db.fetchPet(user.user_id);
    if (!pet) {
        return c.body(renderPlaceholderCard(), 200, { 'Content-Type': 'image/svg+xml' });
    }

    return c.body(renderPetCard(pet), 200, {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=300',
    });
});

import { getCookie } from 'hono/cookie';
import { verifySession } from './shared/utils';

app.post('/api/pet', async (c) => {
    const sessionCookie = getCookie(c, 'session');
    if (!sessionCookie) return c.redirect('/auth/login');

    const userId = await verifySession(sessionCookie, c.env.SESSION_SIGNING_KEY);
    if (!userId) return c.redirect('/auth/login');

    const { name, difficulty = 'normal' } = await c.req.parseBody();
    if (!name || typeof name !== 'string') {
        return c.json({ error: 'Valid pet name required' }, 400);
    }

    const db = new Database(c.env.DB);
    const existingPet = await db.fetchPet(userId);
    if (existingPet) return c.redirect('/dashboard');

    await db.createPet({
        userId,
        name: name.substring(0, 20),
        difficulty: difficulty as any,
    });

    return c.redirect('/dashboard');
});

app.get('/dashboard', async (c) => {
    const sessionCookie = getCookie(c, 'session');
    if (!sessionCookie) return c.redirect('/auth/login');

    const userId = await verifySession(sessionCookie, c.env.SESSION_SIGNING_KEY);
    if (!userId) return c.redirect('/auth/login');

    const db = new Database(c.env.DB);
    const pet = await db.fetchPet(userId);
    if (!pet) return c.redirect('/onboarding');

    return c.html(`
        <h1>Dashboard</h1>
        <p>Welcome back! Your pet <strong>${pet.name}</strong> is doing great.</p>
        <p>Level: ${Math.floor(Math.sqrt(pet.xp / 10))}</p>
        <a href="/u/${pet.name}">Public Profile</a>
    `);
});

app.get('/u/:username', async (c) => {
    const username = c.req.param('username');
    const db = new Database(c.env.DB);

    const user = await c.env.DB.prepare('SELECT * FROM users WHERE github_username = ?')
        .bind(username)
        .first<any>();

    if (!user) return c.notFound();

    const pet = await db.fetchPet(user.user_id);
    const hof = await db.fetchHallOfFame(user.user_id);

    return c.html(`
    <h1>${username}'s Pets</h1>
    ${pet ? `<h2>Active: ${pet.name} (Lv.${Math.floor(Math.sqrt(pet.xp / 10))})</h2>` : '<p>No active pet.</p>'}
    <h2>Hall of Fame</h2>
    <ul>${hof.map((h: any) => `<li>${h.name} - ${h.trait} (${h.xp} XP)</li>`).join('')}</ul>
  `);
});

app.post('/api/pet/retire', async (c) => {
    const petId = c.req.query('petId');
    if (!petId) return c.json({ error: 'Missing petId' }, 400);

    const db = new Database(c.env.DB);
    try {
        const { retirePet } = await import('./pet/prestige');
        const result = await retirePet(db, petId);
        return c.json(result);
    } catch (error) {
        return c.json({ error: (error as Error).message }, 400);
    }
});

app.get('/onboarding', async (c) => {
    const sessionCookie = getCookie(c, 'session');
    if (!sessionCookie) return c.redirect('/auth/login');

    const userId = await verifySession(sessionCookie, c.env.SESSION_SIGNING_KEY);
    if (!userId) return c.redirect('/auth/login');

    return c.html(`
        <h1>Adopt your Petgotchi</h1>
        <form action="/api/pet" method="POST">
            <input name="name" placeholder="Pet Name" required maxlength="20"/>
            <select name="difficulty">
                <option value="easy">Easy</option>
                <option value="normal" selected>Normal</option>
                <option value="hard">Hard</option>
            </select>
            <button type="submit">Adopt</button>
        </form>
    `);
});


export default {
    fetch: app.fetch,
    async scheduled(event: any, env: Bindings, ctx: any) {
        ctx.waitUntil(syncAndDecay(env));
    },
};
