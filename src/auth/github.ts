/**
 * GitHub OAuth helper class for handling OAuth flows.
 * Adheres to .agent/clean-code.md naming conventions.
 */
export class GithubAuth {
    private clientId: string;
    private clientSecret: string;

    constructor(clientId: string, clientSecret: string) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
    }

    /**
     * Generates the GitHub authorization URL and a random state.
     */
    getAuthUrl(): { url: string; state: string } {
        const state = crypto.randomUUID();
        const url = `https://github.com/login/oauth/authorize?client_id=${this.clientId}&state=${state}&scope=read:user`;
        return { url, state };
    }

    /**
     * Exchanges an OAuth code for an access token.
     */
    async exchangeCodeForToken(code: string): Promise<string> {
        const response = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                client_id: this.clientId,
                client_secret: this.clientSecret,
                code,
            }),
        });

        const data = await response.json() as { access_token?: string; error?: string };
        if (data.error || !data.access_token) {
            throw new Error(data.error || 'Failed to exchange code for token');
        }

        return data.access_token;
    }

    /**
     * Fetches the user data from GitHub using an access token.
     */
    async fetchUserData(accessToken: string): Promise<{ id: number; login: string }> {
        const response = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `token ${accessToken}`,
                'User-Agent': 'Petgotchi-Worker',
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user data from GitHub');
        }

        return await response.json() as { id: number; login: string };
    }
}
