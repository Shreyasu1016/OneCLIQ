/** Read the real OS / CPU of this machine — no guessing from a browser. */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import os from "node:os";
import type { Arch, Os } from "../../src/core/types";
import type { MatchPreferences } from "../../src/core/match";

export interface SystemInfo {
  os: Os | null;
  arch: Arch | null;
  /** Human detail, e.g. "macOS 15.1 (Rosetta)" */
  detail: string;
  linuxPackage?: MatchPreferences["linuxPackage"];
  distro?: string;
}

export function detectSystem(): SystemInfo {
  const platform = process.platform;
  const osName: Os | null =
    platform === "darwin" ? "macos" : platform === "win32" ? "windows" : platform === "linux" ? "linux" : null;

  let arch: Arch | null =
    process.arch === "x64" ? "x64" : process.arch === "arm64" ? "arm64" : process.arch === "ia32" ? "x86" : null;
  const notes: string[] = [];

  // An x64 Node under Rosetta / Windows-on-ARM emulation would otherwise report x64.
  if (osName === "macos" && arch === "x64") {
    try {
      const translated = execFileSync("sysctl", ["-in", "sysctl.proc_translated"], { encoding: "utf8" }).trim();
      if (translated === "1") {
        arch = "arm64";
        notes.push("Node is running under Rosetta");
      }
    } catch {
      /* not available */
    }
  }
  if (osName === "windows" && arch !== "arm64") {
    const id = `${process.env.PROCESSOR_ARCHITEW6432 ?? ""} ${process.env.PROCESSOR_ARCHITECTURE ?? ""}`;
    if (/ARM64/i.test(id)) {
      arch = "arm64";
      notes.push("emulated Node detected");
    }
  }

  const info: SystemInfo = { os: osName, arch, detail: "" };

  if (osName === "linux") {
    try {
      const release = readFileSync("/etc/os-release", "utf8");
      const field = (k: string) => new RegExp(`^${k}="?([^"\\n]*)"?`, "m").exec(release)?.[1] ?? "";
      const ids = `${field("ID")} ${field("ID_LIKE")}`.toLowerCase();
      info.distro = field("PRETTY_NAME") || field("ID");
      if (/debian|ubuntu/.test(ids)) info.linuxPackage = "deb";
      else if (/fedora|rhel|centos|suse|opensuse|rocky|alma|amzn/.test(ids)) info.linuxPackage = "rpm";
    } catch {
      /* unknown distro */
    }
  }

  const base = osName === "macos" ? `macOS ${macVersion() ?? os.release()}` : info.distro || `${os.type()} ${os.release()}`;
  info.detail = notes.length ? `${base} · ${notes.join(", ")}` : base;
  return info;
}

function macVersion(): string | undefined {
  try {
    return execFileSync("sw_vers", ["-productVersion"], { encoding: "utf8" }).trim() || undefined;
  } catch {
    return undefined;
  }
}
