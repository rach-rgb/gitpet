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

### 3. Run the Development Server

Start the local server:
```bash
npm run dev
```
The application will be available at `http://localhost:8787`.

### 4. Local Testing (Debug Login)

To test the application without setting up GitHub OAuth credentials:
1.  Go to `http://localhost:8787`.
2.  Click the **"[Dev] Debug Login"** link at the bottom of the landing page.
3.  This will automatically log you in as `demo_user` with a pre-configured pet.

## 🛠 Tech Stack

*   **Framework**: [Hono](https://hono.dev/)
*   **Runtime**: [Cloudflare Workers](https://workers.cloudflare.com/)
*   **Database**: [Cloudflare D1](https://developers.cloudflare.com/d1/)
*   **Language**: TypeScript

## 📄 License

ISC
