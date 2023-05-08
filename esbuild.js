#!/usr/bin/env node

import { build } from "esbuild";

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
  minify: true,
  tsconfig: "tsconfig.json",
}).catch(() => process.exit(1));
