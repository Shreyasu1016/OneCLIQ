/**
 * Asset matching: decide which release file (if any) fits an OS + CPU architecture.
 *
 * Everything here is pure and synchronous so it can be unit-tested exhaustively.
 * The rule of thumb: explicit filename signals only. If a name is ambiguous or
 * contradicts itself, it is not a match — we never guess just to return something.
 */
import type { Arch, AssetKind, NoMatchReason, Os, Platform, ReleaseAsset } from "./types";

type ArchToken = Arch | "universal" | "other";
type DetectedOs = Os | "other";

export type ExclusionReason = "metadata" | "source" | "debug" | "unsupported";

export interface AssetInfo {
  name: string;
  excluded?: ExclusionReason;
  /** Operating systems named or implied by the file. More than one = conflict. */
  oses: Set<DetectedOs>;
  arches: Set<ArchToken>;
  format: FormatInfo | null;
  flags: { setup: boolean; portable: boolean; user: boolean; musl: boolean; msvc: boolean };
}

export interface FormatInfo {
  id: string;
  label: string;
  /** OS this format only exists on (e.g. .dmg → macOS). */
  impliedOs?: Os;
  /** Generic archive with no platform meaning on its own. */
  generic?: boolean;
}

export type Confidence = "high" | "medium";

export type MatchResult =
  | { status: "match"; asset: ReleaseAsset; info: AssetInfo; kind: AssetKind; format: string; confidence: Confidence }
  | { status: "none"; reason: NoMatchReason };

export interface MatchPreferences {
  /** Bias toward a native Linux package format (the CLI reads /etc/os-release). */
  linuxPackage?: "deb" | "rpm";
}

// ---------------------------------------------------------------------------
// Formats
// ---------------------------------------------------------------------------

// Longest suffixes first so ".app.zip" wins over ".zip", ".tar.gz" over ".gz".
const FORMATS: Array<[suffix: string, info: FormatInfo]> = [
  [".app.tar.gz", { id: "app-archive", label: "App bundle", impliedOs: "macos" }],
  [".app.zip", { id: "app-archive", label: "App bundle", impliedOs: "macos" }],
  [".msixbundle", { id: "msix", label: "MSIX", impliedOs: "windows" }],
  [".appxbundle", { id: "msix", label: "APPX", impliedOs: "windows" }],
  [".appimage", { id: "appimage", label: "AppImage", impliedOs: "linux" }],
  [".flatpak", { id: "flatpak", label: "Flatpak", impliedOs: "linux" }],
  [".tar.gz", { id: "tar", label: "tar.gz", generic: true }],
  [".tar.xz", { id: "tar", label: "tar.xz", generic: true }],
  [".tar.bz2", { id: "tar", label: "tar.bz2", generic: true }],
  [".tar.zst", { id: "tar", label: "tar.zst", generic: true }],
  [".msix", { id: "msix", label: "MSIX", impliedOs: "windows" }],
  [".appx", { id: "msix", label: "APPX", impliedOs: "windows" }],
  [".snap", { id: "snap", label: "Snap", impliedOs: "linux" }],
  [".tgz", { id: "tar", label: "tgz", generic: true }],
  [".txz", { id: "tar", label: "txz", generic: true }],
  [".exe", { id: "exe", label: "EXE", impliedOs: "windows" }],
  [".msi", { id: "msi", label: "MSI", impliedOs: "windows" }],
  [".dmg", { id: "dmg", label: "DMG", impliedOs: "macos" }],
  [".pkg", { id: "pkg", label: "PKG", impliedOs: "macos" }],
  [".deb", { id: "deb", label: "DEB", impliedOs: "linux" }],
  [".rpm", { id: "rpm", label: "RPM", impliedOs: "linux" }],
  [".zip", { id: "zip", label: "zip", generic: true }],
  [".7z", { id: "7z", label: "7z", generic: true }],
];

const METADATA_SUFFIXES = [
  ".sha256", ".sha256sum", ".sha512", ".sha512sum", ".sha1", ".md5", ".sig", ".asc", ".gpg",
  ".pem", ".crt", ".cert", ".minisig", ".sbom", ".spdx", ".json", ".jsonl", ".yml", ".yaml",
  ".txt", ".md", ".blockmap", ".xml", ".html", ".zsync", ".b3", ".cdx", ".sigstore", ".bundle",
  ".pub", ".log", ".toml", ".ini", ".csv",
];

/** Files for platforms this tool doesn't target, or that aren't standalone downloads. */
const UNSUPPORTED_SUFFIXES = [
  ".apk", ".aab", ".ipa", ".jar", ".war", ".vsix", ".whl", ".gem", ".nupkg", ".crx", ".xpi",
  ".wasm", ".js", ".mjs", ".py", ".sh", ".ps1", ".bat", ".cmd", ".msp", ".patch", ".diff",
  ".pdb", ".dsym", ".gz", ".xz", ".bz2", ".zst", ".iso", ".img", ".qcow2", ".vmdk", ".ova",
];

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

const B = "(?:^|[^a-z0-9])"; // left boundary
const E = "(?=$|[^a-z0-9])"; // right boundary

function tok(pattern: string): RegExp {
  return new RegExp(`${B}(?:${pattern})${E}`, "g");
}

function has(re: RegExp, s: string): boolean {
  re.lastIndex = 0;
  const found = re.test(s);
  re.lastIndex = 0;
  return found;
}

// Combined OS+arch tokens are consumed first so "win64" doesn't also look like "win".
const COMBINED: Array<[RegExp, DetectedOs, ArchToken]> = [
  [tok("win64"), "windows", "x64"],
  [tok("linux64"), "linux", "x64"],
  [tok("linux32"), "linux", "x86"],
  [tok("osx64|mac64|macos64"), "macos", "x64"],
];

const OS_TOKENS: Array<[RegExp, DetectedOs]> = [
  [tok("windows|win|win32|mingw|mingw32|mingw64|msvc|cygwin"), "windows"],
  [tok("macos|macosx|mac|osx|darwin|apple"), "macos"],
  [tok("linux|ubuntu|debian|fedora|centos|rhel|el[6-9]|opensuse|suse|archlinux|manylinux\\w*|alpine"), "linux"],
  [tok("freebsd|netbsd|openbsd|dragonfly|illumos|solaris|aix|android|ios|ipados|plan9|haiku|wasi|wasm32"), "other"],
];

// Order matters: specific patterns are removed before broader ones can see them.
const ARCH_TOKENS: Array<[RegExp, ArchToken]> = [
  [tok("x86[_-]64|x8664"), "x64"],
  [tok("aarch64|arm64e?|armv8[a-z]?|apple[_-]?silicon"), "arm64"],
  [tok("armv[5-7][a-z]*|armhf|armel|arm"), "other"],
  [tok("ppc64le|ppc64|ppc|powerpc\\w*|s390x|riscv64|riscv|mips\\w*|loong64|loongarch64|sparc\\w*"), "other"],
  [tok("x64|amd64|intel|64bit|64-bit"), "x64"],
  [tok("i[3-6]86|x86|386|ia32|32bit|32-bit"), "x86"],
  [tok("universal2?|fat|noarch|all|any"), "universal"],
];

const SOURCE_RE = tok("src|source|sources|source[_-]code|vendor|vendored|sdist");
const DEBUG_RE = tok("debug|dbg|debuginfo|dbgsym|symbols|sym|pdb|dsym");
const SETUP_RE = tok("setup|installer|install");
const PORTABLE_RE = tok("portable");
const USER_RE = tok("user|usersetup");
const MUSL_RE = tok("musl|alpine|static");

/** Remove version numbers so "1.386.0" can't read as an x86 build. */
function stripVersions(s: string): string {
  return s.replace(/(^|[^a-z0-9])v?\d+(?:\.\d+)+/g, "$1 ");
}

function take(state: { s: string }, re: RegExp): boolean {
  if (!has(re, state.s)) return false;
  state.s = state.s.replace(re, " ");
  return true;
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

export function classifyAsset(name: string): AssetInfo {
  const lower = name.toLowerCase();
  const info: AssetInfo = {
    name,
    oses: new Set(),
    arches: new Set(),
    format: null,
    flags: { setup: false, portable: false, user: false, musl: false, msvc: false },
  };

  if (/^(sha\d*|md5|checksums?)(sums?)?([._-]|$)/.test(lower) || /checksums?/.test(lower)) {
    info.excluded = "metadata";
    return info;
  }
  if (METADATA_SUFFIXES.some((s) => lower.endsWith(s))) {
    info.excluded = "metadata";
    return info;
  }

  let stem = lower;
  const fmt = FORMATS.find(([suffix]) => lower.endsWith(suffix));
  if (fmt) {
    info.format = fmt[1];
    stem = lower.slice(0, -fmt[0].length);
  } else if (UNSUPPORTED_SUFFIXES.some((s) => lower.endsWith(s))) {
    info.excluded = "unsupported";
    return info;
  } else {
    // Extensionless binary ("tool-linux-amd64") — anything that still ends in a
    // short alphabetic extension is something we don't recognise.
    const ext = /\.([a-z][a-z0-9]{0,7})$/.exec(lower)?.[1];
    if (ext && !/^(x64|amd64|arm64|aarch64|x86|i386|i686|linux|darwin|macos|windows|win|universal)$/.test(ext)) {
      info.excluded = "unsupported";
      return info;
    }
    info.format = { id: "binary", label: "Binary" };
  }

  if (has(DEBUG_RE, stem)) {
    info.excluded = "debug";
    return info;
  }

  const state = { s: stripVersions(stem) };

  for (const [re, os, arch] of COMBINED) {
    if (take(state, re)) {
      info.oses.add(os);
      info.arches.add(arch);
    }
  }
  // Arch first: "x86_64-apple-darwin" must lose "x86_64" before "apple" etc. are read.
  for (const [re, arch] of ARCH_TOKENS) {
    if (take(state, re)) info.arches.add(arch);
  }
  for (const [re, os] of OS_TOKENS) {
    if (take(state, re)) info.oses.add(os);
  }
  if (info.format.impliedOs) info.oses.add(info.format.impliedOs);

  info.flags.setup = has(SETUP_RE, stem);
  info.flags.portable = has(PORTABLE_RE, stem);
  info.flags.user = has(USER_RE, stem);
  info.flags.musl = has(MUSL_RE, stem);
  info.flags.msvc = /(^|[^a-z0-9])msvc($|[^a-z0-9])/.test(stem);

  const platformless = info.oses.size === 0 && info.arches.size === 0;
  if (has(SOURCE_RE, stem) && info.oses.size === 0) {
    info.excluded = "source";
  } else if (platformless && (info.format.generic || info.format.id === "binary")) {
    // "project-1.2.3.tar.gz" with no platform hints is a source or data archive.
    info.excluded = "source";
  }

  return info;
}

// ---------------------------------------------------------------------------
// Ranking
// ---------------------------------------------------------------------------

/** Preference among formats for each OS. Higher is better; absent = not offered. */
function formatRank(os: Os, info: AssetInfo, prefs: MatchPreferences): number {
  const id = info.format?.id;
  const { setup, portable } = info.flags;
  switch (os) {
    case "windows":
      if (id === "exe") return portable ? 70 : setup ? 100 : 80;
      if (id === "msi") return 95;
      if (id === "msix") return 85;
      if (id === "zip") return portable ? 65 : 60;
      if (id === "7z") return 50;
      if (id === "tar") return 45;
      return 0;
    case "macos":
      if (id === "dmg") return 100;
      if (id === "pkg") return 95;
      if (id === "app-archive") return 85;
      if (id === "zip") return 75;
      if (id === "tar") return 70;
      if (id === "binary") return 65;
      return 0;
    case "linux":
      if (id === "deb" && prefs.linuxPackage === "deb") return 105;
      if (id === "rpm" && prefs.linuxPackage === "rpm") return 105;
      if (id === "appimage") return 100;
      if (id === "tar") return 90;
      if (id === "deb") return 85;
      if (id === "rpm") return 84;
      if (id === "binary") return 80;
      if (id === "zip") return 70;
      if (id === "flatpak") return 60;
      if (id === "snap") return 55;
      return 0;
  }
}

function kindOf(info: AssetInfo): AssetKind {
  const id = info.format?.id;
  if (id === "msi" || id === "msix" || id === "dmg" || id === "pkg") return "installer";
  if (id === "exe") return info.flags.setup && !info.flags.portable ? "installer" : "portable";
  if (id === "deb" || id === "rpm" || id === "flatpak" || id === "snap") return "package";
  if (id === "appimage" || id === "binary" || id === "app-archive") return "portable";
  return "archive";
}

/**
 * How well a file's arch label runs on the target.
 *  tier 2 = native (exact, universal, or the unlabelled default x64 build)
 *  tier 1 = runs through a well-established compatibility layer
 *  `fine` breaks ties inside a tier (explicit labels beat inferred ones).
 */
interface ArchFit {
  tier: number;
  fine: number;
}

const NO_FIT: ArchFit = { tier: 0, fine: 0 };

function archFit(target: Platform, arch: ArchToken): ArchFit {
  if (arch === target.arch) return { tier: 2, fine: 4 };
  if (arch === "universal") return { tier: 2, fine: 3 };
  if (target.os === "windows" && target.arch === "x64" && arch === "x86") return { tier: 1, fine: 2 };
  if (target.os === "windows" && target.arch === "arm64" && arch === "x64") return { tier: 1, fine: 2 };
  if (target.os === "windows" && target.arch === "arm64" && arch === "x86") return { tier: 1, fine: 1 };
  if (target.os === "macos" && target.arch === "arm64" && arch === "x64") return { tier: 1, fine: 2 }; // Rosetta 2
  return NO_FIT;
}

/**
 * Unlabelled files (e.g. "App-Setup-1.2.0.exe") are accepted only where the
 * convention is well established:
 *  - x64 targets: an unlabelled build is the default x64 build;
 *  - macOS / Windows on arm64, only when nothing for that OS is labelled at all
 *    (a universal build, or one that runs under Rosetta / Windows emulation).
 * Linux arm64 and x86 targets never accept unlabelled files.
 */
function unlabelledFit(target: Platform, labelled: Set<ArchToken>): ArchFit {
  if (target.arch === "x64") return { tier: 2, fine: 1 };
  if (target.arch === "arm64" && target.os !== "linux" && labelled.size === 0) return { tier: 1, fine: 1 };
  return NO_FIT;
}

interface Candidate {
  asset: ReleaseAsset;
  info: AssetInfo;
  arch: ArchFit;
  format: number;
  variant: number;
}

function compare(a: Candidate, b: Candidate): number {
  return b.arch.tier - a.arch.tier || b.format - a.format || b.arch.fine - a.arch.fine || b.variant - a.variant;
}

export function selectAsset(
  assets: ReleaseAsset[],
  target: Platform,
  prefs: MatchPreferences = {},
): MatchResult {
  if (assets.length === 0) return { status: "none", reason: "no-assets" };

  const classified = assets.map((asset) => ({ asset, info: classifyAsset(asset.name) }));
  const usable = classified.filter(({ info }) => !info.excluded);
  if (usable.length === 0) {
    const anySource = classified.some(({ info }) => info.excluded === "source");
    return { status: "none", reason: anySource ? "source-only" : "no-compatible" };
  }

  // Files that clearly and only target this OS. Names that mention two OSes are conflicts.
  const forOs = usable.filter(({ info }) => info.oses.size === 1 && info.oses.has(target.os));

  const labelledArches = new Set(
    forOs.map(({ info }) => explicitArch(info)).filter((a): a is ArchToken => !!a),
  );

  const candidates: Candidate[] = [];
  for (const { asset, info } of forOs) {
    const format = formatRank(target.os, info, prefs);
    if (format <= 0) continue;

    const arch = explicitArch(info);
    if (arch === null) continue; // conflicting arch labels → never guess
    const fit = arch === undefined ? unlabelledFit(target, labelledArches) : archFit(target, arch);
    if (fit.tier <= 0) continue;

    let variant = 0;
    if (target.os === "windows" && info.flags.user) variant += 1; // per-user installers need no admin
    if (target.os === "windows" && info.flags.msvc) variant += 0.5; // native toolchain over MinGW builds
    if (target.os === "linux" && info.flags.musl) variant -= 1; // prefer glibc builds on desktops

    candidates.push({ asset, info, arch: fit, format, variant });
  }

  if (candidates.length === 0) {
    const anyPlatformBuild = usable.some(({ info }) => info.oses.size > 0);
    const anySource = classified.some(({ info }) => info.excluded === "source");
    return { status: "none", reason: !anyPlatformBuild && anySource ? "source-only" : "no-compatible" };
  }

  candidates.sort(compare);
  const [best, second] = candidates;

  if (second && compare(best, second) === 0) {
    // Two equally good, different files (e.g. "app-cli" vs "app-server"): we can't tell.
    return { status: "none", reason: "ambiguous" };
  }

  return {
    status: "match",
    asset: best.asset,
    info: best.info,
    kind: kindOf(best.info),
    format: best.info.format!.label,
    confidence: best.arch.tier === 2 && best.arch.fine >= 3 ? "high" : "medium",
  };
}

/** The single arch a file targets: undefined = unlabelled, null = conflicting labels. */
function explicitArch(info: AssetInfo): ArchToken | null | undefined {
  const real = [...info.arches].filter((a) => a !== "universal");
  if (info.arches.has("universal") && real.length > 0) {
    // "universal" next to named arches (e.g. "universal-x64-arm64") is a fat binary.
    return real.every((a) => a === "x64" || a === "arm64") ? "universal" : null;
  }
  if (info.arches.size === 0) return undefined;
  if (info.arches.size > 1) {
    // A mac file naming both x64 and arm64 is a fat binary; anything else conflicts.
    return info.arches.size === 2 && info.arches.has("x64") && info.arches.has("arm64") && info.oses.has("macos")
      ? "universal"
      : null;
  }
  return [...info.arches][0];
}
