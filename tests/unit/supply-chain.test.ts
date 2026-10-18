import { describe, expect, it, vi } from "vitest";
import { GitHubClient } from "@/core/github";
import { TtlCache } from "@/core/cache";
import { verifyDigest } from "@/core/inspect";
import { checkLock, lockTool, parseLockfile, serializeLockfile } from "@/core/lockfile";
import { ALL_PLATFORMS, diffReleases, findByDigest, parseDuration, pickCooledRelease, previousStable } from "@/core/releases";
import { resolveDetailed } from "@/core/resolve";
import { assessTrust, assetKey } from "@/core/trust";
import type { Release, ReleaseAsset } from "@/core/types";

const NOW = Date.parse("2026-10-18T12:00:00Z");
const DAY = 86_400_000;
const iso = (msAgo: number) => new Date(NOW - msAgo).toISOString();
const SHA = (c: string) => `sha256:${c.repeat(64)}`;

function asset(name: string, extra: Partial<ReleaseAsset> = {}): ReleaseAsset {
  return { name, size: 10_000_000, downloadUrl: `https://github.com/acme/tool/releases/download/v1/${name}`, ...extra };
}

function rel(tag: string, ageDays: number, names: string[], extra: Partial<Release> = {}): Release {
  return {
    name: tag,
    tag,
    htmlUrl: `https://github.com/acme/tool/releases/tag/${tag}`,
    publishedAt: iso(ageDays * DAY),
    prerelease: false,
    draft: false,
    assets: names.map((n) => asset(n)),
    ...extra,
  };
}

describe("parseDuration", () => {
  it.each([
    ["3d", 3 * DAY],
    ["72h", 3 * DAY],
    ["1w", 7 * DAY],
    ["2", 2 * DAY],
    ["90m", 90 * 60_000],
  ])("%s", (input, ms) => expect(parseDuration(input)).toBe(ms));
  it("rejects junk", () => expect(parseDuration("soon")).toBeNull());
});

describe("pickCooledRelease", () => {
  const releases = [
    rel("v3.0.0", 0.5, []),
    rel("v2.9.0-rc.1", 5, []),
    rel("v2.8.0", 2, []),
    rel("v2.7.0", 10, []),
  ];
  it("skips stable releases inside the cooldown, and ignores pre-releases", () => {
    const pick = pickCooledRelease(releases, 3 * DAY, NOW);
    expect(pick.release?.tag).toBe("v2.7.0");
    expect(pick.skipped.map((r) => r.tag)).toEqual(["v3.0.0", "v2.8.0"]);
  });
  it("returns null when everything is too fresh", () => {
    expect(pickCooledRelease(releases, 30 * DAY, NOW).release).toBeNull();
  });
  it("previousStable finds the one before", () => {
    expect(previousStable(releases, releases[0])?.tag).toBe("v2.8.0");
  });
});

describe("assetKey", () => {
  it("lines up the same file across versions", () => {
    expect(assetKey("tool-1.2.0-linux-x64.tar.gz", "v1.2.0")).toBe(assetKey("tool-1.3.10-linux-x64.tar.gz", "v1.3.10"));
    expect(assetKey("tool_v2.0.0_darwin_arm64.zip", "v2.0.0")).toBe("tool_{v}_darwin_arm64.zip");
  });
});

describe("assessTrust", () => {
  const base = rel("v2.0.0", 30, [], { immutable: true, author: "github-actions[bot]" });
  const good = asset("tool-2.0.0-linux-x64.tar.gz", {
    digest: SHA("a"),
    createdAt: base.publishedAt!,
    updatedAt: base.publishedAt!,
    uploader: "github-actions[bot]",
    size: 10_000_000,
  });
  base.assets = [good, asset("tool-2.0.0-linux-x64.tar.gz.sigstore.json")];
  const prev = rel("v1.9.0", 60, ["tool-1.9.0-linux-x64.tar.gz"]);
  const repo = { owner: "acme", name: "tool" };

  it("rates a fully attested immutable CI release as strong", () => {
    const t = assessTrust({ repo, release: base, asset: good, attestations: { total: 2, build: 1, release: 1 }, previous: prev, now: NOW });
    expect(t.level).toBe("strong");
    expect(t.score).toBe(100);
    expect(t.checks.every((c) => c.status === "pass")).toBe(true);
    expect(t.verifyCommand).toBe("gh attestation verify tool-2.0.0-linux-x64.tar.gz --repo acme/tool");
  });

  it("flags a re-uploaded, fresh, hand-uploaded file with a size jump", () => {
    const published = iso(6 * 3_600_000);
    const r = rel("v2.0.0", 0.25, [], { publishedAt: published, author: "maintainer" });
    const bad = asset("tool-2.0.0-linux-x64.tar.gz", {
      size: 40_000_000,
      createdAt: published,
      updatedAt: iso(60_000),
      uploader: "someone-else",
    });
    r.assets = [bad];
    const t = assessTrust({ repo, release: r, asset: bad, attestations: { total: 0, build: 0, release: 0 }, previous: prev, now: NOW });
    const status = Object.fromEntries(t.checks.map((c) => [c.id, c.status]));
    expect(status).toMatchObject({ provenance: "info", digest: "warn", unchanged: "warn", age: "warn", size: "warn", publisher: "info" });
    expect(t.level).toBe("weak");
    expect(t.checks.find((c) => c.id === "publisher")?.detail).toContain("release published by maintainer");
  });

  it("treats an unreachable attestation API as unknown, not missing", () => {
    const t = assessTrust({ repo, release: base, asset: good, attestations: null, now: NOW });
    expect(t.checks.find((c) => c.id === "provenance")?.status).toBe("info");
    expect(t.verifyCommand).toBeUndefined();
  });
});

describe("diffReleases", () => {
  it("reports added, removed, resized and platform coverage", () => {
    const from = rel("v1.0.0", 20, ["app-1.0.0-linux-x64.tar.gz", "app-1.0.0-macos-arm64.tar.gz", "app-1.0.0-windows-x64.zip"]);
    const to = rel("v1.1.0", 1, ["app-1.1.0-linux-x64.tar.gz", "app-1.1.0-linux-arm64.tar.gz", "app-1.1.0-windows-x64.zip"]);
    to.assets[0].size = 50_000_000;
    const d = diffReleases(from, to);
    expect(d.added.map((a) => a.name)).toEqual(["app-1.1.0-linux-arm64.tar.gz"]);
    expect(d.removed.map((a) => a.name)).toEqual(["app-1.0.0-macos-arm64.tar.gz"]);
    expect(d.changed).toHaveLength(1);
    expect(d.changed[0].suspicious).toBe(true);
    expect(d.platformsGained).toContainEqual({ os: "linux", arch: "arm64" });
    expect(d.platformsLost).toContainEqual({ os: "macos", arch: "arm64" });
  });
});

describe("findByDigest", () => {
  it("finds the release that published the bytes", () => {
    const a = rel("v1", 1, ["x"]);
    a.assets[0].digest = SHA("b");
    expect(findByDigest([rel("v2", 0, ["y"]), a], "B".repeat(64))?.release.tag).toBe("v1");
    expect(findByDigest([a], "c".repeat(64))).toBeNull();
  });
});

describe("lockfile", () => {
  const r = rel("v3.1.0", 10, ["app-3.1.0-linux-x64.tar.gz", "app-3.1.0-darwin-arm64.tar.gz", "app-3.1.0-windows-x64.zip"]);
  r.assets.forEach((a, i) => (a.digest = SHA(String(i + 1))));

  it("locks one file per platform with digests", () => {
    const tool = lockTool("acme/app", r, {}, new Date(NOW));
    expect(Object.keys(tool.assets).sort()).toEqual(["linux-x64", "macos-arm64", "windows-arm64", "windows-x64"].sort());
    expect(tool.assets["macos-arm64"].digest).toBe(SHA("2"));
    expect(ALL_PLATFORMS.length).toBe(8);
  });

  it("round-trips through serialisation", () => {
    const lock = { version: 1 as const, tools: { "acme/app": lockTool("acme/app", r, {}, new Date(NOW)) } };
    expect(parseLockfile(serializeLockfile(lock))).toEqual(lock);
    expect(() => parseLockfile('{"version":2,"tools":{}}')).toThrow(/not a valid lockfile/);
  });

  it("detects a re-uploaded file under the same tag", () => {
    const tool = lockTool("acme/app", r);
    const swapped: Release = { ...r, assets: r.assets.map((a) => (a.name.includes("linux") ? { ...a, digest: SHA("f") } : a)) };
    expect(checkLock(tool, r)).toEqual([]);
    expect(checkLock(tool, swapped)).toEqual([expect.objectContaining({ platform: "linux-x64", kind: "digest-changed" })]);
    const gone: Release = { ...r, assets: r.assets.filter((a) => !a.name.includes("windows")) };
    expect(checkLock(tool, gone).map((d) => d.kind)).toEqual(["missing", "missing"]);
  });
});

// --- Network-backed helpers with a mocked GitHub -------------------------------------

function ghRelease(tag: string, published: string, names: Array<[string, string?]>) {
  return {
    tag_name: tag,
    name: tag,
    html_url: `https://github.com/acme/cool/releases/tag/${tag}`,
    draft: false,
    prerelease: false,
    published_at: published,
    immutable: true,
    author: { login: "github-actions[bot]" },
    assets: names.map(([name, digest]) => ({
      name,
      size: 2048,
      state: "uploaded",
      browser_download_url: `https://github.com/acme/cool/releases/download/${tag}/${name}`,
      digest: digest ?? null,
      created_at: published,
      updated_at: published,
      uploader: { login: "github-actions[bot]" },
    })),
  };
}

function client(routes: Record<string, unknown>) {
  const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
    const path = String(input).replace("https://api.github.com", "");
    if (!(path in routes)) return new Response("{}", { status: 404 });
    return new Response(JSON.stringify(routes[path]), { status: 200 });
  });
  return { gh: new GitHubClient({ fetch: fetchImpl as unknown as typeof fetch, cache: new TtlCache() }), fetchImpl };
}

describe("GitHub-backed checks", () => {
  const fresh = new Date(Date.now() - 3_600_000).toISOString();
  const old = new Date(Date.now() - 20 * DAY).toISOString();
  const list = [
    ghRelease("v2.0.0", fresh, [["cool-2.0.0-linux-x64.tar.gz", SHA("d")]]),
    ghRelease("v1.0.0", old, [["cool-1.0.0-linux-x64.tar.gz", SHA("e")]]),
  ];

  it("resolve honours --min-age and reports what it skipped", async () => {
    const { gh } = client({ "/repos/acme/cool/releases?per_page=30": list });
    const d = await resolveDetailed({ url: "acme/cool", platform: { os: "linux", arch: "x64" }, parse: { allowShorthand: true }, minAgeMs: 3 * DAY }, gh);
    expect(d.release.tag).toBe("v1.0.0");
    expect(d.skipped.map((r) => r.tag)).toEqual(["v2.0.0"]);
    expect(d.release.immutable).toBe(true);
    expect(d.release.assets[0].uploader).toBe("github-actions[bot]");
  });

  it("verifyDigest matches bytes to a release and counts attestations", async () => {
    const { gh } = client({
      "/repos/acme/cool/releases?per_page=100": list,
      [`/repos/acme/cool/attestations/${encodeURIComponent(SHA("e"))}?per_page=100`]: {
        attestations: [{ initiator: "github" }, { initiator: "user" }],
      },
    });
    const v = await verifyDigest(gh, { owner: "acme", repo: "cool" }, "e".repeat(64));
    expect(v.match).toMatchObject({ tag: "v1.0.0", name: "cool-1.0.0-linux-x64.tar.gz", latest: false });
    expect(v.attestations).toEqual({ total: 2, build: 1, release: 1 });
  });

  it("returns null attestations (unknown) when GitHub refuses", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 403 }));
    const gh = new GitHubClient({ fetch: fetchImpl as unknown as typeof fetch });
    expect(await gh.getAttestations({ owner: "acme", repo: "nope" }, SHA("9"))).toBeNull();
  });
});
