import { GitHubClient } from "@/core/github";

let client: GitHubClient | undefined;

/** Server-only GitHub client. The token never leaves this process. */
export function getGitHubClient(): GitHubClient {
  if (!client) {
    client = new GitHubClient({
      token: process.env.GITHUB_TOKEN?.trim() || undefined,
      // Test-only override (points e2e runs at a local mock). Never derived from requests.
      apiBase: process.env.GITHUB_API_BASE_URL?.trim() || undefined,
      timeoutMs: 8000,
      userAgent: "onecliq-web",
    });
  }
  return client;
}
