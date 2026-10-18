/**
 * Release trust report: supply-chain signals for one release file.
 *
 * Pure and synchronous. The caller fetches the release, the previous stable release and the
 * attestation summary; this module only reads them. The result is a set of signals, not a safety
 * verdict: a file can pass every check and still be malicious if the maintainer's account is.
 */
import type { AttestationSummary } from "./github";
import { formatBytes } from "./labels";
import type { Release, ReleaseAsset } from "./types";

export type CheckStatus = "pass" | "warn" | "info";
export type CheckId = "digest" | "provenance" | "immutable" | "unchanged" | "age" | "signature" | "size" | "publisher";

export interface TrustCheck {
  id: CheckId;
  label: string;
  status: CheckStatus;
  detail: string;
}

export type TrustLevel = "strong" | "fair" | "weak";

export interface TrustReport {
  level: TrustLevel;
  /** 0–100, weighted over the checks below. */
  score: number;
  checks: TrustCheck[];
  /** Full cryptographic check the user can run, when GitHub holds a build attestation. */
  verifyCommand?: string;
}

export interface TrustInput {
  repo: { owner: string; name: string };
  release: Release;
  asset: ReleaseAsset;
  /** null = couldn't ask GitHub (rate limit / network). */
  attestations: AttestationSummary | null;
  /** The stable release before this one, for the size comparison. */
  previous?: Release | null;
  now?: number;
  /** Releases younger than this are flagged. Default 3 days. */
  cooldownDays?: number;
}

const WEIGHTS: Record<CheckId, number> = {
  provenance: 25,
  digest: 15,
  immutable: 15,
  unchanged: 15,
  age: 10,
  signature: 10,
  size: 5,
  publisher: 5,
};

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export function humanDuration(ms: number): string {
  const abs = Math.abs(ms);
  if (abs < HOUR) return `${Math.max(1, Math.round(abs / 60_000))} min`;
  if (abs < 2 * DAY) return `${Math.round(abs / HOUR)} h`;
  return `${Math.round(abs / DAY)} days`;
}

/** Same file across releases: version numbers replaced so "tool-1.2.0-x64" ≈ "tool-1.3.0-x64". */
export function assetKey(name: string, tag: string): string {
  let key = name.toLowerCase();
  const version = tag.replace(/^v/i, "").toLowerCase();
  // Whole tag first so "v2.0.0" doesn't leave a stray "v" behind.
  for (const v of [tag.toLowerCase(), version]) if (v.length >= 2) key = key.split(v).join("{v}");
  return key.replace(/v?\d+(?:\.\d+){1,3}(?:[-+][0-9a-z.]+)?/g, "{v}");
}

const SIG_SUFFIXES = [".sig", ".asc", ".minisig", ".sigstore", ".sigstore.json", ".bundle", ".pem", ".cert", ".intoto.jsonl"];
const CHECKSUM_RE = /(?:^|[._-])(?:sha256sums?|sha512sums?|checksums?)(?:[._-]|$)|\.sha256(?:sum)?$|\.sha512(?:sum)?$/i;

function time(iso?: string | null): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

export function assessTrust(input: TrustInput): TrustReport {
  const { release, asset, attestations, repo } = input;
  const now = input.now ?? Date.now();
  const cooldown = (input.cooldownDays ?? 3) * DAY;
  const slug = `${repo.owner}/${repo.name}`;
  const checks: TrustCheck[] = [];

  // 1. Build provenance (GitHub artifact attestations for these exact bytes).
  if (!asset.digest) {
    checks.push({ id: "provenance", label: "Build provenance", status: "info", detail: "No digest to look up attestations with." });
  } else if (!attestations) {
    checks.push({ id: "provenance", label: "Build provenance", status: "info", detail: "Couldn't ask GitHub right now (rate limit or network)." });
  } else if (attestations.build > 0) {
    checks.push({
      id: "provenance",
      label: "Build provenance",
      status: "pass",
      detail: `GitHub holds ${attestations.build} signed attestation${attestations.build === 1 ? "" : "s"} tying this exact file to a workflow in ${slug}.`,
    });
  } else {
    checks.push({ id: "provenance", label: "Build provenance", status: "warn", detail: "No build attestation: nothing links this file to the repo's source or CI." });
  }

  // 2. Digest.
  checks.push(
    asset.digest
      ? { id: "digest", label: "SHA-256 digest", status: "pass", detail: "GitHub published a digest, so a corrupted or swapped download is caught." }
      : { id: "digest", label: "SHA-256 digest", status: "warn", detail: "GitHub has no digest for this file (uploaded before mid-2025, or by an old tool)." },
  );

  // 3. Immutable release.
  if (release.immutable) {
    const extra = attestations?.release ? " GitHub also signed a release attestation." : "";
    checks.push({ id: "immutable", label: "Immutable release", status: "pass", detail: `Files and tag are locked; nobody can swap them later.${extra}` });
  } else {
    checks.push({ id: "immutable", label: "Immutable release", status: "info", detail: "Mutable: the maintainer (or a stolen token) can replace files after publishing." });
  }

  // 4. Replaced after publishing?
  const published = time(release.publishedAt);
  const created = time(asset.createdAt);
  const updated = time(asset.updatedAt);
  if (published === null || (created === null && updated === null)) {
    checks.push({ id: "unchanged", label: "Unchanged since publish", status: "info", detail: "GitHub didn't report upload times." });
  } else if (updated !== null && created !== null && updated - created > HOUR && updated > published + HOUR) {
    checks.push({
      id: "unchanged",
      label: "Unchanged since publish",
      status: "warn",
      detail: `This file was modified ${humanDuration(updated - published)} after the release was published.`,
    });
  } else if (created !== null && created > published + DAY) {
    checks.push({
      id: "unchanged",
      label: "Unchanged since publish",
      status: "warn",
      detail: `This file was added ${humanDuration(created - published)} after the release was published.`,
    });
  } else {
    checks.push({ id: "unchanged", label: "Unchanged since publish", status: "pass", detail: "Uploaded with the release and not modified since." });
  }

  // 5. Age (dependency cooldown).
  if (published === null) {
    checks.push({ id: "age", label: "Release age", status: "info", detail: "Publish date unknown." });
  } else if (now - published < cooldown) {
    checks.push({
      id: "age",
      label: "Release age",
      status: "warn",
      detail: `Published ${humanDuration(now - published)} ago. Poisoned releases are usually caught within days — consider waiting (oqgit --min-age 3d).`,
    });
  } else {
    checks.push({ id: "age", label: "Release age", status: "pass", detail: `Out for ${humanDuration(now - published)} without being pulled.` });
  }

  // 6. Signature / checksum sidecars.
  const lower = asset.name.toLowerCase();
  const sig = release.assets.find((a) => SIG_SUFFIXES.some((s) => a.name.toLowerCase() === lower + s));
  const sums = release.assets.find((a) => a.name !== asset.name && CHECKSUM_RE.test(a.name));
  if (sig) checks.push({ id: "signature", label: "Signature file", status: "pass", detail: `Signed: ${sig.name}` });
  else if (sums) checks.push({ id: "signature", label: "Signature file", status: "info", detail: `No signature, but a checksum file is published (${sums.name}).` });
  else checks.push({ id: "signature", label: "Signature file", status: "info", detail: "No signature or checksum file next to it." });

  // 7. Size compared with the previous release.
  const key = assetKey(asset.name, release.tag);
  const before = input.previous?.assets.find((a) => assetKey(a.name, input.previous!.tag) === key);
  if (!input.previous || !before) {
    checks.push({ id: "size", label: "Size vs previous", status: "info", detail: input.previous ? `No matching file in ${input.previous.tag}.` : "No earlier stable release to compare." });
  } else {
    const ratio = asset.size / Math.max(before.size, 1);
    const change = `${formatBytes(before.size)} in ${input.previous.tag} → ${formatBytes(asset.size)}`;
    checks.push(
      ratio > 2.5 || ratio < 0.4
        ? { id: "size", label: "Size vs previous", status: "warn", detail: `Unusual jump: ${change}.` }
        : { id: "size", label: "Size vs previous", status: "pass", detail: `In line: ${change}.` },
    );
  }

  // 8. Publisher.
  if (!asset.uploader) {
    checks.push({ id: "publisher", label: "Uploaded by", status: "info", detail: "Uploader unknown." });
  } else if (/\[bot\]$/.test(asset.uploader)) {
    checks.push({ id: "publisher", label: "Uploaded by", status: "pass", detail: `CI (${asset.uploader}), not a person's laptop.` });
  } else {
    const who = release.author && release.author !== asset.uploader ? `${asset.uploader} (release published by ${release.author})` : asset.uploader;
    checks.push({ id: "publisher", label: "Uploaded by", status: "info", detail: `By hand: ${who}.` });
  }

  const score = Math.round(
    checks.reduce((sum, ch) => sum + WEIGHTS[ch.id] * (ch.status === "pass" ? 1 : ch.status === "info" ? 0.4 : 0), 0),
  );
  const level: TrustLevel = score >= 70 ? "strong" : score >= 40 ? "fair" : "weak";
  return {
    level,
    score,
    checks,
    verifyCommand: attestations?.build ? `gh attestation verify ${asset.name} --repo ${slug}` : undefined,
  };
}

export const TRUST_LEVEL_LABELS: Record<TrustLevel, string> = {
  strong: "Strong provenance",
  fair: "Some provenance",
  weak: "Little provenance",
};
