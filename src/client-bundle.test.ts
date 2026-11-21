import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const src = dirname(fileURLToPath(new URL("./index.ts", import.meta.url)));

function reachable(start: string): string[] {
  const seen = new Set<string>();
  const queue = [start];
  while (queue.length > 0) {
    const file = queue.pop();
    if (!file || seen.has(file)) continue;
    seen.add(file);
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(/from "(\.\/[^"]+)"/g)) {
      const spec = match[1] ?? "";
      const next = spec.endsWith(".ts") ? spec : `${spec}.ts`;
      queue.push(join(dirname(file), next));
    }
  }
  return [...seen];
}

describe("client bundle", () => {
  it("keeps the pronunciation dictionary out of the main entry", () => {
    const client = reachable(join(src, "index.ts"));
    const names = client.map((file) => file.slice(src.length + 1));
    assert.equal(names.includes("cmudict-data.ts"), false);
    assert.equal(names.includes("sound.ts"), false);
    assert.equal(names.includes("server.ts"), false);
    const bundled = client.map((file) => readFileSync(file, "utf8")).join("\n");
    assert.equal(bundled.includes("CMUDICT_TEXT"), false);
    assert.equal(bundled.includes("Carnegie Mellon"), false);
    const server = reachable(join(src, "server.ts"));
    assert.equal(server.some((file) => file.endsWith("cmudict-data.ts")), true);
    const pkg = readFileSync(new URL("../package.json", import.meta.url), "utf8");
    assert.match(pkg, /"\.\/server": "\.\/src\/server\.ts"/);
    assert.equal(pkg.includes("cmudict-data"), false);
  });
});
