import { loadEnvConfig } from "@next/env";
import fs from "node:fs/promises";
import path from "node:path";

loadEnvConfig(process.cwd());

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error("Usage: npm run import:takeout -- <path-to-takeout.zip>");
    process.exit(1);
  }

  const [{ default: JSZip }, { getOrCreateDevUser }, { importFitbitTakeout, importGoogleFitTakeout }] =
    await Promise.all([
      import("jszip"),
      import("../src/lib/session"),
      import("../src/lib/import/takeout"),
    ]);

  const abs = path.resolve(arg);
  console.log(`Loading ${abs} (${humanSize((await fs.stat(abs)).size)})...`);
  const buf = await fs.readFile(abs);

  console.log("Unzipping...");
  const zip = await JSZip.loadAsync(buf);

  const hasFitbit = Object.keys(zip.files).some((p) => p.includes("Fitbit/"));
  const hasFit = Object.keys(zip.files).some((p) => p.includes("Fit/Daily"));

  if (!hasFitbit && !hasFit) {
    console.error("Zip contains neither Fitbit/ nor Fit/Daily/ entries.");
    console.error(
      `Top-level paths: ${Array.from(
        new Set(Object.keys(zip.files).map((p) => p.split("/")[0])),
      ).join(", ")}`,
    );
    process.exit(1);
  }

  const user = await getOrCreateDevUser();

  if (hasFitbit) {
    console.log("Importing Fitbit data...");
    const r = await importFitbitTakeout(zip, user.id);
    console.log(JSON.stringify(r, null, 2));
  }
  if (hasFit) {
    console.log("Importing Google Fit data...");
    const r = await importGoogleFitTakeout(zip, user.id);
    console.log(JSON.stringify(r, null, 2));
  }

  console.log("Done.");
  process.exit(0);
}

function humanSize(n: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(1)} ${units[i]}`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
