# 🚀 Gitpet Cloudflare Deployment Guide

This comprehensive guide will walk you through deploying Gitpet to **Cloudflare Workers** and **D1 Database**.

---

## 📑 Table of Contents
1. [Prerequisites](#1-prerequisites)
2. [GitHub OAuth Setup](#2-github-oauth-setup)
3. [GitHub Repository Connection](#3-github-repository-connection)
4. [Cloudflare Infrastructure Setup](#4-cloudflare-infrastructure-setup)
5. [Environment Secrets](#5-environment-secrets)
6. [Manual Deployment](#6-manual-deployment)
7. [CI/CD with GitHub Actions](#7-cicd-with-github-actions)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Prerequisites
- [Cloudflare Account](https://dash.cloudflare.com/)
- Node.js & npm installed
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-wrangler/) (`npm install -g wrangler`)
- A GitHub repository for your code

---

## 2. GitHub OAuth Setup
Gitpet uses GitHub for authentication. You must create an OAuth App in your GitHub account.

1. Navigate to **GitHub Settings > Developer settings > OAuth Apps > [New OAuth App](https://github.com/settings/applications/new)**.
2. **Application Name**: `Gitpet (Production)`
3. **Homepage URL**: `https://gitpet.rach-rgb.workers.dev`
4. **Authorization callback URL**: `https://gitpet.rach-rgb.workers.dev/auth/callback`
5. Click **Register application**.
6. Generate and save the **Client ID** and **Client Secret**.

---

## 3. GitHub Repository Connection
To enable automatic deployments when you push code, you should connect your GitHub repository to Cloudflare.

### Option A: Cloudflare Pages (Recommended for UI + Workers)
Since this project uses a Worker but might have a frontend later, Cloudflare Pages is a great choice:
1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Go to **Workers & Pages > Create > Pages > Connect to Git**.
3. Select your GitHub account and the `26_GITPET` repository.
4. **Build settings**:
   - Framework preset: `None`
   - Build command: `npm run deploy` (or left blank if using the GitHub Action method in Section 7)
   - Build output directory: `dist` (if applicable)
5. Click **Save and Deploy**.

### Option B: GitHub Actions (Standard for Workers)
If you prefer the **GitHub Actions** method (already detailed in [Section 7](#7-cicd-with-github-actions)), Cloudflare will listen to your repository via the API Token you provide in GitHub Secrets. This is the most flexible way to manage D1 migrations and complex deployments.

---

## 4. Cloudflare Infrastructure Setup

### Create D1 Database
Create your production database and apply the schema:

```bash
# 1. Create the database
npx wrangler d1 create gitpet-db

# 2. Apply the schema to the remote database
npx wrangler d1 execute gitpet-db --remote --file=migrations/schema.sql
```

> [!IMPORTANT]
> Copy the `database_id` from the output and update your `wrangler.toml`:
> ```toml
> [[d1_databases]]
> binding = "DB"
> database_name = "gitpet-db"
> database_id = "PASTE-YOUR-ID-HERE"
> ```

---

## 5. Environment Secrets
Secrets are encrypted and managed by Cloudflare. They should **never** be committed to Git.

```bash
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler secret put TOKEN_ENCRYPTION_KEY  # Random 32+ char string
npx wrangler secret put SESSION_SIGNING_KEY   # Random 32+ char string
```

> [!TIP]
> For local development, use a `.dev.vars` file (matching the keys above) and run with `npm run dev`.

---

## 6. Manual Deployment
To deploy your application manually from your local machine:

```bash
npm run deploy
```

Once finished, your API will be live at your `*.workers.dev` subdomain. The cron trigger defined in `wrangler.toml` will automatically start syncing pet states every 30 minutes.

---

> [!IMPORTANT]
> **One-Time Manual Setup Required**
> While GitHub Actions automates the *code* deployment, you must perform these steps **manually once** via your terminal before the first action run:
> 1. **Step 4 (D1 Database)**: Create the DB and update `wrangler.toml` with the ID.
> 2. **Step 5 (Secrets)**: Set the `GITHUB_` and encryption secrets.
>
> If you don't do these, the GitHub Action will fail because it won't have a database to connect to or the secrets to run the app.

---

## 7. CI/CD with GitHub Actions
Automate your deployment every time you push to the `main` branch.

1. **Get Cloudflare API Token**:
   - Go to [My Profile > API Tokens](https://dash.cloudflare.com/profile/api-tokens).
   - Create a token using the **Edit Cloudflare Workers** template.
2. **Add GitHub Secrets**:
   - In your repo: **Settings > Secrets and variables > Actions**.
   - Add **Repository secret**: `CLOUDFLARE_API_TOKEN` (Repository secret is easier for general use; use Environment secrets only if you have separate environments like Staging/Production).
3. **Create Workflow**:
   Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - name: Deploy to Cloudflare
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

---

## 8. Troubleshooting

| Issue | Solution |
| :--- | :--- |
| **D1 Binding Error** | Ensure `database_id` in `wrangler.toml` matches your actual D1 ID. |
| **OAuth Error 502** | Check if `GITHUB_CLIENT_ID` and `SECRET` are correctly set via `wrangler secret`. |
| **Cron not running** | Crons only execute on the deployed Worker, not in `wrangler dev` (unless using `--remote`). |
| **Migration Failure** | Ensure you used `--remote` when executing the migration via Wrangler. |

---

Developed with ❤️ by the Gitpet Team.
