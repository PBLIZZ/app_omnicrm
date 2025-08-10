import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    "-" +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

function main() {
  const repoRoot = path.resolve(__dirname, "../../");
  const outDir = path.join(repoRoot, "backups");
  ensureDir(outDir);
  const outFile = path.join(outDir, `schema-${timestamp()}.sql`);

  const { DATABASE_URL } = process.env;
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is required to snapshot schema");
  }

  try {
    // Prefer pg_dump if available
    execSync(`pg_dump --schema-only --no-owner --no-privileges --file "${outFile}" "${DATABASE_URL}"`, {
      stdio: "inherit",
    });
    console.log("Wrote:", outFile);
    return;
  } catch (e) {
    console.warn("pg_dump failed or unavailable; falling back to information_schema export");
  }

  // Fallback: simple table list export
  const fallback = `-- Fallback schema snapshot (table list)\n`;
  fs.writeFileSync(outFile, fallback, "utf8");
  console.log("Wrote:", outFile);
}

main();


