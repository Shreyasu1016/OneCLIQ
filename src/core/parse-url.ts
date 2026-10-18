import { ResolveError } from "./errors";
import type { RepoTarget } from "./types";

// GitHub's own rules: 1–39 chars, alphanumeric or single hyphens, no leading/trailing hyphen.
const OWNER_RE = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;
const REPO_RE = /^[A-Za-z0-9._-]{1,100}$/;
// Printable, no whitespace/control characters. Slashes are allowed (e.g. "release/1.0").
const TAG_RE = /^[^\s\x00-\x1f\x7f~^:?*[\\]{1,255}$/;

/** First path segments on github.com that are site pages, not users. */
const RESERVED_OWNERS = new Set([
  "about", "account", "apps", "codespaces", "collections", "contact", "customer-stories",
  "dashboard", "enterprise", "events", "explore", "features", "issues", "login", "logout",
  "marketplace", "new", "notifications", "orgs", "organizations", "pricing", "pulls",
  "search", "security", "settings", "site", "sponsors", "topics", "trending", "users",
]);

const ALLOWED_HOSTS = new Set(["github.com", "www.github.com"]);

export interface ParseOptions {
  /** Accept bare "owner/repo" shorthand (CLI only). */
  allowShorthand?: boolean;
}

function invalid(message: string): never {
  throw new ResolveError("INVALID_URL", message);
}

/**
 * Parse a public GitHub repository or release URL into owner/repo and an optional tag.
 * Only github.com URLs are accepted; nothing else from the input is ever used.
 */
export function parseGitHubUrl(input: string, opts: ParseOptions = {}): RepoTarget {
  const raw = (input ?? "").trim();
  if (!raw) invalid("Paste a GitHub repository or release URL.");
  if (raw.length > 2048) invalid("That URL is too long.");

  if (opts.allowShorthand && /^[^/:\s]+\/[^/:\s]+$/.test(raw) && !raw.includes(".com")) {
    const [owner, repo] = raw.split("/");
    return validateParts(owner, stripGitSuffix(repo));
  }

  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    invalid("That doesn't look like a valid URL.");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    invalid("Only https://github.com links are supported.");
  }
  if (!ALLOWED_HOSTS.has(url.hostname.toLowerCase())) {
    invalid("Only github.com URLs are supported.");
  }
  if (url.username || url.password || url.port) {
    invalid("Only plain github.com URLs are supported.");
  }

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length < 2) {
    invalid("Include both the owner and the repository, like github.com/owner/repo.");
  }

  const decoded = segments.map((s) => {
    try {
      return decodeURIComponent(s);
    } catch {
      invalid("That URL contains invalid characters.");
    }
  });

  const [owner, repoSegment, section, ...rest] = decoded;
  const target = validateParts(owner, stripGitSuffix(repoSegment));

  if (section === "releases") {
    const [kind, ...tail] = rest;
    if (kind === "tag" || kind === "download") {
      // tag/<tag…>          → tag may contain slashes
      // download/<tag>/<file> → the last segment is the file name
      const tagParts = kind === "download" ? tail.slice(0, -1) : tail;
      if (kind === "download" && tail.length < 2) invalid("That release download link is incomplete.");
      const tag = tagParts.join("/");
      if (!tag) invalid("That release link doesn't include a release tag.");
      if (!TAG_RE.test(tag) || tag.includes("..")) invalid("That release tag isn't valid.");
      return { ...target, tag };
    }
    // /releases or /releases/latest → latest stable release
  }

  return target;
}

function stripGitSuffix(repo: string): string {
  return repo.toLowerCase().endsWith(".git") ? repo.slice(0, -4) : repo;
}

function validateParts(owner: string, repo: string): RepoTarget {
  if (!owner || !OWNER_RE.test(owner) || RESERVED_OWNERS.has(owner.toLowerCase())) {
    invalid("That GitHub owner name isn't valid.");
  }
  if (!repo || !REPO_RE.test(repo) || repo === "." || repo === "..") {
    invalid("That GitHub repository name isn't valid.");
  }
  return { owner, repo };
}
