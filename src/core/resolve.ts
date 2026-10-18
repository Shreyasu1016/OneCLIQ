import { ResolveError } from "./errors";
import { GitHubClient } from "./github";
import { selectAsset, type MatchPreferences } from "./match";
import { parseGitHubUrl, type ParseOptions } from "./parse-url";
import { pickCooledRelease } from "./releases";
import { humanDuration } from "./trust";
import type { Platform, Release, RepoTarget, ResolveFailure, ResolveSuccess } from "./types";

export interface ResolveInput {
  url: string;
  platform: Platform;
  prefs?: MatchPreferences;
  parse?: ParseOptions;
  /** Cooldown: only consider stable releases at least this old. Ignored for tag URLs. */
  minAgeMs?: number;
}

export interface ResolveDetails {
  response: ResolveSuccess;
  target: RepoTarget;
  release: Release;
  /** Newer stable releases skipped by the cooldown, newest first. */
  skipped: Release[];
}

/** Parse → fetch release → match asset. Throws ResolveError on failure. */
export async function resolveDetailed(input: ResolveInput, client: GitHubClient): Promise<ResolveDetails> {
  const target = parseGitHubUrl(input.url, input.parse);
  let release: Release;
  let skipped: Release[] = [];
  if (input.minAgeMs && !target.tag) {
    const pick = pickCooledRelease(await client.listReleases(target), input.minAgeMs);
    if (!pick.release) {
      throw new ResolveError(
        "NO_STABLE_RELEASE",
        `No stable release of ${target.owner}/${target.repo} is older than ${humanDuration(input.minAgeMs)} yet.`,
      );
    }
    release = pick.release;
    skipped = pick.skipped;
  } else {
    release = await client.getRelease(target);
  }
  const match = selectAsset(release.assets, input.platform, input.prefs);

  const response: ResolveSuccess = {
    ok: true,
    repo: {
      owner: target.owner,
      name: target.repo,
      url: `https://github.com/${target.owner}/${target.repo}`,
    },
    release: {
      name: release.name,
      tag: release.tag,
      url: release.htmlUrl,
      publishedAt: release.publishedAt,
      prerelease: release.prerelease,
    },
    platform: input.platform,
    recommendation:
      match.status === "match"
        ? {
            status: "recommended",
            asset: {
              name: match.asset.name,
              size: match.asset.size,
              downloadUrl: match.asset.downloadUrl,
              kind: match.kind,
              format: match.format,
              digest: match.asset.digest,
            },
          }
        : { status: "not-recommended", reason: match.reason },
  };
  return { response, target, release, skipped };
}

export async function resolve(input: ResolveInput, client: GitHubClient): Promise<ResolveSuccess> {
  return (await resolveDetailed(input, client)).response;
}

export function toFailure(err: unknown): ResolveFailure {
  if (err instanceof ResolveError) {
    return {
      ok: false,
      error: { code: err.code, message: err.message, ...(err.retryAfter ? { retryAfter: err.retryAfter } : {}) },
    };
  }
  return { ok: false, error: { code: "UPSTREAM", message: "Something went wrong. Please try again." } };
}
