import { Hono } from 'hono';
import { Database } from './shared/db';
import { GithubAuth } from './auth/github';
import { encryptToken, signSession, verifySession } from './shared/utils';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import { syncAndDecay } from './pet/sync';
import { renderPetCard, renderPlaceholderCard } from './card/renderer';
import { renderLayout } from './shared/style';
import { debugApp } from './auth/debug';

type Bindings = {
    DB: D1Database;
    GITHUB_CLIENT_ID: string;
    GITHUB_CLIENT_SECRET: string;
    TOKEN_ENCRYPTION_KEY: string;
    SESSION_SIGNING_KEY: string;
};

const app = new Hono<{ Bindings: Bindings }>();

/**
 * Helper to get the authenticated user for layout rendering.
 */
async function getAuthUser(c: any, db: Database) {
    const sessionCookie = getCookie(c, 'session');
    if (!sessionCookie) return null;
    const userId = await verifySession(sessionCookie, c.env.SESSION_SIGNING_KEY);
    if (!userId) return null;
    return await db.fetchUserByUserId(userId);
}

app.get('/', async (c) => {
    const db = new Database(c.env.DB);
    const user = await getAuthUser(c, db);

    return c.html(renderLayout('Home', `
        <div class="glass-card" style="text-align: center;">
            <h1>Grow your Pet with Code 👾</h1>
            <p style="font-size: 1.25rem; color: var(--text-muted); margin-bottom: 2rem;">
                Gitpet uses your GitHub activity to feed and level up your virtual companion.
            </p>
            ${user ? `
                <a href="/dashboard" class="btn">Go to Dashboard</a>
            ` : `
                <a href="/auth/login" class="btn">Connect with GitHub</a>
                <div style="margin-top: 1rem;">
                    <a href="/auth/debug" style="color: var(--text-muted); font-size: 0.8rem; text-decoration: none;">[Dev] Debug Login</a>
                </div>
            `}
        </div>
        <div style="margin-top: 3rem; display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
            <div class="glass-card" style="padding: 1.5rem;">
                <h3>Commit to Feed</h3>
                <p style="color: var(--text-muted); font-size: 0.9rem;">Your daily commits translate to hunger points, keeping your pet healthy.</p>
            </div>
            <div class="glass-card" style="padding: 1.5rem;">
                <h3>Unlock Traits</h3>
                <p style="color: var(--text-muted); font-size: 0.9rem;">Depending on your coding style, your pet evolves with unique traits.</p>
            </div>
        </div>
    `, user ? { username: user.githubUsername } : undefined));
});

// Auth Routes
app.get('/auth/login', async (c) => {
    const auth = new GithubAuth(c.env.GITHUB_CLIENT_ID, c.env.GITHUB_CLIENT_SECRET);
    const db = new Database(c.env.DB);

    const { url, state } = auth.getAuthUrl();
    await db.storeOAuthState(state);

    return c.redirect(url);
});

app.get('/auth/logout', (c) => {
    deleteCookie(c, 'session', { path: '/' });
    return c.redirect('/');
});

app.route('/auth', debugApp);

app.get('/auth/callback', async (c) => {
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

app.get('/api/card/:username', async (c) => {
    const username = c.req.param('username');
    const db = new Database(c.env.DB);

    const user = await c.env.DB.prepare('SELECT * FROM users WHERE github_username = ?')
        .bind(username)
        .first<any>();

    if (!user) return c.body(renderPlaceholderCard(), 200, { 'Content-Type': 'image/svg+xml' });

    const pet = await db.fetchPet(user.user_id);
    if (!pet) return c.body(renderPlaceholderCard(), 200, { 'Content-Type': 'image/svg+xml' });

    return c.body(renderPetCard(pet), 200, {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=300',
    });
});

app.post('/api/pet', async (c) => {
    const db = new Database(c.env.DB);
    const user = await getAuthUser(c, db);
    if (!user) return c.redirect('/auth/login');

    const { name, difficulty = 'normal' } = await c.req.parseBody();
    if (!name || typeof name !== 'string') return c.json({ error: 'Valid pet name required' }, 400);

    const existingPet = await db.fetchPet(user.userId);
    if (existingPet) return c.redirect('/dashboard');

    await db.createPet({
        userId: user.userId,
        name: name.substring(0, 20),
        difficulty: difficulty as any,
    });

    return c.redirect('/dashboard');
});

app.get('/dashboard', async (c) => {
    const db = new Database(c.env.DB);
    const user = await getAuthUser(c, db);
    if (!user) return c.redirect('/auth/login');

    const pet = await db.fetchPet(user.userId);
    if (!pet) return c.redirect('/onboarding');

    return c.html(renderLayout('Dashboard', `
        <h1 style="text-align: center; margin-bottom: 2rem;">My Gitpet</h1>
        <div class="glass-card" style="margin-bottom: 2rem;">
            <div style="display: flex; justify-content: center; margin-bottom: 1.5rem;">
                <img src="/api/card/${user.githubUsername}" alt="Pet Card" style="border-radius: 1rem; width: 100%; max-width: 420px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);"/>
            </div>
            <div style="text-align: center;">
                <h2 style="color: var(--text); font-weight: 800; margin-bottom: 1.5rem;">${pet.name}</h2>
                <div style="display: flex; justify-content: center; gap: 1rem; margin-bottom: 2rem;">
                    <a href="/u/${user.githubUsername}" class="btn">Public Profile</a>
                    <form action="/api/pet/retire?petId=${pet.petId}" method="POST" onsubmit="return confirm('Really retire your pet?')">
                        <button type="submit" class="btn btn-secondary">Retire Pet</button>
                    </form>
                </div>
            </div>

            <div class="guide-section">
                <h3 style="margin-bottom: 1rem;">Share on GitHub Profile 🚀</h3>
                <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 0.5rem;">Copy this snippet to your GitHub profile README:</p>
                <div class="code-snippet" id="snippet" onclick="copySnippet()">
                    [![Gitpet](https://petgotchi.dev/api/card/${user.githubUsername})](https://petgotchi.dev/u/${user.githubUsername})
                </div>
                <p id="copy-msg" style="color: var(--primary); font-size: 0.8rem; height: 1rem; opacity: 0; transition: opacity 0.2s;">Copied to clipboard!</p>

                <div style="margin-top: 2rem;">
                    <h4 style="margin-bottom: 1rem; font-size: 1rem; color: var(--text);">How to add to your profile:</h4>
                    <div class="guide-step">
                        <div class="step-number">1</div>
                        <p style="font-size: 0.9rem;">Go to your <a href="https://github.com/${user.githubUsername}" target="_blank" style="color: var(--primary);">GitHub Profile</a>.</p>
                    </div>
                    <div class="guide-step">
                        <div class="step-number">2</div>
                        <p style="font-size: 0.9rem;">Edit/Create the repo named <strong>${user.githubUsername}</strong>.</p>
                    </div>
                    <div class="guide-step">
                        <div class="step-number">3</div>
                        <p style="font-size: 0.9rem;">Paste the snippet into <code>README.md</code> and save!</p>
                    </div>
                </div>
            </div>
        </div>

        <script>
            function copySnippet() {
                const text = document.getElementById('snippet').innerText.trim();
                navigator.clipboard.writeText(text).then(() => {
                    const msg = document.getElementById('copy-msg');
                    msg.style.opacity = '1';
                    setTimeout(() => msg.style.opacity = '0', 2000);
                });
            }
        </script>
    `, { username: user.githubUsername }));
});

app.get('/onboarding', async (c) => {
    const db = new Database(c.env.DB);
    const user = await getAuthUser(c, db);
    if (!user) return c.redirect('/auth/login');

    const pet = await db.fetchPet(user.userId);
    if (pet) return c.redirect('/dashboard');

    return c.html(renderLayout('Adopt', `
        <div class="glass-card">
            <h1>Adopt your Gitpet</h1>
            <p style="color: var(--text-muted); margin-bottom: 2rem;">Give your new companion a name and choose a difficulty level. Difficulty affects how much code you need to write to keep them happy!</p>
            <form action="/api/pet" method="POST">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Pet Name</label>
                <input name="name" placeholder="E.g. Octocat" required maxlength="20"/>
                
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Difficulty</label>
                <select name="difficulty">
                    <option value="easy">Easy (Casual coder)</option>
                    <option value="normal" selected>Normal (Standard activity)</option>
                    <option value="hard">Hard (Hardcore committer)</option>
                </select>
                
                <button type="submit" class="btn" style="width: 100%;">Finalize Adoption</button>
            </form>
        </div>
    `, { username: user.githubUsername }));
});

app.get('/u/:username', async (c) => {
    const username = c.req.param('username');
    const db = new Database(c.env.DB);
    const authUser = await getAuthUser(c, db);

    const user = await c.env.DB.prepare('SELECT * FROM users WHERE github_username = ?')
        .bind(username)
        .first<any>();

    if (!user) return c.notFound();

    const pet = await db.fetchPet(user.user_id);
    const hof = await db.fetchHallOfFame(user.user_id);

    return c.html(renderLayout(`${username}'s Pets`, `
        <div style="text-align: center; margin-bottom: 3rem;">
            <h1>${username}'s Profile</h1>
        </div>
        
        ${pet ? `
            <div class="glass-card" style="margin-bottom: 2rem;">
                <h2>Active Pet</h2>
                <div style="display: flex; justify-content: center;">
                    <img src="/api/card/${username}" alt="Pet Card" style="border-radius: 1rem; width: 100%; max-width: 420px;"/>
                </div>
            </div>
        ` : `
            <div class="glass-card" style="text-align: center;">
                <p style="color: var(--text-muted);">No active pet found.</p>
            </div>
        `}
        
        <div class="glass-card" style="margin-top: 2rem;">
            <h2>Hall of Fame</h2>
            ${hof.length > 0 ? `
                <ul style="list-style: none;">
                    ${hof.map((h: any) => `
                        <li style="padding: 1rem 0; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="font-weight: 800; color: var(--primary);">${h.name}</div>
                                <div style="font-size: 0.8rem; color: var(--text-muted);">${h.trait} • ${h.difficulty.toUpperCase()}</div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-weight: 600;">${h.xp} XP</div>
                                <div style="font-size: 0.8rem; color: var(--text-muted);">Retired: ${new Date(h.retired_at * 1000).toLocaleDateString()}</div>
                            </div>
                        </li>
                    `).join('')}
                </ul>
            ` : `
                <p style="color: var(--text-muted);">No retired pets yet.</p>
            `}
        </div>
    `, authUser ? { username: authUser.githubUsername } : undefined));
});

app.post('/api/pet/retire', async (c) => {
    const petId = c.req.query('petId');
    if (!petId) return c.json({ error: 'Missing petId' }, 400);

    const db = new Database(c.env.DB);
    try {
        const { retirePet } = await import('./pet/prestige');
        const result = await retirePet(db, petId);
        return c.redirect('/dashboard');
    } catch (error) {
        return c.json({ error: (error as Error).message }, 400);
    }
});

export default {
    fetch: app.fetch,
    async scheduled(event: any, env: Bindings, ctx: any) {
        ctx.waitUntil(syncAndDecay(env));
    },
};
