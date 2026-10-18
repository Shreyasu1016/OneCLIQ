import { z } from "zod";
import { ResolveError } from "@/core/errors";
import { trustFor } from "@/core/inspect";
import { resolveDetailed } from "@/core/resolve";
import { ARCH_VALUES, OS_VALUES } from "@/core/types";
import { getGitHubClient } from "@/server/github-client";
import { failResponse, jsonResponse, readJsonBody } from "@/server/json-route";

const BodySchema = z.object({
  url: z.string().trim().min(1).max(2048),
  os: z.enum(OS_VALUES),
  arch: z.enum(ARCH_VALUES),
});

/** POST /api/trust → supply-chain signals for the file /api/resolve would recommend. */
export async function POST(request: Request) {
  try {
    const { url, os, arch } = await readJsonBody(request, BodySchema, "Send a GitHub URL, an operating system and an architecture.");
    const client = getGitHubClient();
    const d = await resolveDetailed({ url, platform: { os, arch } }, client);
    const rec = d.response.recommendation;
    if (rec.status !== "recommended") throw new ResolveError("RELEASE_NOT_FOUND", "There's no recommended file to assess.");
    const asset = d.release.assets.find((a) => a.name === rec.asset.name)!;
    const trust = await trustFor(client, d.target, d.release, asset);
    return jsonResponse({ ok: true, file: asset.name, tag: d.release.tag, trust });
  } catch (err) {
    return failResponse(err);
  }
}
