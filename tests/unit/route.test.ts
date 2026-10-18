import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The route uses the global fetch through the shared client; stub it per test.
let routes: Record<string, { status: number; body: unknown }> = {};

beforeEach(() => {
  vi.resetModules();
  routes = {};
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const path = String(input).replace("https://api.github.com", "");
      const r = routes[path];
      return new Response(JSON.stringify(r?.body ?? {}), { status: r?.status ?? 404 });
    }),
  );
});

afterEach(() => vi.unstubAllGlobals());

async function post(body: unknown, headers: Record<string, string> = { "content-type": "application/json" }) {
  const { POST } = await import("@/app/api/resolve/route");
  const res = await POST(
    new Request("http://localhost/api/resolve", {
      method: "POST",
      headers: { "x-forwarded-for": `10.0.0.${Math.floor(Math.random() * 250)}`, ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
  return { status: res.status, json: await res.json(), headers: res.headers };
}

const asset = (name: string) => ({
  name,
  size: 2048,
  state: "uploaded",
  browser_download_url: `https://github.com/acme/tool/releases/download/v1.2.0/${name}`,
});

describe("POST /api/resolve", () => {
  it("resolves a repository URL", async () => {
    routes["/repos/acme/tool/releases/latest"] = {
      status: 200,
      body: {
        tag_name: "v1.2.0",
        name: "Tool 1.2",
        html_url: "https://github.com/acme/tool/releases/tag/v1.2.0",
        draft: false,
        prerelease: false,
        published_at: "2026-09-01T00:00:00Z",
        assets: [asset("tool-1.2.0-darwin-arm64.dmg"), asset("tool-1.2.0-windows-x64.msi")],
      },
    };
    const { status, json, headers } = await post({ url: "https://github.com/acme/tool", os: "macos", arch: "arm64" });
    expect(status).toBe(200);
    expect(headers.get("cache-control")).toBe("no-store");
    expect(json).toMatchObject({
      ok: true,
      release: { tag: "v1.2.0", name: "Tool 1.2" },
      recommendation: { status: "recommended", asset: { name: "tool-1.2.0-darwin-arm64.dmg", kind: "installer" } },
    });
    // Internal confidence is never exposed.
    expect(JSON.stringify(json)).not.toMatch(/confidence/);
  });

  it("rejects non-GitHub URLs with 400", async () => {
    const { status, json } = await post({ url: "https://example.com/acme/tool", os: "linux", arch: "x64" });
    expect(status).toBe(400);
    expect(json).toEqual({ ok: false, error: { code: "INVALID_URL", message: expect.any(String) } });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects bad platform values", async () => {
    const { status, json } = await post({ url: "https://github.com/a/b", os: "beos", arch: "x64" });
    expect(status).toBe(400);
    expect(json.error.code).toBe("INVALID_REQUEST");
  });

  it("rejects non-JSON bodies", async () => {
    expect((await post("url=x", { "content-type": "text/plain" })).status).toBe(400);
    expect((await post("{not json")).status).toBe(400);
  });

  it("rejects oversized bodies", async () => {
    const { status } = await post({ url: "https://github.com/a/b", os: "linux", arch: "x64", pad: "x".repeat(5000) });
    expect(status).toBe(400);
  });

  it("returns 404 for missing repositories", async () => {
    const { status, json } = await post({ url: "https://github.com/acme/missing", os: "linux", arch: "x64" });
    expect(status).toBe(404);
    expect(json.error.code).toBe("REPO_NOT_FOUND");
  });

  it("never includes stack traces", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("boom at secret/path.ts:12"); }));
    const { status, json } = await post({ url: "https://github.com/acme/tool", os: "linux", arch: "x64" });
    expect(status).toBe(502);
    expect(JSON.stringify(json)).not.toMatch(/boom|path\.ts|stack/);
  });
});
