import { describe, expect, it } from "vitest";
import { classifyAsset, selectAsset } from "@/core/match";
import type { Platform } from "@/core/types";
import {
  AMBIGUOUS,
  CONFLICTING,
  ELECTRON,
  GO_STYLE,
  RUST_TRIPLES,
  SOURCE_ONLY,
  WINDOWS_ONLY,
  assets,
} from "../fixtures/releases";

const P = (os: Platform["os"], arch: Platform["arch"]): Platform => ({ os, arch });

function pick(list: Parameters<typeof selectAsset>[0], platform: Platform, prefs?: Parameters<typeof selectAsset>[2]) {
  const r = selectAsset(list, platform, prefs);
  return r.status === "match" ? r.asset.name : `none:${r.reason}`;
}

describe("classifyAsset", () => {
  it.each([
    ["app-1.0.0-x86_64-pc-windows-msvc.zip", "windows", "x64"],
    ["app-1.0.0-aarch64-apple-darwin.tar.gz", "macos", "arm64"],
    ["app_1.0.0_linux_amd64.deb", "linux", "x64"],
    ["app-1.0.0-i686-unknown-linux-gnu.tar.gz", "linux", "x86"],
    ["App-win64.zip", "windows", "x64"],
    ["App-osx-universal.dmg", "macos", "universal"],
    ["tool_Darwin_arm64", "macos", "arm64"],
    ["app-1.386.0-linux-x64.tar.gz", "linux", "x64"],
  ])("reads %s as %s/%s", (name, os, arch) => {
    const info = classifyAsset(name);
    expect(info.excluded).toBeUndefined();
    expect([...info.oses]).toEqual([os]);
    expect([...info.arches]).toEqual([arch]);
  });

  it.each([
    ["checksums.txt", "metadata"],
    ["SHA256SUMS", "metadata"],
    ["app.tar.gz.sig", "metadata"],
    ["latest-mac.yml", "metadata"],
    ["app-1.0.0.dmg.blockmap", "metadata"],
    ["app-1.0.0-src.tar.gz", "source"],
    ["app-1.0.0.tar.gz", "source"],
    ["app-1.0.0-vendor.tar.gz", "source"],
    ["app-debug-linux-x64.tar.gz", "debug"],
    ["app-x64.pdb", "unsupported"],
    ["app-release.apk", "unsupported"],
    ["app.jar", "unsupported"],
  ])("excludes %s as %s", (name, reason) => {
    expect(classifyAsset(name).excluded).toBe(reason);
  });

  it("marks setup and portable variants", () => {
    expect(classifyAsset("Acme Setup 1.0.exe").flags.setup).toBe(true);
    expect(classifyAsset("Acme-Portable-1.0.exe").flags.portable).toBe(true);
  });
});

describe("selectAsset — common platforms", () => {
  it.each([
    [P("windows", "x64"), "ripgrep-14.1.1-x86_64-pc-windows-msvc.zip"],
    [P("windows", "x86"), "ripgrep-14.1.1-i686-pc-windows-msvc.zip"],
    [P("macos", "arm64"), "ripgrep-14.1.1-aarch64-apple-darwin.tar.gz"],
    [P("macos", "x64"), "ripgrep-14.1.1-x86_64-apple-darwin.tar.gz"],
    [P("linux", "arm64"), "ripgrep-14.1.1-aarch64-unknown-linux-gnu.tar.gz"],
    [P("linux", "x64"), "ripgrep-14.1.1-x86_64-unknown-linux-musl.tar.gz"],
  ])("Rust triples: %o → %s", (platform, expected) => {
    expect(pick(RUST_TRIPLES, platform)).toBe(expected);
  });

  it("prefers MSVC over MinGW builds on Windows", () => {
    const list = assets("o", "r", "v1", ["app-x86_64-pc-windows-gnu.zip", "app-x86_64-pc-windows-msvc.zip"]);
    expect(pick(list, P("windows", "x64"))).toBe("app-x86_64-pc-windows-msvc.zip");
  });

  it.each([
    [P("windows", "x64"), "gh_2.60.0_windows_amd64.msi"],
    [P("windows", "arm64"), "gh_2.60.0_windows_arm64.msi"],
    [P("windows", "x86"), "gh_2.60.0_windows_386.msi"],
    [P("macos", "arm64"), "gh_2.60.0_macOS_universal.pkg"],
    [P("macos", "x64"), "gh_2.60.0_macOS_universal.pkg"],
    [P("linux", "x64"), "gh_2.60.0_linux_amd64.tar.gz"],
    [P("linux", "arm64"), "gh_2.60.0_linux_arm64.tar.gz"],
    [P("linux", "x86"), "gh_2.60.0_linux_386.tar.gz"],
  ])("Go style: %o → %s", (platform, expected) => {
    expect(pick(GO_STYLE, platform)).toBe(expected);
  });

  it("macOS: a native universal installer beats an arch-specific zip", () => {
    // arm64 zip (exact) and universal pkg are both native; pkg is the better format.
    const r = selectAsset(
      assets("o", "r", "v1", ["tool_macOS_arm64.zip", "tool_macOS_universal.pkg"]),
      P("macos", "arm64"),
    );
    expect(r.status === "match" && r.asset.name).toBe("tool_macOS_universal.pkg");
  });

  it("honours a Linux package preference (CLI reads /etc/os-release)", () => {
    expect(pick(GO_STYLE, P("linux", "x64"), { linuxPackage: "rpm" })).toBe("gh_2.60.0_linux_amd64.rpm");
    expect(pick(GO_STYLE, P("linux", "x64"), { linuxPackage: "deb" })).toBe("gh_2.60.0_linux_amd64.deb");
  });

  it.each([
    [P("macos", "arm64"), "Acme-1.4.0-arm64.dmg"],
    [P("macos", "x64"), "Acme-1.4.0.dmg"],
    [P("windows", "x64"), "Acme Setup 1.4.0.exe"],
    [P("linux", "x64"), "Acme-1.4.0.AppImage"],
    [P("linux", "arm64"), "Acme-1.4.0-arm64.AppImage"],
  ])("electron-builder: %o → %s", (platform, expected) => {
    expect(pick(ELECTRON, platform)).toBe(expected);
  });

  it("electron-builder: Windows arm64 falls back to the unlabelled x64 installer only when nothing is labelled", () => {
    expect(pick(ELECTRON, P("windows", "arm64"))).toBe("Acme Setup 1.4.0.exe");
  });

  it("prefers installers over portable builds", () => {
    expect(pick(WINDOWS_ONLY, P("windows", "x64"))).toBe("WinApp-Setup-x64.exe");
    expect(pick(WINDOWS_ONLY, P("windows", "arm64"))).toBe("WinApp-Setup-arm64.exe");
  });

  it("reports kind and format for the selected asset", () => {
    const r = selectAsset(GO_STYLE, P("windows", "x64"));
    expect(r).toMatchObject({ status: "match", kind: "installer", format: "MSI", confidence: "high" });
    const z = selectAsset(WINDOWS_ONLY, P("windows", "x64"));
    expect(z).toMatchObject({ kind: "installer", format: "EXE" });
    const a = selectAsset(ELECTRON, P("linux", "x64"));
    expect(a).toMatchObject({ kind: "portable", format: "AppImage", confidence: "medium" });
  });
});

describe("selectAsset — refusing to guess", () => {
  it("returns no-assets for an empty release", () => {
    expect(selectAsset([], P("linux", "x64"))).toEqual({ status: "none", reason: "no-assets" });
  });

  it("returns source-only when only source archives exist", () => {
    expect(selectAsset(SOURCE_ONLY, P("macos", "arm64"))).toEqual({ status: "none", reason: "source-only" });
  });

  it("returns ambiguous for equally good but different files", () => {
    expect(selectAsset(AMBIGUOUS, P("linux", "x64"))).toEqual({ status: "none", reason: "ambiguous" });
  });

  it("still matches a single clear file in the same release", () => {
    expect(pick(AMBIGUOUS, P("windows", "x64"))).toBe("suite-cli-2.0.0-windows-x64.zip");
  });

  it("ignores conflicting filenames", () => {
    expect(selectAsset(CONFLICTING, P("linux", "x64"))).toEqual({ status: "none", reason: "no-compatible" });
    expect(selectAsset(CONFLICTING, P("windows", "x64"))).toEqual({ status: "none", reason: "no-compatible" });
  });

  it("returns no-compatible when the platform isn't built", () => {
    expect(selectAsset(WINDOWS_ONLY, P("macos", "arm64"))).toEqual({ status: "none", reason: "no-compatible" });
    expect(selectAsset(WINDOWS_ONLY, P("linux", "x64"))).toEqual({ status: "none", reason: "no-compatible" });
  });

  it("never offers 32-bit ARM or other architectures to arm64", () => {
    const list = assets("o", "r", "v1", ["tool-linux-armv7.tar.gz", "tool-linux-x64.tar.gz"]);
    expect(selectAsset(list, P("linux", "arm64"))).toEqual({ status: "none", reason: "no-compatible" });
  });

  it("does not run x64 Linux builds on arm64 or unlabelled builds on Linux arm64", () => {
    const list = assets("o", "r", "v1", ["tool-linux.tar.gz", "tool.AppImage"]);
    expect(selectAsset(list, P("linux", "arm64")).status).toBe("none");
    expect(pick(list, P("linux", "x64"))).toBe("tool.AppImage");
  });

  it("does not treat an unlabelled file as arm64 when other arches are labelled", () => {
    const list = assets("o", "r", "v1", ["App-x64.dmg", "App.zip"]);
    // arm64 Mac: x64 runs via Rosetta; the unlabelled zip is not considered.
    expect(pick(list, P("macos", "arm64"))).toBe("App-x64.dmg");
  });

  it("ignores Android/other OS builds", () => {
    const list = assets("o", "r", "v1", ["app-android-arm64.apk", "app-freebsd-amd64.tar.gz"]);
    expect(selectAsset(list, P("linux", "x64")).status).toBe("none");
  });
});
