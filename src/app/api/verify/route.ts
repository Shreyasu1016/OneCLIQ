import { z } from "zod";
import { verifyDigest } from "@/core/inspect";
import { parseGitHubUrl } from "@/core/parse-url";
import { getGitHubClient } from "@/server/github-client";
import { failResponse, jsonResponse, readJsonBody } from "@/server/json-route";

const BodySchema = z.object({
  repo: z.string().trim().min(3).max(2048),
  sha256: z.string().trim().regex(/^[a-fA-F0-9]{64}$/),
});

/**
 * POST /api/verify → was a file with this SHA-256 published by this repo?
 * The browser hashes the file locally; only the 64-character digest is sent here.
 */
export async function POST(request: Request) {
  try {
    const { repo, sha256 } = await readJsonBody(request, BodySchema, "Send a repository and a SHA-256 digest.");
    const target = parseGitHubUrl(repo, { allowShorthand: true });
    const result = await verifyDigest(getGitHubClient(), target, sha256);
    return jsonResponse({ ok: true, repo: `${target.owner}/${target.repo}`, ...result });
  } catch (err) {
    return failResponse(err);
  }
}
