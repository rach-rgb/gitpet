# 👾 Gitpet (Petgotchi)

A GitHub-activity-driven virtual pet game. Build your pet by making real commits and contributions.

## 🚀 Local Development

Follow these steps to get Gitpet running on your local machine.

### 1. Prerequisites

*   **Node.js** (v18 or later)
*   **npm**
*   **Wrangler CLI**: `npm install -g wrangler`

### 2. Setup

1.  **Clone the repository** (or open the project folder).
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Initialize the local database**:
    Create the tables and seed mock data for testing.
    ```bash
    npm run db:migrate
    npm run db:seed
    ```
4.  **Create `.dev.vars`**:
    For local testing, create a `.dev.vars` file and add the following to enable the Debug Login UI:
    ```env
    ENABLE_DEBUG_LOGIN=true
    ```

### 3. Run the Development Server

Start the local server:
```bash
npm run dev
```
The application will be available at `http://localhost:8787`.

### 4. Local Testing (Debug Login)

To test the application without setting up GitHub OAuth credentials:
1.  Go to `http://localhost:8787`.
2.  Click the **"[Dev] Debug Login"** link at the bottom of the landing page (only visible if `ENABLE_DEBUG_LOGIN=true`).
3.  This will automatically log you in as `demo_user` with a pre-configured pet.

## 🌍 Deployment

To deploy Gitpet to your own Cloudflare account:

1. **Login to Cloudflare**:
   ```bash
   npx wrangler login
   ```
2. **Create D1 Database**:
   ```bash
   npx wrangler d1 create petgotchi-db
   ```
   Update the `database_id` in `wrangler.toml` with the output ID.
3. **Run Production Migrations**:
   ```bash
   npx wrangler d1 execute petgotchi-db --file=migrations/schema.sql
   ```
4. **Set Production Secrets**:
   Set up your GitHub OAuth App and run these commands to set your secrets:
   ```bash
   npx wrangler secret put GITHUB_CLIENT_ID
   npx wrangler secret put GITHUB_CLIENT_SECRET
   npx wrangler secret put TOKEN_ENCRYPTION_KEY
   npx wrangler secret put SESSION_SIGNING_KEY
   ```
5. **Deploy**:
   ```bash
   npm run deploy
   ```

## 🛠 Tech Stack

*   **Framework**: [Hono](https://hono.dev/)
*   **Runtime**: [Cloudflare Workers](https://workers.cloudflare.com/)
*   **Database**: [Cloudflare D1](https://developers.cloudflare.com/d1/)
*   **Language**: TypeScript

## 📄 License

ISC
