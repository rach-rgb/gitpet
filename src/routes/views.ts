import { Hono } from 'hono';
import { Database } from '../shared/db';
import { getAuthUser } from '../middleware/auth';
import { renderLayout } from '../shared/style';
import { Bindings } from '../types';
import { Locale, getT } from '../shared/i18n';

import { getCookie } from 'hono/cookie';

export const viewsRouter = new Hono<{ Bindings: Bindings }>({ strict: false });

// Helper to determine locale from request
const getLocale = (c: any): Locale => {
    // 1. Check cookie
    const cookieLang = getCookie(c, 'lang');
    if (cookieLang === 'ko' || cookieLang === 'en') return cookieLang;

    // 2. Check header
    const lang = c.req.header('Accept-Language');
    if (lang && lang.toLowerCase().startsWith('ko')) return 'ko';
    return 'en';
};

viewsRouter.get('/', async (c) => {
    const db = new Database(c.env.DB);
    const user = await getAuthUser(c, db);
    const locale = getLocale(c);
    const t = getT(locale);

    if (user && c.req.query('no_redirect') !== 'true') {
        return c.redirect('/dashboard');
    }

    return c.html(renderLayout(t('nav_dashboard'), `
        <div class="glass-card" style="text-align: center; border: none; padding: 4rem 2rem;">
            <h1 style="font-size: 3rem; margin-bottom: 1.5rem;">${t('home_title')}</h1>
            <p style="font-size: 1.25rem; color: var(--muted); margin-bottom: 3rem; max-width: 600px; margin-left: auto; margin-right: auto;">
                ${t('home_subtitle')}
            </p>
            ${user ? `
                <a href="/dashboard" class="btn">${t('nav_dashboard')}</a>
            ` : `
                <a href="/auth/login" class="btn">${t('nav_login')}</a>
            `}
        </div>
        <div style="margin-top: 3rem; display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
            <div class="glass-card" style="padding: 2rem; border-color: var(--hairline-soft);">
                <h3 style="margin-bottom: 1rem;">${t('home_card1_title')}</h3>
                <p style="color: var(--muted); font-size: 1rem;">${t('home_card1_desc')}</p>
            </div>
            <div class="glass-card" style="padding: 2rem; border-color: var(--hairline-soft);">
                <h3 style="margin-bottom: 1rem;">${t('home_card2_title')}</h3>
                <p style="color: var(--muted); font-size: 1rem;">${t('home_card2_desc')}</p>
            </div>
        </div>
    `, user ? { username: user.githubUsername } : undefined, locale));
});

viewsRouter.get('/dashboard', async (c) => {
    const db = new Database(c.env.DB);
    const user = await getAuthUser(c, db);
    const locale = getLocale(c);
    const t = getT(locale);
    if (!user) return c.redirect('/auth/login');

    const pet = await db.fetchPet(user.userId);
    if (!pet) return c.redirect('/onboarding');

    const activities = await db.fetchRecentActivity(user.userId, 5);

    const getEventIcon = (type: string) => {
        const t = type.toLowerCase();
        if (t.includes('push')) return '📦';
        if (t.includes('pullrequestreview')) return '👁️';
        if (t.includes('pullrequest')) return '🔀';
        if (t.includes('issue')) return '🎫';
        return '⚡';
    };

    return c.html(renderLayout(t('nav_dashboard'), `
        <div class="glass-card" style="margin-bottom: 2rem; position: relative; padding: 3rem;">
            <div style="position: absolute; top: 2rem; right: 2rem;">
                <a href="/guide" style="color: var(--muted); font-size: 0.9rem; text-decoration: underline; font-weight: 500;">${t('nav_guide')}</a>
            </div>
            <div style="display: flex; justify-content: center; margin-bottom: 3rem;">
                <img src="/api/card/${user.githubUsername}" alt="Pet Card" style="border-radius: 14px; width: 100%; max-width: 420px; box-shadow: var(--shadow);"/>
            </div>

                <h2 style="margin-bottom: 1.5rem; font-size: 1.25rem;">${t('dash_activity')}</h2>
                ${activities.length > 0 ? `
                    <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 2rem;">
                        ${activities.map((a: any) => `
                            <div style="display: flex; align-items: center; justify-content: space-between; padding: 1rem; background: var(--surface-soft); border-radius: 12px; border: 1px solid var(--hairline);">
                                <div style="display: flex; align-items: center; gap: 1rem;">
                                    <span style="font-size: 1.5rem;">${getEventIcon(a.event_type)}</span>
                                    <div>
                                        <div style="font-weight: 600; font-size: 1rem; color: var(--ink);">${a.event_type.replace('_', ' ').toUpperCase()}</div>
                                        <div style="font-size: 0.85rem; color: var(--muted);">${a.repo_name || 'GitHub Activity'}</div>
                                    </div>
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-weight: 700; color: var(--primary); font-size: 1rem;">+${a.xp_delta} XP</div>
                                    <div style="font-size: 0.8rem; color: var(--muted);">${new Date(a.scored_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <p style="color: var(--muted); font-size: 0.9rem; margin-bottom: 2rem;">${t('dash_no_activity')}</p>
                `}

                <h3 style="margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; border-top: 1px solid var(--hairline); padding-top: 2rem;">
                    ${t('dash_share_title')}
                </h3>
                <p style="color: var(--muted); font-size: 0.9rem; margin-bottom: 0.5rem;">${t('dash_share_desc')}</p>
                <div class="code-snippet" id="snippet" onclick="copySnippet()">
                    ![GitChi](https://gitchi.dev/api/card/${user.githubUsername})
                </div>
                <p id="copy-msg" style="color: var(--primary); font-size: 0.8rem; height: 1rem; opacity: 0; transition: opacity 0.2s; margin-bottom: 1rem;">${t('dash_copied')}</p>

                <details style="margin-top: 1rem;">
                    <summary style="cursor: pointer; color: var(--muted); font-size: 0.9rem; font-weight: 600; outline: none;">
                        ${t('dash_how_to')}
                    </summary>
                    <div style="margin-top: 1.5rem; padding-left: 0.5rem; border-left: 2px solid var(--hairline);">
                        <div class="guide-step">
                            <div class="step-number">1</div>
                            <p style="font-size: 0.9rem;">${t('dash_step1')}</p>
                        </div>
                        <div class="guide-step">
                            <div class="step-number">2</div>
                            <p style="font-size: 0.9rem;">${t('dash_step2')}</p>
                        </div>
                        <div class="guide-step">
                            <div class="step-number">3</div>
                            <p style="font-size: 0.9rem;">${t('dash_step3')}</p>
                        </div>
                    </div>
                </details>
            </div>

            <!-- Actions -->
            <div class="glass-card" style="margin-bottom: 2rem; border: 1px solid rgba(244, 67, 54, 0.2);">
                <h2 style="color: #c13515; margin-bottom: 1rem; font-size: 1.1rem;">${t('dash_danger_zone')}</h2>
                <p style="color: var(--muted); font-size: 0.9rem; margin-bottom: 1.5rem;">
                    ${t('dash_danger_desc')}
                </p>
                <div style="display: flex; gap: 1rem; align-items: center;">
                    <form action="/api/pet/reset" method="POST" onsubmit="return confirm('Really reset?')">
                        <button type="submit" class="btn" style="background: rgba(244, 67, 54, 0.05); color: #c13515; border: 1px solid rgba(244, 67, 54, 0.2);">${t('dash_btn_restart')}</button>
                    </form>
                    <form action="/api/user/delete" method="POST" onsubmit="event.preventDefault(); const res = prompt('To delete, type DELETE:'); if(res === 'DELETE') this.submit();">
                        <input type="hidden" name="confirm" value="DELETE" />
                        <button type="submit" class="btn" style="background: #c13515; color: #fff;">${t('dash_btn_delete')}</button>
                    </form>
                    ${pet.stage === 4 ? `
                    <form action="/api/pet/retire?petId=${pet.petId}" method="POST" onsubmit="return confirm('Really retire?')">
                        <button type="submit" class="btn btn-secondary">${t('dash_btn_retire')}</button>
                    </form>
                    ` : ''}
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
    `, { username: user.githubUsername }, locale));
});

viewsRouter.get('/onboarding', async (c) => {
    const db = new Database(c.env.DB);
    const user = await getAuthUser(c, db);
    const locale = getLocale(c);
    const t = getT(locale);
    if (!user) return c.redirect('/auth/login');

    const pet = await db.fetchPet(user.userId);
    if (pet) return c.redirect('/dashboard');

    return c.html(renderLayout(t('onboard_title'), `
        <div class="glass-card">
            <h1>${t('onboard_title')}</h1>
            <p style="color: var(--muted); margin-bottom: 2rem;">${t('onboard_desc')}</p>
            <form action="/api/pet" method="POST">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">${t('onboard_label_name')}</label>
                <input name="name" placeholder="E.g. Octocat" required maxlength="20"/>
                
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">${t('onboard_label_diff')}</label>
                <select name="difficulty">
                    <option value="easy">${t('onboard_diff_easy')}</option>
                    <option value="normal" selected>${t('onboard_diff_normal')}</option>
                    <option value="hard">${t('onboard_diff_hard')}</option>
                </select>
                
                <button type="submit" class="btn" style="width: 100%;">${t('onboard_btn_submit')}</button>
            </form>
        </div>
    `, { username: user.githubUsername }, locale));
});

viewsRouter.get('/guide', async (c) => {
    const db = new Database(c.env.DB);
    const user = await getAuthUser(c, db);
    const locale = getLocale(c);
    const t = getT(locale);

    return c.html(renderLayout(t('nav_guide'), `
        <h1>${t('guide_title')}</h1>
        <p style="color: var(--muted); margin-bottom: 2rem;">${t('guide_subtitle')}</p>

        <div class="glass-card" style="margin-bottom: 2rem;">
            <h2>${t('guide_stats_title')}</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-top: 1rem;">
                <div>
                    <h3 style="color: var(--ink); margin-bottom: 0.5rem;">${t('guide_fullness')}</h3>
                    <p style="font-size: 1rem; color: var(--muted);">${t('guide_fullness_desc')}</p>
                </div>
                <div>
                    <h3 style="color: var(--ink); margin-bottom: 0.5rem;">${t('guide_happiness')}</h3>
                    <p style="font-size: 1rem; color: var(--muted);">${t('guide_happiness_desc')}</p>
                </div>
                <div>
                    <h3 style="color: var(--ink); margin-bottom: 0.5rem;">${t('guide_health')}</h3>
                    <p style="font-size: 1rem; color: var(--muted);">${t('guide_health_desc')}</p>
                </div>
                <div>
                    <h3 style="color: var(--ink); margin-bottom: 0.5rem;">${t('guide_xp')}</h3>
                    <p style="font-size: 1rem; color: var(--muted);">${t('guide_xp_desc')}</p>
                </div>
            </div>
        </div>

        <div class="glass-card" style="margin-bottom: 2rem;">
            <h2>${t('guide_table_title')}</h2>
            <p style="color: var(--muted); font-size: 1rem; margin-bottom: 1.5rem;">${t('guide_table_desc')}</p>
            <table style="width: 100%; border-collapse: collapse; font-size: 1rem;">
                <thead>
                    <tr style="border-bottom: 1px solid var(--hairline); text-align: left;">
                        <th style="padding: 1rem;">${t('guide_action')}</th>
                        <th style="padding: 1rem;">${t('guide_bonus')}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="border-bottom: 1px solid var(--hairline);">
                        <td style="padding: 1rem;">${t('action_push')}</td>
                        <td style="padding: 1rem; color: var(--primary); font-weight: 600;">+15 ${t('guide_fullness')}, +10 XP</td>
                    </tr>
                    <tr style="border-bottom: 1px solid var(--hairline);">
                        <td style="padding: 1rem;">${t('action_pr_open')}</td>
                        <td style="padding: 1rem; color: var(--primary); font-weight: 600;">+15 ${t('guide_happiness')}, +10 XP</td>
                    </tr>
                    <tr style="border-bottom: 1px solid var(--hairline);">
                        <td style="padding: 1rem;">${t('action_pr_merge')}</td>
                        <td style="padding: 1rem; color: var(--primary); font-weight: 600;">+30 ${t('guide_happiness')}, +25 XP</td>
                    </tr>
                    <tr style="border-bottom: 1px solid var(--hairline);">
                        <td style="padding: 1rem;">${t('action_review')}</td>
                        <td style="padding: 1rem; color: var(--primary); font-weight: 600;">+20 ${t('guide_happiness')}, +15 XP</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="glass-card" style="margin-bottom: 2rem;">
            <h2>${t('guide_life_title')}</h2>
            <div style="margin-top: 1rem;">
                <div class="guide-step">
                    <div class="step-number">0</div>
                    <div>
                        <strong>${t('stage0_name')}</strong>
                        <p style="font-size: 0.9rem; color: var(--muted);">${t('stage0_desc')}</p>
                    </div>
                </div>
                <div class="guide-step">
                    <div class="step-number">1</div>
                    <div>
                        <strong>${t('stage1_name')}</strong>
                        <p style="font-size: 0.9rem; color: var(--muted);">${t('stage1_desc')}</p>
                    </div>
                </div>
                <div class="guide-step">
                    <div class="step-number">2</div>
                    <div>
                        <strong>${t('stage2_name')}</strong>
                        <p style="font-size: 0.9rem; color: var(--muted);">${t('stage2_desc')}</p>
                    </div>
                </div>
                <div class="guide-step">
                    <div class="step-number">3</div>
                    <div>
                        <strong>${t('stage3_name')}</strong>
                        <p style="font-size: 0.9rem; color: var(--muted);">${t('stage3_desc')}</p>
                    </div>
                </div>
                <div class="guide-step">
                    <div class="step-number">4</div>
                    <div>
                        <strong>${t('stage4_name')}</strong>
                        <p style="font-size: 0.9rem; color: var(--muted);">${t('stage4_desc')}</p>
                    </div>
                </div>
            </div>
        </div>
    `, user ? { username: user.githubUsername } : undefined, locale));
});
