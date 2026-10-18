/**
 * Pure helpers over lists of releases: cooldown picking, release-to-release diffs,
 * and finding which release published a given file digest.
 */
import { isStable } from "./github";
import { ARCHES_FOR_OS } from "./labels";
import { selectAsset, type MatchPreferences } from "./match";
import { assetKey } from "./trust";
import { OS_VALUES, type Platform, type Release, type ReleaseAsset } from "./types";

/** Every OS + CPU pair the matcher knows about. */
export const ALL_PLATFORMS: Platform[] = OS_VALUES.flatMap((os) => ARCHES_FOR_OS[os].map((arch) => ({ os, arch })));

export const platformKey = (p: Platform) => `${p.os}-${p.arch}`;

/** "3d", "72h", "2w", "90m" → milliseconds. Plain numbers are days. */
export function parseDuration(input: string): number | null {
  const m = /^\s*(\d+(?:\.\d+)?)\s*(m|min|h|d|w)?\s*$/i.exec(input);
  if (!m) return null;
  const n = Number(m[1]);
  const unit = (m[2] ?? "d").toLowerCase();
  const ms = unit === "w" ? 7 * 86_400_000 : unit === "d" ? 86_400_000 : unit === "h" ? 3_600_000 : 60_000;
  return n * ms;
}

export interface CooledPick {
  release: Release | null;
  /** Newer stable releases skipped because they're still inside the cooldown. */
  skipped: Release[];
}

/**
 * Dependency cooldown for binaries: the newest stable release that has been public for at
 * least `minAgeMs`. Most poisoned releases are spotted and pulled within hours or days.
 */
export function pickCooledRelease(releases: Release[], minAgeMs: number, now = Date.now()): CooledPick {
  const stable = releases
    .filter(isStable)
    .sort((a, b) => Date.parse(b.publishedAt ?? "") - Date.parse(a.publishedAt ?? ""));
  const skipped: Release[] = [];
  for (const r of stable) {
    const t = Date.parse(r.publishedAt ?? "");
    if (Number.isFinite(t) && now - t >= minAgeMs) return { release: r, skipped };
    skipped.push(r);
  }
  return { release: null, skipped };
}

/** The stable release published just before `release`, if it's in the list. */
export function previousStable(releases: Release[], release: Release): Release | null {
  const t = Date.parse(release.publishedAt ?? "");
  return (
    releases
      .filter((r) => r.tag !== release.tag && isStable(r) && Date.parse(r.publishedAt ?? "") < t)
      .sort((a, b) => Date.parse(b.publishedAt ?? "") - Date.parse(a.publishedAt ?? ""))[0] ?? null
  );
}

export interface AssetChange {
  key: string;
  from: ReleaseAsset;
  to: ReleaseAsset;
  /** to.size / from.size */
  ratio: number;
  suspicious: boolean;
}

export interface ReleaseDiff {
  from: string;
  to: string;
  added: ReleaseAsset[];
  removed: ReleaseAsset[];
  changed: AssetChange[];
  unchanged: number;
  /** Platforms that have a recommended file in `to` but not in `from`, and vice versa. */
  platformsGained: Platform[];
  platformsLost: Platform[];
  /** Platforms whose recommended file changed name pattern (e.g. a new packaging format). */
  pickChanged: Array<{ platform: Platform; from: string; to: string }>;
}

export function diffReleases(from: Release, to: Release, prefs: MatchPreferences = {}): ReleaseDiff {
  const before = new Map(from.assets.map((a) => [assetKey(a.name, from.tag), a]));
  const after = new Map(to.assets.map((a) => [assetKey(a.name, to.tag), a]));

  const added = [...after].filter(([k]) => !before.has(k)).map(([, a]) => a);
  const removed = [...before].filter(([k]) => !after.has(k)).map(([, a]) => a);
  const changed: AssetChange[] = [];
  let unchanged = 0;
  for (const [key, a] of after) {
    const b = before.get(key);
    if (!b) continue;
    const ratio = a.size / Math.max(b.size, 1);
    const suspicious = ratio > 2.5 || ratio < 0.4;
    if (Math.abs(ratio - 1) > 0.1) changed.push({ key, from: b, to: a, ratio, suspicious });
    else unchanged++;
  }

  const platformsGained: Platform[] = [];
  const platformsLost: Platform[] = [];
  const pickChanged: ReleaseDiff["pickChanged"] = [];
  for (const p of ALL_PLATFORMS) {
    const x = selectAsset(from.assets, p, prefs);
    const y = selectAsset(to.assets, p, prefs);
    if (x.status !== "match" && y.status === "match") platformsGained.push(p);
    else if (x.status === "match" && y.status !== "match") platformsLost.push(p);
    else if (x.status === "match" && y.status === "match" && assetKey(x.asset.name, from.tag) !== assetKey(y.asset.name, to.tag)) {
      pickChanged.push({ platform: p, from: x.asset.name, to: y.asset.name });
    }
  }

  return { from: from.tag, to: to.tag, added, removed, changed, unchanged, platformsGained, platformsLost, pickChanged };
}

/** Which release (newest first) published a file with this SHA-256? */
export function findByDigest(releases: Release[], sha256: string): { release: Release; asset: ReleaseAsset } | null {
  const want = `sha256:${sha256.replace(/^sha256:/i, "").toLowerCase()}`;
  for (const release of releases) {
    const asset = release.assets.find((a) => a.digest?.toLowerCase() === want);
    if (asset) return { release, asset };
  }
  return null;
}

/** Same file name in other releases, for "this is an older/edited copy" hints. */
export function findByName(releases: Release[], name: string): { release: Release; asset: ReleaseAsset } | null {
  for (const release of releases) {
    const asset = release.assets.find((a) => a.name === name);
    if (asset) return { release, asset };
  }
  return null;
}
