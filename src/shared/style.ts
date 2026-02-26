export const SHARED_STYLE = `
:root {
  --bg: #0f172a;
  --card-bg: #1e293b;
  --primary: #38bdf8;
  --primary-hover: #7dd3fc;
  --text: #f1f5f9;
  --text-muted: #94a3b8;
  --border: #334155;
  --accent: #f472b6;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background-color: var(--bg);
  color: var(--text);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  line-height: 1.6;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

header {
  background: rgba(30, 41, 59, 0.8);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
  padding: 1rem 2rem;
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
}

nav {
  display: flex;
  gap: 1.5rem;
  align-items: center;
}

nav a {
  color: var(--text-muted);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
}

nav a:hover { color: var(--text); }
nav a.active { color: var(--primary); }

main {
  flex: 1;
  max-width: 800px;
  width: 100%;
  margin: 2rem auto;
  padding: 0 1.5rem;
}

.glass-card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 1.5rem;
  padding: 2rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

h1 { font-size: 2.5rem; margin-bottom: 1rem; font-weight: 800; }
h2 { font-size: 1.5rem; color: var(--text-muted); margin-bottom: 1.5rem; }

.btn {
  background: var(--primary);
  color: var(--bg);
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, background 0.2s;
  text-decoration: none;
  display: inline-block;
  text-align: center;
}

.btn:hover {
  background: var(--primary-hover);
  transform: translateY(-2px);
}

.btn-secondary {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text);
}

.btn-secondary:hover {
  background: var(--border);
}

input, select {
  width: 100%;
  padding: 0.75rem 1rem;
  background: #020617;
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  color: var(--text);
  margin-bottom: 1.25rem;
  font-size: 1rem;
}

footer {
  text-align: center;
  padding: 2rem;
  color: var(--text-muted);
  font-size: 0.875rem;
  border-top: 1px solid var(--border);
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.fade-in { animation: fadeIn 0.5s ease-out; }
`;

export function renderLayout(title: string, content: string, user?: { username: string }): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} | Gitpet</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;800&display=swap" rel="stylesheet">
    <style>${SHARED_STYLE}</style>
</head>
<body>
    <header>
        <a href="/" class="logo">👾 Gitpet</a>
        <nav>
            ${user ? `
                <a href="/dashboard">Dashboard</a>
                <a href="/u/${user.username}">Profile</a>
                <a href="/auth/logout" class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.9rem;">Logout</a>
            ` : `
                <a href="/auth/login" class="btn">Start with GitHub</a>
            `}
        </nav>
    </header>
    <main class="fade-in">
        ${content}
    </main>
    <footer>
        &copy; 2024 Gitpet Project • Powered by Cloudflare Workers & D1
    </footer>
</body>
</html>
  `.trim();
}
