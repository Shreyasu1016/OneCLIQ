import type { Arch, AssetKind, NoMatchReason, Os } from "./types";

export const OS_LABELS: Record<Os, string> = {
  windows: "Windows",
  macos: "macOS",
  linux: "Linux",
};

export function archLabel(os: Os, arch: Arch): string {
  if (os === "macos") return arch === "arm64" ? "Apple Silicon (arm64)" : arch === "x64" ? "Intel (x64)" : "x86 (32-bit)";
  if (arch === "arm64") return "ARM64";
  if (arch === "x86") return "x86 (32-bit)";
  return "x64";
}

/** Arches worth offering per OS (32-bit macOS hasn't existed for years). */
export const ARCHES_FOR_OS: Record<Os, Arch[]> = {
  windows: ["x64", "arm64", "x86"],
  macos: ["arm64", "x64"],
  linux: ["x64", "arm64", "x86"],
};

export const KIND_LABELS: Record<AssetKind, string> = {
  installer: "Installer",
  package: "Package",
  portable: "Portable app",
  archive: "Archive",
};

export function noMatchMessage(reason: NoMatchReason, platform: string): string {
  switch (reason) {
    case "no-assets":
      return "This release doesn't include any downloadable files.";
    case "source-only":
      return "This release only ships source code — there's no ready-to-run download.";
    case "ambiguous":
      return `More than one file could fit ${platform}, and we couldn't tell which is right. Pick manually from the release page.`;
    case "no-compatible":
      return `We couldn't find a file built for ${platform} in this release.`;
  }
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}
