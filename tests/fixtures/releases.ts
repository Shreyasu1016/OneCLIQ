/** Asset lists modelled on real-world release naming conventions. */
import type { ReleaseAsset } from "@/core/types";

export function assets(owner: string, repo: string, tag: string, names: string[]): ReleaseAsset[] {
  return names.map((name, i) => ({
    name,
    size: 1_000_000 + i,
    downloadUrl: `https://github.com/${owner}/${repo}/releases/download/${tag}/${encodeURIComponent(name)}`,
  }));
}

// Rust-style target triples (ripgrep, bat, fd …)
export const RUST_TRIPLES = assets("BurntSushi", "ripgrep", "14.1.1", [
  "ripgrep-14.1.1-aarch64-apple-darwin.tar.gz",
  "ripgrep-14.1.1-aarch64-apple-darwin.tar.gz.sha256",
  "ripgrep-14.1.1-aarch64-unknown-linux-gnu.tar.gz",
  "ripgrep-14.1.1-armv7-unknown-linux-gnueabihf.tar.gz",
  "ripgrep-14.1.1-i686-pc-windows-msvc.zip",
  "ripgrep-14.1.1-x86_64-apple-darwin.tar.gz",
  "ripgrep-14.1.1-x86_64-pc-windows-gnu.zip",
  "ripgrep-14.1.1-x86_64-pc-windows-msvc.zip",
  "ripgrep-14.1.1-x86_64-unknown-linux-musl.tar.gz",
  "ripgrep_14.1.1-1_amd64.deb",
  "ripgrep-14.1.1-x86_64-pc-windows-msvc.zip.sha256",
]);

// Go-style os_arch (GitHub CLI)
export const GO_STYLE = assets("cli", "cli", "v2.60.0", [
  "gh_2.60.0_checksums.txt",
  "gh_2.60.0_linux_386.deb",
  "gh_2.60.0_linux_386.rpm",
  "gh_2.60.0_linux_386.tar.gz",
  "gh_2.60.0_linux_amd64.deb",
  "gh_2.60.0_linux_amd64.rpm",
  "gh_2.60.0_linux_amd64.tar.gz",
  "gh_2.60.0_linux_arm64.deb",
  "gh_2.60.0_linux_arm64.rpm",
  "gh_2.60.0_linux_arm64.tar.gz",
  "gh_2.60.0_linux_armv6.tar.gz",
  "gh_2.60.0_macOS_amd64.zip",
  "gh_2.60.0_macOS_arm64.zip",
  "gh_2.60.0_macOS_universal.pkg",
  "gh_2.60.0_windows_386.msi",
  "gh_2.60.0_windows_386.zip",
  "gh_2.60.0_windows_amd64.msi",
  "gh_2.60.0_windows_amd64.zip",
  "gh_2.60.0_windows_arm64.msi",
  "gh_2.60.0_windows_arm64.zip",
]);

// electron-builder defaults: unlabelled = x64
export const ELECTRON = assets("acme", "desktop", "v1.4.0", [
  "Acme-1.4.0-arm64-mac.zip",
  "Acme-1.4.0-arm64.dmg",
  "Acme-1.4.0-arm64.dmg.blockmap",
  "Acme-1.4.0-mac.zip",
  "Acme-1.4.0.dmg",
  "Acme-1.4.0.dmg.blockmap",
  "Acme-1.4.0.AppImage",
  "Acme-1.4.0-arm64.AppImage",
  "acme_1.4.0_amd64.deb",
  "Acme Setup 1.4.0.exe",
  "Acme Setup 1.4.0.exe.blockmap",
  "Acme 1.4.0.exe",
  "latest.yml",
  "latest-mac.yml",
  "latest-linux.yml",
]);

export const SOURCE_ONLY = assets("acme", "lib", "v3.0.0", [
  "lib-3.0.0.tar.gz",
  "lib-3.0.0-src.zip",
  "lib-3.0.0.tar.gz.asc",
  "SHA256SUMS",
]);

export const AMBIGUOUS = assets("acme", "suite", "v2.0.0", [
  "suite-cli-2.0.0-linux-x64.tar.gz",
  "suite-server-2.0.0-linux-x64.tar.gz",
  "suite-cli-2.0.0-windows-x64.zip",
]);

export const CONFLICTING = assets("acme", "weird", "v1.0.0", [
  "weird-1.0.0-linux-windows.zip",
  "weird-1.0.0-x64-arm64-linux.tar.gz",
]);

export const WINDOWS_ONLY = assets("acme", "winapp", "v5.0.0", [
  "WinApp-Setup-x64.exe",
  "WinApp-Setup-arm64.exe",
  "WinApp-Portable-x64.zip",
]);
