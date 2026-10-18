import { readFileSync } from "node:fs";
import { defineConfig } from "tsup";

const { version } = JSON.parse(readFileSync("./cli/package.json", "utf8")) as { version: string };

// Bundles the CLI and the shared resolver core into one dependency-free file.
export default defineConfig({
  entry: { oqgit: "cli/src/bin.ts" },
  outDir: "cli/dist",
  format: ["esm"],
  platform: "node",
  target: "node20",
  bundle: true,
  noExternal: [/.*/],
  clean: true,
  minify: true,
  sourcemap: false,
  banner: { js: "#!/usr/bin/env node" },
  define: { __OQGIT_VERSION__: JSON.stringify(version) },
});
