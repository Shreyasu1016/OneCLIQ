/** Reading and writing oqgit.lock.json, and syncing the locked files for this machine. */
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { LOCKFILE_NAME, emptyLock, parseLockfile, serializeLockfile, type Lockfile, type LockedAsset } from "../../src/core/lockfile";
import { downloadAsset, fileExists, safeFileName } from "./download";

export function lockPath(flag?: string): string {
  return path.resolve(flag ?? LOCKFILE_NAME);
}

export async function readLock(file: string): Promise<Lockfile | null> {
  let text: string;
  try {
    text = await readFile(file, "utf8");
  } catch {
    return null;
  }
  return parseLockfile(text);
}

export async function readLockOrEmpty(file: string): Promise<Lockfile> {
  return (await readLock(file)) ?? emptyLock();
}

export async function writeLock(file: string, lock: Lockfile): Promise<void> {
  const tmp = `${file}.tmp`;
  await writeFile(tmp, serializeLockfile(lock));
  await rename(tmp, file);
}

export async function sha256File(file: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk as Buffer);
  return hash.digest("hex");
}

export interface SyncResult {
  repo: string;
  tag: string;
  file: string;
  status: "downloaded" | "cached" | "skipped";
  verified: "lock" | "size-only";
  extractedTo?: string;
  note?: string;
}

/** Directory layout: <root>/downloads/<repo-name>/<tag>/<file>, <root>/tools/<repo-name>/ */
export function syncPaths(root: string, repo: string, tag: string) {
  const name = safeFileName(repo.split("/")[1] ?? repo);
  return {
    dir: path.join(root, "downloads", name, safeFileName(tag)),
    tools: path.join(root, "tools", name),
  };
}

export async function syncOne(opts: {
  root: string;
  repo: string;
  tag: string;
  asset: LockedAsset;
  extract?: boolean;
  onProgress?: (got: number, total: number) => void;
}): Promise<SyncResult> {
  const { dir, tools } = syncPaths(opts.root, opts.repo, opts.tag);
  const target = path.join(dir, safeFileName(opts.asset.name));
  const want = opts.asset.digest?.replace(/^sha256:/i, "").toLowerCase();
  let status: SyncResult["status"] = "downloaded";

  if (await fileExists(target)) {
    const have = await sha256File(target);
    if (want && have === want) status = "cached";
    else if (!want) status = "cached";
  }
  if (status === "downloaded") {
    // downloadAsset checks the bytes against the LOCKED digest, not whatever GitHub serves now.
    await downloadAsset({
      url: opts.asset.url,
      fileName: opts.asset.name,
      dir,
      expectedSize: opts.asset.size,
      digest: opts.asset.digest ?? undefined,
      overwrite: true,
      onProgress: opts.onProgress,
    });
  }

  const result: SyncResult = {
    repo: opts.repo,
    tag: opts.tag,
    file: target,
    status,
    verified: want ? "lock" : "size-only",
  };
  if (opts.extract) {
    const ok = await extract(target, tools);
    if (ok) result.extractedTo = tools;
    else result.note = "not an archive; left as is";
  }
  return result;
}

const TAR_RE = /\.(?:tar\.(?:gz|xz|bz2|zst)|tgz|tar)$/i;

/** Unpack with the system's own tar/unzip. Archives are never executed. */
async function extract(file: string, dest: string): Promise<boolean> {
  const isZip = /\.zip$/i.test(file);
  if (!isZip && !TAR_RE.test(file)) return false;
  await mkdir(dest, { recursive: true });
  // bsdtar (macOS, Windows 10+) reads zip too; GNU tar on Linux doesn't, so use unzip there.
  const [cmd, args] =
    isZip && process.platform === "linux" ? ["unzip", ["-o", "-q", file, "-d", dest]] : ["tar", ["-xf", file, "-C", dest]];
  await new Promise<void>((resolve, reject) => {
    const child = spawn(cmd as string, args as string[], { stdio: "ignore", shell: false });
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited with ${code}`))));
  });
  return true;
}
