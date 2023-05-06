#!/usr/bin/env node

const { build } = require("esbuild");

build({
  entryPoints: [
    "src/index.ts",
    "src/AuthProvider.tsx",
    "src/useAuthService.ts",
    "src/utils/pkce.ts",
    "src/utils/storage.ts",
    "src/utils/url.ts",
  ],
  outdir: "dist",
  platform: "browser",
  sourcemap: true,
  tsconfig: "tsconfig.json",
}).catch(() => process.exit(1));
