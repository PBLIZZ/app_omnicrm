/**
 * Type Forensics: Run Full Audit
 *
 * Orchestrates all forensic scripts in sequence
 */

import { spawn } from "child_process";
import * as path from "path";

function runScript(scriptName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve(__dirname, scriptName);

    console.log(`\n${"=".repeat(60)}`);
    console.log(`▶️  Running: ${scriptName}`);
    console.log("=".repeat(60) + "\n");

    const child = spawn("pnpm", ["tsx", scriptPath], {
      stdio: "inherit",
      cwd: process.cwd(),
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Script ${scriptName} exited with code ${code}`));
      } else {
        resolve();
      }
    });

    child.on("error", (error) => {
      reject(error);
    });
  });
}

async function runFullAudit() {
  const scripts = [
    "collect-all-types.ts",
    "trace-usage.ts",
    "detect-duplicates.ts",
    "classify-origins.ts",
    "generate-report.ts",
  ];

  console.log("\n");
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║                                                          ║");
  console.log("║        🔬 TYPE FORENSICS: FULL AUDIT SUITE              ║");
  console.log("║                                                          ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log("\n");

  const startTime = Date.now();

  try {
    for (const script of scripts) {
      await runScript(script);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log("\n");
    console.log("╔══════════════════════════════════════════════════════════╗");
    console.log("║                                                          ║");
    console.log("║        ✅  AUDIT COMPLETE!                               ║");
    console.log("║                                                          ║");
    console.log("╚══════════════════════════════════════════════════════════╝");
    console.log("\n");
    console.log(`⏱️  Total time: ${duration} seconds\n`);
    console.log("📊 Generated files:");
    console.log("   ✓ docs/type-audit/types-inventory.json");
    console.log("   ✓ docs/type-audit/types-usage.json");
    console.log("   ✓ docs/type-audit/types-duplicates.json");
    console.log("   ✓ docs/type-audit/types-origins.json");
    console.log("   ✓ docs/type-audit/TYPE-AUDIT-REPORT.md\n");
    console.log("🎯 Next step:");
    console.log("   Open docs/type-audit/TYPE-AUDIT-REPORT.md to review findings\n");
  } catch (error) {
    console.error("\n❌ Audit failed:", error);
    process.exit(1);
  }
}

runFullAudit();