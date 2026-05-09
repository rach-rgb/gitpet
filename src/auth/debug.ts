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

/**
 * Debug viewer for all sprites across all stages and traits.
 */
debugApp.get('/debug/sprites', async (c) => {
    const { renderPetCard } = await import('../card/renderer');
    const { renderLayout } = await import('../shared/style');

    const traits = ['owl', 'lone_coder', 'collaborator', 'craftsman', 'architect', 'sprinter'];
    const stages = [2, 3, 4, 5];
    const states = ['healthy', 'hungry', 'sad', 'sick', 'dormant'];

    let html = `
        <div style="max-width: 1200px; margin: 0 auto; padding: 3rem 2rem;">
            <header style="margin-bottom: 3rem; border-bottom: 1px solid var(--border); padding-bottom: 1.5rem;">
                <h1 style="color: white; margin-bottom: 0.5rem; font-size: 2.5rem; font-weight: 800;">Sprite Gallery</h1>
                <p style="color: var(--text-muted); font-size: 1.1rem;">A comprehensive overview of all evolution stages and emotional states.</p>
            </header>

            <div style="display: flex; flex-direction: column; gap: 5rem;">
    `;

    for (const trait of traits) {
        html += `
            <section>
                <h2 style="color: var(--primary); text-transform: capitalize; font-size: 1.5rem; margin-bottom: 2rem; display: flex; align-items: center; gap: 0.75rem;">
                    <span style="opacity: 0.5;">#</span> ${trait.replace('_', ' ')}
                </h2>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 1.5rem;">
        `;
        for (const stage of stages) {
            const pet = {
                name: `Stage ${stage}`,
                hunger: 100, happiness: 100, health: 100, xp: stage * stage * 10,
                difficulty: 'normal', stage: stage, trait: trait, isDormant: 0
            } as any;
            html += `
                <div style="background: rgba(15, 23, 42, 0.3); border-radius: 1rem; border: 1px solid var(--border); padding: 0.5rem; transition: transform 0.2s, border-color 0.2s;" onmouseover="this.style.transform='translateY(-4px)'; this.style.borderColor='var(--primary)'" onmouseout="this.style.transform='none'; this.style.borderColor='var(--border)'">
                    ${renderPetCard(pet)}
                </div>
            `;
        }
        html += `</div></section>`;
    }

    html += `
            <section style="margin-top: 4rem;">
                <header style="margin-bottom: 2rem; border-bottom: 1px solid var(--border); padding-bottom: 1rem;">
                    <h2 style="color: white; font-size: 1.8rem; font-weight: 700;">State Testing</h2>
                    <p style="color: var(--text-muted);">Previewing 'Lone Coder' (Stage 3) across different emotional states.</p>
                </header>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 1.5rem;">
    `;

    for (const state of states) {
        let hunger = 100, happiness = 100, health = 100, isDormant = 0;
        if (state === 'hungry') hunger = 10;
        if (state === 'sad') happiness = 10;
        if (state === 'sick') health = 10;
        if (state === 'dormant') isDormant = 1;

        const pet = {
            name: state.toUpperCase(),
            hunger, happiness, health, xp: 90,
            difficulty: 'normal', stage: 3, trait: 'lone_coder', isDormant
        } as any;
        html += `
            <div style="background: rgba(15, 23, 42, 0.3); border-radius: 1rem; border: 1px solid var(--border); padding: 0.5rem;">
                ${renderPetCard(pet)}
            </div>
        `;
    }
    html += `</div></section></div></div>`;

    return c.html(renderLayout('Sprite Debug', html));
});

/**
 * Resolution comparison test page.
 */
debugApp.get('/debug/resolution-test', async (c) => {
    const { renderPetCard } = await import('../card/renderer');
    const { renderLayout } = await import('../shared/style');
    const { SpriteRenderer } = await import('../card/sprite-renderer');

    // Sample JSONs
    const loneCoder16 = (await import('../sprites/traits/lone_coder.json')).default;
    const loneCoder32 = (await import('../sprites/traits/test_32.json')).default;
    const loneCoder64 = (await import('../sprites/traits/test_64.json')).default;

    const renderer = new SpriteRenderer();
    const palette = renderer.getPaletteForState('lone_coder', 'healthy');

    const renderCustom = (sprite: any, label: string, customPalette?: any) => {
        const svg = renderer.render(sprite, customPalette || palette as any);
        return `
            <div style="background: rgba(15, 23, 42, 0.3); border-radius: 1rem; border: 1px solid var(--border); padding: 1.5rem; text-align: center;">
                <h3 style="color: var(--primary); margin-bottom: 1rem;">${label}</h3>
                <div style="margin-bottom: 1.5rem; display: flex; justify-content: center;">
                    <svg width="200" height="200" viewBox="0 0 200 200" style="background: #1a1a2e; border-radius: 0.5rem;">
                        <g transform="translate(20, 20)">
                            ${svg}
                        </g>
                    </svg>
                </div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">
                    Resolution: ${sprite.width}x${sprite.height}<br>
                    Scale: ${sprite.scale}<br>
                    Complexity: ${sprite.frames.default.flat().filter((x: any) => x !== 0).length} pixels
                </div>
            </div>
        `;
    };

    const owlSprite = (await import('../sprites/shared/owl_hatchling.json')).default;
    const owlFinalSprite = (await import('../sprites/traits/owl_final.json')).default;

    let html = `
        <div style="max-width: 1200px; margin: 0 auto; padding: 3rem 2rem;">
            <header style="margin-bottom: 3rem; border-bottom: 1px solid var(--border); padding-bottom: 1.5rem;">
                <h1 style="color: white; margin-bottom: 0.5rem; font-size: 2.5rem; font-weight: 800;">Resolution Laboratory</h1>
                <p style="color: var(--text-muted); font-size: 1.1rem;">Comparing pixel art fidelity across different grid sizes.</p>
            </header>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; margin-bottom: 4rem;">
                ${renderCustom(loneCoder16, '16x16 (Original)')}
                ${renderCustom(loneCoder32, '32x32 (Enhanced)')}
                ${renderCustom(loneCoder64, '64x64 (Ultra)')}
            </div>

            <header style="margin-bottom: 2rem; border-bottom: 1px solid var(--border); padding-bottom: 1rem;">
                <h2 style="color: white; font-size: 1.8rem; font-weight: 700;">Real-world Application: Owl Hatchling</h2>
                <p style="color: var(--text-muted);">A clean 32x32 sprite generated from high-res source.</p>
            </header>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; margin-bottom: 4rem;">
                ${renderCustom(owlSprite, '32x32 Original (Palette)', renderer.getPaletteForState('owl', 'healthy'))}
                ${renderCustom(owlFinalSprite, '32x32 Final (High Fidelity)', {})}
            </div>

            <section class="glass-card" style="padding: 2rem;">
                <h2 style="color: white; margin-bottom: 1.5rem;">Fidelity Analysis</h2>
                <p style="color: var(--text-muted); line-height: 1.6;">
                    Increasing the resolution allows for smoother curves, more detailed facial expressions, and complex shading patterns. 
                    However, it also increases the SVG payload size. 
                    <br><br>
                    <b>Recommendation:</b> 32x32 provides a great balance between "pixel art" charm and sufficient detail for evolution stages.
                </p>
            </section>
        </div>
    `;

    return c.html(renderLayout('Resolution Test', html));
});

export { debugApp };
