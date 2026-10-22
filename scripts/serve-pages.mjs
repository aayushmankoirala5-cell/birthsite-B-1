import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const output = fileURLToPath(new URL("../out", import.meta.url));
const repository = process.env.GITHUB_REPOSITORY?.split("/")[1] || "birthsite-B-1";
const basePath = process.env.PAGES_BASE_PATH ??
  (repository.endsWith(".github.io") ? "" : `/${repository}`);
const types = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json",
  ".txt": "text/plain; charset=utf-8", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2",
};
createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    if (basePath && pathname === basePath) {
      response.writeHead(308, { Location: `${basePath}/` }).end();
      return;
    }
    if (!pathname.startsWith(`${basePath}/`)) throw new Error("Not found");
    let path = resolve(output, `.${pathname.slice(basePath.length)}`);
    if (path !== output && !path.startsWith(`${output}${sep}`)) throw new Error("Not found");
    if ((await stat(path)).isDirectory()) path = join(path, "index.html");
    const body = await readFile(path);
    response.writeHead(200, { "Content-Type": types[extname(path)] || "application/octet-stream" });
    response.end(body);
  } catch {
    response.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    response.end(await readFile(join(output, "404.html")).catch(() => "Not found"));
  }
}).listen(3103, "127.0.0.1", () => {
  console.log(`Static Pages preview: http://127.0.0.1:3103${basePath}/`);
});
