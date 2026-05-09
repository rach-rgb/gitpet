import { Hono } from 'hono';
import { Database } from '../shared/db';
import { getAuthUser } from '../middleware/auth';
import { renderLayout } from '../shared/style';
import { Bindings } from '../types';

export const viewsRouter = new Hono<{ Bindings: Bindings }>();

viewsRouter.get('/', async (c) => {
    const db = new Database(c.env.DB);
    const user = await getAuthUser(c, db);

    if (user && c.req.query('no_redirect') !== 'true') {
        return c.redirect('/dashboard');
    }

    return c.html(renderLayout('Home', `
        <div class="glass-card" style="text-align: center;">
            <h1>Grow your Pet with Code 👾</h1>
            <p style="font-size: 1.25rem; color: var(--text-muted); margin-bottom: 2rem;">
                GitChi uses your GitHub activity to feed and level up your virtual companion.
            </p>
            ${user ? `
                <a href="/dashboard" class="btn">Go to Dashboard</a>
            ` : `
                <a href="/auth/login" class="btn">Connect with GitHub</a>
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

viewsRouter.get('/dashboard', async (c) => {
    const db = new Database(c.env.DB);
    const user = await getAuthUser(c, db);
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

    return c.html(renderLayout('Dashboard', `
        <div class="glass-card" style="margin-bottom: 2rem; position: relative; padding-bottom: 4rem;">
            <div style="position: absolute; top: 1.5rem; right: 2rem;">
                <a href="/guide" style="color: var(--primary); font-size: 0.9rem; text-decoration: none; font-weight: 600;">📖 Guide</a>
            </div>
            <div style="display: flex; justify-content: center; margin-bottom: 1.5rem;">
                <img src="/api/card/${user.githubUsername}" alt="Pet Card" style="border-radius: 1rem; width: 100%; max-width: 420px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);"/>
            </div>

                <h2 style="margin-bottom: 1.5rem; font-size: 1.25rem;">Recent Activity</h2>
                ${activities.length > 0 ? `
                    <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 2rem;">
                        ${activities.map((a: any) => `
                            <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem; background: rgba(15, 23, 42, 0.5); border-radius: 0.75rem; border: 1px solid var(--border);">
                                <div style="display: flex; align-items: center; gap: 0.75rem;">
                                    <span style="font-size: 1.2rem;">${getEventIcon(a.event_type)}</span>
                                    <div>
                                        <div style="font-weight: 600; font-size: 0.9rem; color: var(--text);">${a.event_type.replace('_', ' ').toUpperCase()}</div>
                                        <div style="font-size: 0.75rem; color: var(--text-muted);">${a.repo_name || 'GitHub Activity'}</div>
                                    </div>
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-weight: 700; color: var(--primary); font-size: 0.85rem;">+${a.xp_delta} XP</div>
                                    <div style="font-size: 0.7rem; color: var(--text-muted);">${new Date(a.scored_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 2rem;">No recent activity. Start coding to grow your pet!</p>
                `}

                <h3 style="margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; border-top: 1px solid var(--border); padding-top: 1.5rem;">
                    Share on GitHub Profile 🚀
                </h3>
                <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 0.5rem;">Copy this snippet to your GitHub profile README:</p>
                <div class="code-snippet" id="snippet" onclick="copySnippet()">
                    ![Gitpet](https://petgotchi.dev/api/card/${user.githubUsername})
                </div>
                <p id="copy-msg" style="color: var(--primary); font-size: 0.8rem; height: 1rem; opacity: 0; transition: opacity 0.2s; margin-bottom: 1rem;">Copied to clipboard!</p>

                <details style="margin-top: 1rem;">
                    <summary style="cursor: pointer; color: var(--primary); font-size: 0.9rem; font-weight: 600; outline: none;">
                        How to add to your profile?
                    </summary>
                    <div style="margin-top: 1.5rem; padding-left: 0.5rem; border-left: 2px solid var(--border);">
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
                </details>
            </div>

            <!-- Actions positioned in bottom corner -->
            <div style="position: absolute; bottom: 1.5rem; right: 2rem; display: flex; gap: 1rem;">
                ${pet.stage === 4 ? `
                <form action="/api/pet/retire?petId=${pet.petId}" method="POST" onsubmit="return confirm('Really retire your pet?')">
                    <button type="submit" style="background: transparent; border: none; color: #f44336; font-size: 0.8rem; cursor: pointer; opacity: 0.6; text-decoration: underline;">Retire Pet</button>
                </form>
                ` : ''}
            </div>
        </div>

        <div class="glass-card" style="margin-bottom: 2rem; border: 1px solid rgba(244, 67, 54, 0.2);">
            <h2 style="color: #f44336; margin-bottom: 1rem; font-size: 1.1rem;">Danger Zone</h2>
            <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.5rem;">
                These actions are permanent and cannot be undone. All data will be immediately removed from our databases.
            </p>
            <div style="display: flex; gap: 1rem;">
                <form action="/api/pet/reset" method="POST" onsubmit="return confirm('Are you sure you want to reset your pet? All growth will be lost.')">
                    <button type="submit" class="btn" style="background: rgba(244, 67, 54, 0.1); color: #f44336; border: 1px solid rgba(244, 67, 54, 0.3);">Restart Pet</button>
                </form>
                <form action="/api/user/delete" method="POST" onsubmit="event.preventDefault(); const res = prompt('To permanently delete your account and all data, type DELETE below:'); if(res === 'DELETE') this.submit();">
                    <input type="hidden" name="confirm" value="DELETE" />
                    <button type="submit" class="btn" style="background: rgba(244, 67, 54, 0.8); color: #fff;">Delete Account</button>
                </form>
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

viewsRouter.get('/onboarding', async (c) => {
    const db = new Database(c.env.DB);
    const user = await getAuthUser(c, db);
    if (!user) return c.redirect('/auth/login');

    const pet = await db.fetchPet(user.userId);
    if (pet) return c.redirect('/dashboard');

    return c.html(renderLayout('Adopt', `
        <div class="glass-card">
            <h1>Adopt your GitChi</h1>
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

viewsRouter.get('/guide', async (c) => {
    const db = new Database(c.env.DB);
    const user = await getAuthUser(c, db);

    return c.html(renderLayout('Pet Raising Guide', `
        <h1>How to Raise your Pet 👾</h1>
        <p style="color: var(--text-muted); margin-bottom: 2rem;">GitChi is powered by your real-world GitHub activity. Here is everything you need to know to keep your companion thriving.</p>

        <div class="glass-card" style="margin-bottom: 2rem;">
            <h2>📊 Understanding Stats</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-top: 1rem;">
                <div>
                    <h3 style="color: var(--primary);">Fullness</h3>
                    <p style="font-size: 0.9rem;">Decreases by 0.4 pts/hour. Feed it by pushing commits.</p>
                </div>
                <div>
                    <h3 style="color: var(--primary);">Happiness</h3>
                    <p style="font-size: 0.9rem;">Keep it high by opening PRs and giving code reviews.</p>
                </div>
                <div>
                    <h3 style="color: var(--primary);">Health</h3>
                    <p style="font-size: 0.9rem;">Maintained by green builds (passing CI) and consistent streaks.</p>
                </div>
                <div>
                    <h3 style="color: var(--primary);">XP</h3>
                    <p style="font-size: 0.9rem;">Accumulates over time to level up and evolve your pet.</p>
                </div>
            </div>
        </div>

        <div class="glass-card" style="margin-bottom: 2rem;">
            <h2>⚔️ Interaction Map</h2>
            <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.5rem;">Perform these actions on GitHub to boost your pet's stats:</p>
            <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                <thead>
                    <tr style="border-bottom: 1px solid var(--border); text-align: left;">
                        <th style="padding: 0.5rem;">Action</th>
                        <th style="padding: 0.5rem;">Bonus</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="border-bottom: 1px solid var(--border);">
                        <td style="padding: 0.8rem 0.5rem;">Push (Commit)</td>
                        <td style="padding: 0.8rem 0.5rem; color: #ff9800;">+15 Fullness, +10 XP</td>
                    </tr>
                    <tr style="border-bottom: 1px solid var(--border);">
                        <td style="padding: 0.8rem 0.5rem;">PR Opened</td>
                        <td style="padding: 0.8rem 0.5rem; color: #2196f3;">+15 Happiness, +10 XP</td>
                    </tr>
                    <tr style="border-bottom: 1px solid var(--border);">
                        <td style="padding: 0.8rem 0.5rem;">PR Merged</td>
                        <td style="padding: 0.8rem 0.5rem; color: #4caf50;">+30 Happiness, +25 XP</td>
                    </tr>
                    <tr style="border-bottom: 1px solid var(--border);">
                        <td style="padding: 0.8rem 0.5rem;">Code Review</td>
                        <td style="padding: 0.8rem 0.5rem; color: #38bdf8;">+20 Happiness, +15 XP</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="glass-card" style="margin-bottom: 2rem;">
            <h2>🧬 Lifecycle & Evolution</h2>
            <div style="margin-top: 1rem;">
                <div class="guide-step">
                    <div class="step-number">0</div>
                    <div>
                        <strong>Egg</strong>
                        <p style="font-size: 0.8rem; color: var(--text-muted);">The beginning of your journey. Hatches on your first commit.</p>
                    </div>
                </div>
                <div class="guide-step">
                    <div class="step-number">1</div>
                    <div>
                        <strong>Youngling</strong>
                        <p style="font-size: 0.8rem; color: var(--text-muted);">Reached at 200 XP. This is where your coding personality begins to surface.</p>
                    </div>
                </div>
                <div class="guide-step">
                    <div class="step-number">2</div>
                    <div>
                        <strong>Fledgling</strong>
                        <p style="font-size: 0.8rem; color: var(--text-muted);">Reached at 600 XP and 30 days. Traits (Lone Coder, Architect, etc.) are locked here.</p>
                    </div>
                </div>
            </div>
        </div>
    `, user ? { username: user.githubUsername } : undefined));
});
