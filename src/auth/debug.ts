import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';
import { signSession } from '../shared/utils';
import { Database } from '../shared/db';
import { PetStage, PetTrait } from '../shared/types';
import { escapeHtml, requireSameOrigin } from '../shared/security';

type Bindings = {
    DB: D1Database;
    SESSION_SIGNING_KEY: string;
};

const debugApp = new Hono<{ Bindings: Bindings }>({ strict: false });
debugApp.use('*', requireSameOrigin);

const MOCK_USER_ID = 'mock-user-123';
const MOCK_USERNAME = 'demo_user';

/**
 * Debug login action.
 */
debugApp.get('/login', async (c) => {
    const sessionId = await signSession(MOCK_USER_ID, c.env.SESSION_SIGNING_KEY);
    const db = new Database(c.env.DB);
    const expiresAt = Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 30);
    await db.createSession(MOCK_USER_ID, sessionId, expiresAt);

    setCookie(c, 'session', sessionId, {
        httpOnly: true,
        secure: new URL(c.req.url).protocol === 'https:',
        sameSite: 'Lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
    });

    return c.redirect('/dashboard');
});

/**
 * Update stats action.
 */
debugApp.post('/stats', async (c) => {
    const db = new Database(c.env.DB);
    const body = await c.req.parseBody();

    const pet = await db.fetchPet(MOCK_USER_ID);
    if (!pet) return c.text('Pet not found', 404);

    await db.updatePetStats(pet.petId, {
        hunger: parseFloat(body.hunger as string),
        happiness: parseFloat(body.happiness as string),
        xp: parseInt(body.xp as string),
        stage: parseInt(body.stage as string) as PetStage,
        trait: body.trait as PetTrait,
    });

    return c.redirect('/debug?msg=Stats updated');
});

/**
 * Simulate activity action.
 */
debugApp.post('/activity', async (c) => {
    const db = new Database(c.env.DB);
    const body = await c.req.parseBody();
    const type = body.type as string;

    const pet = await db.fetchPet(MOCK_USER_ID);
    if (!pet) return c.text('Pet not found', 404);

    let hunger = 0, happiness = 0, xp = 0;

    if (type === 'PUSH') { hunger = 15; happiness = 5; xp = 10; }
    else if (type === 'PR_OPEN') { hunger = 10; happiness = 15; xp = 15; }
    else if (type === 'PR_MERGE') { hunger = 15; happiness = 30; xp = 25; }
    else if (type === 'REVIEW') { hunger = 5; happiness = 20; xp = 15; }

    await db.logActivity({
        userId: MOCK_USER_ID,
        petId: pet.petId,
        eventType: type,
        githubEventId: `debug-${Date.now()}`,
        repoName: 'debug/repo',
        hungerDelta: hunger,
        happinessDelta: happiness,
        xpDelta: xp,
        multiplier: 1.0,
        scoredAt: Math.floor(Date.now() / 1000),
        logId: crypto.randomUUID(),
        commitCount: null,
        linesChanged: null,
        notes: `Debug Simulation: ${type}`
    });

    await db.updatePetStats(pet.petId, {
        hunger: Math.max(0, Math.min(100, pet.hunger + hunger)),
        happiness: Math.max(0, Math.min(100, pet.happiness + happiness)),
        xp: pet.xp + xp
    });

    return c.redirect(`/debug?msg=Activity simulated: ${type}`);
});

/**
 * Direct Card Rendering for Debug User.
 */
debugApp.get('/card', async (c) => {
    const db = new Database(c.env.DB);
    const pet = await db.fetchPet(MOCK_USER_ID);
    
    const { renderPetCard, renderPlaceholderCard } = await import('../card/renderer');
    
    if (!pet) return c.body(renderPlaceholderCard(), 200, { 'Content-Type': 'image/svg+xml' });

    return c.body(renderPetCard(pet), 200, {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-cache',
    });
});

/**
 * Combined Debug Dashboard.
 */
debugApp.get('/', async (c) => {
    const db = new Database(c.env.DB);
    const pet = await db.fetchPet(MOCK_USER_ID);

    const { renderLayout } = await import('../shared/style');
    const { renderPetCard } = await import('../card/renderer');

    const msg = c.req.query('msg');
    const safeMsg = msg ? escapeHtml(msg) : '';

    const traits = ['lone_coder', 'collaborator', 'craftsman', 'architect', 'sprinter'];
    const stages = [2, 3, 4];

    let html = `
        <div style="max-width: 1200px; margin: 0 auto; padding: 2rem;">
            ${safeMsg ? `<div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); color: #10b981; padding: 1rem; border-radius: 0.75rem; margin-bottom: 2rem; font-weight: 600;">✅ ${safeMsg}</div>` : ''}

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 3rem;">
                <!-- Live Preview -->
                <div class="glass-card" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem; min-height: 400px;">
                    <h3 style="margin-bottom: 1.5rem; color: var(--text-muted); font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.1em;">Live Card Preview</h3>
                    ${pet ? `
                        <img src="/debug/card?t=${Date.now()}" style="width: 100%; max-width: 420px; border-radius: 1rem; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);" />
                        <p style="margin-top: 1.5rem; font-size: 0.8rem; color: var(--text-muted);">Points to /debug/card</p>
                    ` : `
                        <div style="color: var(--text-muted); font-style: italic;">No pet found for mock user.</div>
                    `}
                </div>

                <!-- Control Panel -->
                <div class="glass-card" style="padding: 2rem;">
                    <h3 style="margin-bottom: 1.5rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem;">Control Panel</h3>
                    
                    <section style="margin-bottom: 2rem;">
                        <h4 style="font-size: 0.85rem; color: var(--primary); margin-bottom: 1rem;">Simulate GitHub Activity</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                            <form action="/debug/activity" method="POST"><input type="hidden" name="type" value="PUSH"/><button type="submit" class="btn" style="width: 100%; font-size: 0.8rem; padding: 0.6rem;">Push (Commit)</button></form>
                            <form action="/debug/activity" method="POST"><input type="hidden" name="type" value="PR_OPEN"/><button type="submit" class="btn" style="width: 100%; font-size: 0.8rem; padding: 0.6rem;">PR Opened</button></form>
                            <form action="/debug/activity" method="POST"><input type="hidden" name="type" value="PR_MERGE"/><button type="submit" class="btn" style="width: 100%; font-size: 0.8rem; padding: 0.6rem;">PR Merged</button></form>
                            <form action="/debug/activity" method="POST"><input type="hidden" name="type" value="REVIEW"/><button type="submit" class="btn" style="width: 100%; font-size: 0.8rem; padding: 0.6rem;">Code Review</button></form>
                        </div>
                    </section>

                    <section>
                        <h4 style="font-size: 0.85rem; color: var(--primary); margin-bottom: 1rem;">Manual Stat Editor</h4>
                        <form action="/debug/stats" method="POST" style="display: flex; flex-direction: column; gap: 1rem;">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                                <div>
                                    <label style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.25rem;">Hunger (0-100)</label>
                                    <input type="number" name="hunger" value="${pet?.hunger || 100}" step="1" min="0" max="100" />
                                </div>
                                <div>
                                    <label style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.25rem;">Happiness (0-100)</label>
                                    <input type="number" name="happiness" value="${pet?.happiness || 100}" step="1" min="0" max="100" />
                                </div>
                                <div>
                                    <label style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.25rem;">XP</label>
                                    <input type="number" name="xp" value="${pet?.xp || 0}" step="10" />
                                </div>
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                                <div>
                                    <label style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.25rem;">Stage (0-4)</label>
                                    <select name="stage">
                                        ${[0, 1, 2, 3, 4].map(s => `<option value="${s}" ${pet?.stage === s ? 'selected' : ''}>Stage ${s}</option>`).join('')}
                                    </select>
                                </div>
                                <div>
                                    <label style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.25rem;">Trait</label>
                                    <select name="trait">
                                        <option value="">None (Youngling)</option>
                                        ${traits.map(t => `<option value="${t}" ${pet?.trait === t ? 'selected' : ''}>${t.toUpperCase()}</option>`).join('')}
                                    </select>
                                </div>
                            </div>
                            <button type="submit" class="btn" style="margin-top: 0.5rem; background: rgba(255,255,255,0.1); border: 1px solid var(--border);">Update Pet Stats</button>
                        </form>
                    </section>
                </div>
            </div>
        </div>
    `;

    return c.html(renderLayout('Debug Dashboard', html));
});

export { debugApp };
