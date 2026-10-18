/**
 * Download a GitHub release asset to disk.
 *  - The starting URL must be a github.com release asset.
 *  - Redirects are followed manually and only to GitHub's asset hosts.
 *  - Data streams to "<name>.part", then is renamed once complete (and verified).
 * Nothing downloaded is ever executed here.
 */
import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { isGitHubReleaseAssetUrl } from "../../src/core/github";

const ALLOWED_REDIRECT_HOSTS = [
  /^github\.com$/,
  /^objects\.githubusercontent\.com$/,
  /^release-assets\.githubusercontent\.com$/,
  /^[a-z0-9-]+\.githubusercontent\.com$/,
];

export class DownloadError extends Error {}

export interface DownloadOptions {
  url: string;
  fileName: string;
  dir: string;
  expectedSize?: number;
  /** "sha256:<hex>" from GitHub, when available. */
  digest?: string;
  overwrite?: boolean;
  onProgress?: (received: number, total: number) => void;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}

export interface DownloadResult {
  path: string;
  bytes: number;
  sha256: string;
  verified: "match" | "unavailable";
}

/** Strip anything that could escape the target directory. */
export function safeFileName(name: string): string {
  const base = path.basename(name.replace(/\\/g, "/"));
  const cleaned = base.replace(/[\x00-\x1f<>:"|?*]/g, "_").trim();
  if (!cleaned || cleaned === "." || cleaned === "..") throw new DownloadError("Unsafe file name.");
  return cleaned;
}

export async function fileExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

export async function downloadAsset(opts: DownloadOptions): Promise<DownloadResult> {
  if (!isGitHubReleaseAssetUrl(opts.url)) throw new DownloadError("Refusing to download from a non-GitHub URL.");
  const fetchImpl = opts.fetchImpl ?? fetch;
  const fileName = safeFileName(opts.fileName);
  await mkdir(opts.dir, { recursive: true });
  const finalPath = path.join(opts.dir, fileName);
  const partPath = `${finalPath}.part`;

  if (!opts.overwrite && (await fileExists(finalPath))) {
    throw new DownloadError(`${finalPath} already exists. Use --force to replace it.`);
  }

  // Follow redirects ourselves so every hop is checked.
  let url = opts.url;
  let res: Response | undefined;
  for (let hop = 0; hop < 6; hop++) {
    res = await fetchImpl(url, {
      redirect: "manual",
      headers: { "User-Agent": "oqgit-cli", Accept: "application/octet-stream" },
      signal: opts.signal,
    });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) throw new DownloadError("GitHub sent a redirect without a location.");
      const next = new URL(loc, url);
      if (next.protocol !== "https:" || !ALLOWED_REDIRECT_HOSTS.some((re) => re.test(next.hostname))) {
        throw new DownloadError(`Refusing to follow a redirect to ${next.hostname}.`);
      }
      url = next.toString();
      continue;
    }
    break;
  }
  if (!res || !res.ok || !res.body) {
    throw new DownloadError(`Download failed${res ? ` (HTTP ${res.status})` : ""}.`);
  }

  const total = Number(res.headers.get("content-length")) || opts.expectedSize || 0;
  const hash = createHash("sha256");
  let received = 0;
  const source = Readable.fromWeb(res.body as import("node:stream/web").ReadableStream<Uint8Array>);
  source.on("data", (chunk: Buffer) => {
    received += chunk.length;
    hash.update(chunk);
    opts.onProgress?.(received, total);
  });

  try {
    await pipeline(source, createWriteStream(partPath));
  } catch (err) {
    await rm(partPath, { force: true });
    throw new DownloadError(`Download interrupted: ${(err as Error).message}`);
  }

  const sha256 = hash.digest("hex");
  if (opts.expectedSize && received !== opts.expectedSize) {
    await rm(partPath, { force: true });
    throw new DownloadError(`Size mismatch: expected ${opts.expectedSize} bytes, got ${received}.`);
  }
  let verified: DownloadResult["verified"] = "unavailable";
  if (opts.digest) {
    const expected = opts.digest.replace(/^sha256:/i, "").toLowerCase();
    if (expected !== sha256) {
      await rm(partPath, { force: true });
      throw new DownloadError("SHA-256 does not match GitHub's published digest. The file was deleted.");
    }
    verified = "match";
  }

  await rename(partPath, finalPath);
  return { path: finalPath, bytes: received, sha256, verified };
}
