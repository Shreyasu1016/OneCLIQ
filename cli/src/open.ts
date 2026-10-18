/** Hand a downloaded file to the OS — only ever after the user explicitly asks. */
import { spawn } from "node:child_process";
import { chmod } from "node:fs/promises";
import path from "node:path";

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "ignore", detached: true, shell: false });
    child.on("error", reject);
    child.unref();
    resolve();
  });
}

/** Open with the system's default handler (e.g. mounts a .dmg, starts an installer UI). */
export async function openFile(file: string): Promise<void> {
  if (process.platform === "darwin") return run("open", [file]);
  if (process.platform === "win32") return run("explorer.exe", [file]);
  return run("xdg-open", [file]);
}

/** Show the file in Finder / Explorer / the file manager. */
export async function revealFile(file: string): Promise<void> {
  if (process.platform === "darwin") return run("open", ["-R", file]);
  if (process.platform === "win32") return run("explorer.exe", [`/select,${file}`]);
  return run("xdg-open", [path.dirname(file)]);
}

export async function makeExecutable(file: string): Promise<void> {
  await chmod(file, 0o755);
}
