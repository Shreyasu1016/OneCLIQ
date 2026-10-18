import { describe, expect, it } from "vitest";
import { parseGitHubUrl } from "@/core/parse-url";
import { ResolveError } from "@/core/errors";

describe("parseGitHubUrl", () => {
  it.each([
    ["https://github.com/cli/cli", { owner: "cli", repo: "cli" }],
    ["https://github.com/cli/cli/", { owner: "cli", repo: "cli" }],
    ["github.com/BurntSushi/ripgrep", { owner: "BurntSushi", repo: "ripgrep" }],
    ["http://www.github.com/sharkdp/bat.git", { owner: "sharkdp", repo: "bat" }],
    ["https://github.com/sharkdp/bat/releases", { owner: "sharkdp", repo: "bat" }],
    ["https://github.com/sharkdp/bat/releases/latest", { owner: "sharkdp", repo: "bat" }],
    ["https://github.com/sharkdp/bat/tree/master/src", { owner: "sharkdp", repo: "bat" }],
    ["https://github.com/sharkdp/bat?tab=readme#install", { owner: "sharkdp", repo: "bat" }],
    ["  https://github.com/owner-name/repo.name_1  ", { owner: "owner-name", repo: "repo.name_1" }],
  ])("parses repository URL %s", (input, expected) => {
    expect(parseGitHubUrl(input)).toEqual(expected);
  });

  it.each([
    ["https://github.com/cli/cli/releases/tag/v2.60.0", "v2.60.0"],
    ["https://github.com/o/r/releases/tag/release%2F1.0", "release/1.0"],
    ["https://github.com/o/r/releases/tag/release/1.0", "release/1.0"],
    ["https://github.com/o/r/releases/download/v1.2.3/app-linux-x64.tar.gz", "v1.2.3"],
  ])("extracts the tag from release URL %s", (input, tag) => {
    expect(parseGitHubUrl(input).tag).toBe(tag);
  });

  it.each([
    "",
    "   ",
    "not a url",
    "https://gitlab.com/owner/repo",
    "https://github.com.evil.com/owner/repo",
    "https://evil.com/github.com/owner/repo",
    "https://api.github.com/repos/owner/repo",
    "https://raw.githubusercontent.com/owner/repo/main/x",
    "ftp://github.com/owner/repo",
    "javascript:alert(1)",
    "file:///etc/passwd",
    "https://user:pass@github.com/owner/repo",
    "https://github.com:8443/owner/repo",
    "https://github.com/owner",
    "https://github.com/",
    "https://github.com/settings/profile",
    "https://github.com/-bad-/repo",
    "https://github.com/owner/re po",
    "https://github.com/owner/..",
    "https://github.com/o/r/releases/tag/",
    "https://github.com/o/r/releases/tag/bad%20tag",
    "https://github.com/o/r/releases/download/v1",
    "https://github.com/o/r/releases/tag/%E0%A4%A",
  ])("rejects %j", (input) => {
    expect(() => parseGitHubUrl(input)).toThrow(ResolveError);
  });

  it("uses the INVALID_URL code", () => {
    try {
      parseGitHubUrl("https://example.com/a/b");
    } catch (err) {
      expect((err as ResolveError).code).toBe("INVALID_URL");
    }
  });

  it("accepts owner/repo shorthand only when allowed", () => {
    expect(() => parseGitHubUrl("cli/cli")).toThrow(ResolveError);
    expect(parseGitHubUrl("cli/cli", { allowShorthand: true })).toEqual({ owner: "cli", repo: "cli" });
  });
});
