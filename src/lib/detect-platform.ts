import type { Arch, Os } from "@/core/types";

/**
 * "sure"   — from User-Agent Client Hints (Chromium), reported by the browser itself.
 * "likely" — from the classic User-Agent string or GPU name; usually right, shown as a guess.
 * Anything less is left blank so the user chooses.
 */
export type Certainty = "sure" | "likely";

export interface DetectedPlatform {
  os?: Os;
  arch?: Arch;
  osCertainty?: Certainty;
  archCertainty?: Certainty;
  /** Phone or tablet: we can't download desktop software for this device. */
  mobile: boolean;
}

interface UADataLike {
  mobile?: boolean;
  platform?: string;
  getHighEntropyValues?: (hints: string[]) => Promise<{ architecture?: string; bitness?: string; platform?: string }>;
}

function osFromName(name: string): Os | undefined {
  const n = name.toLowerCase();
  if (n.includes("win")) return "windows";
  if (n.includes("mac")) return "macos";
  if (n.includes("linux")) return "linux";
  return undefined;
}

export async function detectPlatform(nav: Navigator = navigator): Promise<DetectedPlatform> {
  const ua = nav.userAgent || "";
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || (/Macintosh/.test(ua) && (nav.maxTouchPoints ?? 0) > 1);
  const result: DetectedPlatform = { mobile };
  if (mobile) return result;

  const uaData = (nav as Navigator & { userAgentData?: UADataLike }).userAgentData;
  if (uaData?.getHighEntropyValues) {
    try {
      const hints = await uaData.getHighEntropyValues(["architecture", "bitness", "platform"]);
      const os = osFromName(hints.platform || uaData.platform || "");
      if (os) {
        result.os = os;
        result.osCertainty = "sure";
      }
      if (hints.architecture === "arm" && hints.bitness === "64") result.arch = "arm64";
      else if (hints.architecture === "x86" && hints.bitness === "64") result.arch = "x64";
      else if (hints.architecture === "x86" && hints.bitness === "32") result.arch = "x86";
      if (result.arch) result.archCertainty = "sure";
      if (result.os && result.arch) return result;
    } catch {
      // fall through to UA parsing
    }
  }

  if (!result.os) {
    const os = /Windows NT/i.test(ua)
      ? "windows"
      : /Macintosh|Mac OS X/i.test(ua)
        ? "macos"
        : /Linux|X11/i.test(ua) && !/CrOS/i.test(ua)
          ? "linux"
          : undefined;
    if (os) {
      result.os = os;
      result.osCertainty = "likely";
    }
  }

  if (!result.arch && result.os) {
    if (result.os === "windows") {
      if (/ARM64|aarch64/i.test(ua)) result.arch = "arm64";
      else if (/Win64|x64|WOW64|amd64/i.test(ua)) result.arch = "x64";
    } else if (result.os === "linux") {
      if (/aarch64|arm64/i.test(ua)) result.arch = "arm64";
      else if (/x86_64|amd64/i.test(ua)) result.arch = "x64";
      else if (/i[3-6]86/i.test(ua)) result.arch = "x86";
    } else if (result.os === "macos") {
      // Every Mac browser says "Intel" in its UA. The GPU name is a better hint.
      const gpu = webglRenderer();
      if (gpu && /Apple (M\d|GPU)/i.test(gpu)) result.arch = "arm64";
      else if (gpu && /Intel|AMD|Radeon|NVIDIA/i.test(gpu)) result.arch = "x64";
    }
    if (result.arch) result.archCertainty = "likely";
  }

  return result;
}

function webglRenderer(): string | undefined {
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return undefined;
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const value = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    return typeof value === "string" ? value : undefined;
  } catch {
    return undefined;
  }
}
