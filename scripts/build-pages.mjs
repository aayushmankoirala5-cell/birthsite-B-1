import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const stage = join(root, ".pages-build");
const repository = process.env.GITHUB_REPOSITORY?.split("/")[1] || "birthsite-B-1";
const basePath = process.env.PAGES_BASE_PATH ??
  (repository.endsWith(".github.io") ? "" : `/${repository}`);
if (basePath !== "" && !/^\/[A-Za-z0-9._-]+$/.test(basePath)) {
  throw new Error("PAGES_BASE_PATH must be empty or a single /repository-name.");
}

// Allowlist the public demo: never copy API routes, admin code, .env files,
// local customer records, or server modules into the static application.
await rm(stage, { recursive: true, force: true });
await rm(join(root, "out"), { recursive: true, force: true });
for (const path of [
  "app/layout.tsx", "app/globals.css", "app/error.tsx", "app/not-found.tsx",
  "components/birthday-experience.tsx", "lib/demo.ts", "lib/types.ts",
  "lib/asset-path.ts", "public", "package.json", "tsconfig.json",
  "postcss.config.mjs",
]) {
  const destination = join(stage, path);
  await mkdir(dirname(destination), { recursive: true });
  await cp(join(root, path), destination, { recursive: true });
}

const cssPath = join(stage, "app/globals.css");
await writeFile(cssPath, (await readFile(cssPath, "utf8"))
  .replaceAll('url("/fonts/', `url("${basePath}/fonts/`));
await writeFile(join(stage, "app/page.tsx"), `
import BirthdayExperience from "@/components/birthday-experience";
import { DEMO_PUBLIC, DEMO_TEASER } from "@/lib/demo";
export default function HomePage() {
  return <BirthdayExperience teaser={DEMO_TEASER} demoContent={DEMO_PUBLIC} />;
}
`);
await writeFile(join(stage, "next.config.mjs"), `
import path from "node:path";
export default {
  output: "export",
  basePath: ${JSON.stringify(basePath)},
  trailingSlash: true,
  images: { unoptimized: true },
  poweredByHeader: false,
  turbopack: { root: path.resolve(import.meta.dirname, "..") },
};
`);

const result = spawnSync(process.execPath, [
  join(root, "node_modules/next/dist/bin/next"), "build", stage,
], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, NEXT_PUBLIC_BASE_PATH: basePath, NEXT_TELEMETRY_DISABLED: "1" },
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
await cp(join(stage, "out"), join(root, "out"), { recursive: true });
await writeFile(join(root, "out/.nojekyll"), "");
console.log(`GitHub Pages demo built in out/ (base path: ${basePath || "/"}).`);
