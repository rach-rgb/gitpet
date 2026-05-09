import { Locale, getT } from './i18n';

export const SHARED_STYLE = `
:root {
  --canvas: #ffffff;
  --primary: #ff385c;
  --primary-active: #e00b41;
  --ink: #222222;
  --body: #3f3f3f;
  --muted: #6a6a6a;
  --hairline: #dddddd;
  --surface-soft: #f7f7f7;
  --surface-strong: #f2f2f2;
  --shadow: rgba(0, 0, 0, 0.02) 0 0 0 1px, rgba(0, 0, 0, 0.04) 0 2px 6px, rgba(0, 0, 0, 0.1) 0 4px 8px;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background-color: var(--canvas);
  color: var(--ink);
  font-family: 'Inter', -apple-system, system-ui, Roboto, sans-serif;
  line-height: 1.43;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}

header {
  background: var(--canvas);
  border-bottom: 1px solid var(--hairline);
  padding: 0 5rem;
  height: 80px;
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--primary);
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  letter-spacing: -0.02em;
}

nav {
  display: flex;
  gap: 2rem;
  align-items: center;
}

nav a {
  color: var(--ink);
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9rem;
  transition: color 0.2s;
}

nav a:hover { color: var(--muted); }

main {
  flex: 1;
  max-width: 1080px;
  width: 100%;
  margin: 0 auto;
  padding: 4rem 1.5rem;
}

.glass-card {
  background: var(--canvas);
  border: 1px solid var(--hairline);
  border-radius: 14px;
  padding: 2rem;
  transition: box-shadow 0.2s ease-in-out;
}

.glass-card:hover {
  box-shadow: var(--shadow);
}

h1 { 
  font-size: 2rem; 
  margin-bottom: 1rem; 
  font-weight: 700; 
  letter-spacing: -0.02em;
}

h2 { 
  font-size: 1.3rem; 
  color: var(--ink); 
  margin-bottom: 1.5rem; 
  font-weight: 600;
}

.btn {
  background: var(--primary);
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
  text-decoration: none;
  display: inline-block;
  text-align: center;
  line-height: 24px;
}

.btn:hover {
  background: var(--primary-active);
}

.btn-secondary {
  background: white;
  border: 1px solid var(--ink);
  color: var(--ink);
}

.btn-secondary:hover {
  background: var(--surface-soft);
}

input, select {
  width: 100%;
  padding: 14px 12px;
  background: var(--canvas);
  border: 1px solid var(--hairline);
  border-radius: 8px;
  color: var(--ink);
  margin-bottom: 1.25rem;
  font-size: 1rem;
  outline: none;
  transition: border 0.2s;
}

input:focus, select:focus {
  border: 2px solid var(--ink);
}

footer {
  text-align: center;
  padding: 3rem;
  color: var(--muted);
  font-size: 0.875rem;
  border-top: 1px solid var(--hairline);
  background: var(--canvas);
}

/* Custom Utilities */
.code-snippet {
  background: var(--surface-soft);
  border: 1px solid var(--hairline);
  border-radius: 8px;
  padding: 1rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.9rem;
  color: var(--primary);
  word-break: break-all;
  margin: 1rem 0;
  cursor: pointer;
}

.code-snippet:hover { background: var(--surface-strong); }

.guide-step { display: flex; gap: 1rem; margin-bottom: 1.5rem; align-items: flex-start; }
.step-number { 
  border: 1px solid var(--hairline);
  color: var(--ink); 
  width: 28px; 
  height: 28px; 
  border-radius: 50%; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  font-weight: 600; 
  flex-shrink: 0; 
  font-size: 0.9rem;
}
`;

export function renderLayout(title: string, content: string, user?: { username: string }, locale: Locale = 'ko'): string {
  const t = getT(locale);
  
  return `
<!DOCTYPE html>
<html lang="${locale}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} | GitChi</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>${SHARED_STYLE}</style>
</head>
<body>
    <header>
        <a href="/" class="logo">👾 GitChi</a>
        <nav>
            ${user ? `
                <a href="/dashboard">${t('nav_dashboard')}</a>
            ` : ''}
            <a href="/guide">${t('nav_guide')}</a>
            <a href="/api/locale?lang=${locale === 'ko' ? 'en' : 'ko'}" class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.9rem;">
                ${locale === 'ko' ? '🌐 English' : '🌐 한국어'}
            </a>
            ${user ? `
                <a href="/auth/logout" class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.9rem;">${t('nav_logout')}</a>
            ` : `
                <a href="/auth/login" class="btn">${t('nav_login')}</a>
            `}
        </nav>
    </header>
    <main>
        ${content}
    </main>
    <footer>
        &copy; 2024 GitChi Project • Powered by Cloudflare Workers & D1
    </footer>
</body>
</html>
  `.trim();
}
