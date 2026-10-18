/**
 * oqgit.lock.json: pin release binaries for a whole team, every platform at once.
 *
 * Locking reads GitHub's published digests, so nothing is downloaded to create a lock.
 * `checkLock` compares a lock with what GitHub serves today and reports drift — a re-uploaded
 * file, a deleted release, a renamed asset — which is exactly what a tampered release looks like.
 */
import { z } from "zod";
import type { MatchPreferences } from "./match";
import { selectAsset } from "./match";
import { ALL_PLATFORMS, platformKey } from "./releases";
import type { Release } from "./types";

export const LOCKFILE_NAME = "oqgit.lock.json";

const LockedAssetSchema = z.object({
  name: z.string().min(1).max(512),
  url: z.string().url(),
  size: z.number().int().nonnegative(),
  digest: z.string().regex(/^sha256:[a-f0-9]{64}$/i).nullable(),
});

const LockedToolSchema = z.object({
  repo: z.string().regex(/^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/),
  tag: z.string().min(1).max(255),
  publishedAt: z.string().nullable(),
  lockedAt: z.string(),
  immutable: z.boolean().optional(),
  /** Keyed by "<os>-<arch>", e.g. "macos-arm64". */
  assets: z.record(z.string(), LockedAssetSchema),
});

export const LockfileSchema = z.object({
  version: z.literal(1),
  tools: z.record(z.string(), LockedToolSchema),
});

export type LockedAsset = z.infer<typeof LockedAssetSchema>;
export type LockedTool = z.infer<typeof LockedToolSchema>;
export type Lockfile = z.infer<typeof LockfileSchema>;

export const emptyLock = (): Lockfile => ({ version: 1, tools: {} });

export function parseLockfile(text: string): Lockfile {
  const parsed = LockfileSchema.safeParse(JSON.parse(text));
  if (!parsed.success) throw new Error(`${LOCKFILE_NAME} is not a valid lockfile: ${parsed.error.issues[0]?.message ?? "bad shape"}`);
  return parsed.data;
}

/** Stable, diff-friendly serialisation (sorted keys). */
export function serializeLockfile(lock: Lockfile): string {
  const tools = Object.fromEntries(
    Object.keys(lock.tools)
      .sort()
      .map((k) => {
        const t = lock.tools[k];
        const assets = Object.fromEntries(Object.keys(t.assets).sort().map((p) => [p, t.assets[p]]));
        return [k, { ...t, assets }];
      }),
  );
  return `${JSON.stringify({ version: 1, tools }, null, 2)}\n`;
}

/** Resolve the right file for every platform in one release. Platforms with no reliable match are left out. */
export function lockTool(repo: string, release: Release, prefs: MatchPreferences = {}, now = new Date()): LockedTool {
  const assets: Record<string, LockedAsset> = {};
  for (const p of ALL_PLATFORMS) {
    const m = selectAsset(release.assets, p, p.os === "linux" ? prefs : {});
    if (m.status !== "match") continue;
    assets[platformKey(p)] = { name: m.asset.name, url: m.asset.downloadUrl, size: m.asset.size, digest: m.asset.digest ?? null };
  }
  return {
    repo,
    tag: release.tag,
    publishedAt: release.publishedAt,
    lockedAt: now.toISOString(),
    ...(release.immutable ? { immutable: true } : {}),
    assets,
  };
}

export type DriftKind = "missing" | "digest-changed" | "size-changed" | "digest-removed";

export interface Drift {
  platform: string;
  kind: DriftKind;
  detail: string;
}

/** Compare a locked tool with the same tag as GitHub serves it now. Empty = no drift. */
export function checkLock(tool: LockedTool, current: Release): Drift[] {
  const out: Drift[] = [];
  for (const [platform, locked] of Object.entries(tool.assets)) {
    const now = current.assets.find((a) => a.name === locked.name);
    if (!now) {
      out.push({ platform, kind: "missing", detail: `${locked.name} is no longer in ${tool.tag}.` });
      continue;
    }
    if (locked.digest && now.digest && locked.digest.toLowerCase() !== now.digest.toLowerCase()) {
      out.push({ platform, kind: "digest-changed", detail: `${locked.name} was re-uploaded: its SHA-256 changed since it was locked.` });
    } else if (locked.digest && !now.digest) {
      out.push({ platform, kind: "digest-removed", detail: `${locked.name} no longer has a published digest.` });
    } else if (now.size !== locked.size) {
      out.push({ platform, kind: "size-changed", detail: `${locked.name} changed size (${locked.size} → ${now.size} bytes).` });
    }
  }
  return out;
}
