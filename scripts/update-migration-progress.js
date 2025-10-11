#!/usr/bin/env node

/**
 * API Migration Progress Updater
 *
 * Usage: node scripts/update-migration-progress.js [developer] [completed-routes]
 * Example: node scripts/update-migration-progress.js "Dev 1" 5
 */

const fs = require("fs");
const path = require("path");
const _ = require("lodash");

const PROGRESS_FILE = path.join(__dirname, "../docs/api-migration-progress.md");

// Route assignments for each developer
const ASSIGNMENTS = {
  "Dev 1": { total: 12, area: "Core Contacts & Client Management" },
  "Dev 2": { total: 11, area: "Gmail & Email Integration" },
  "Dev 3": { total: 10, area: "Google Calendar Integration" },
  "Dev 4": { total: 10, area: "OmniMomentum Task Management" },
  "Dev 5": { total: 9, area: "Job Processing & Background Tasks" },
  "Dev 6": { total: 8, area: "Inbox & Search" },
  "Dev 7": { total: 11, area: "User Management & Admin" },
  "Dev 8": { total: 12, area: "Error Handling & Utils" },
};

const TOTAL_ROUTES = Object.values(ASSIGNMENTS).reduce((sum, dev) => sum + dev.total, 0);

function updateProgress(developer, completedRoutes) {
  try {
    // Read current progress file
    let content = fs.readFileSync(PROGRESS_FILE, "utf8");

    // Calculate new totals
    const currentTotal = getCurrentTotal(content);
    const newTotal = currentTotal + parseInt(completedRoutes);
    const percentage = Math.round((newTotal / TOTAL_ROUTES) * 100);

    // Update overall progress
    const progressBar = generateProgressBar(percentage);
    content = content.replace(
      /Progress: \[.*?\] \d+\/\d+ \(\d+%\)/,
      `Progress: [${progressBar}] ${newTotal}/${TOTAL_ROUTES} (${percentage}%)`,
    );

    content = content.replace(/Completed: \d+/, `Completed: ${newTotal}`);
    content = content.replace(/Not Started: \d+/, `Not Started: ${TOTAL_ROUTES - newTotal}`);

    // Update leaderboard
    content = updateLeaderboard(content, developer, completedRoutes);

    // Add daily update
    content = addDailyUpdate(content, developer, completedRoutes);

    // Update last modified
    const timestamp = new Date().toISOString().split("T")[0];
    content = content.replace(/\*\*Last Updated\*\*: .*/, `**Last Updated**: ${timestamp}`);
    content = content.replace(/\*\*Updated By\*\*: .*/, `**Updated By**: Migration Script`);

    // Write back to file
    fs.writeFileSync(PROGRESS_FILE, content);

    console.log(`✅ Updated progress for ${developer}: +${completedRoutes} routes`);
    console.log(`📊 Overall progress: ${newTotal}/${TOTAL_ROUTES} (${percentage}%)`);
  } catch (error) {
    console.error("❌ Error updating progress:", error.message);
    process.exit(1);
  }
}

function getCurrentTotal(content) {
  const match = content.match(/Completed: (\d+)/);
  return match ? parseInt(match[1]) : 0;
}

function generateProgressBar(percentage) {
  const totalBars = 50;
  const filledBars = Math.round((percentage / 100) * totalBars);
  const emptyBars = totalBars - filledBars;
  return "█".repeat(filledBars) + "░".repeat(emptyBars);
}

function updateLeaderboard(content, developer, completedRoutes) {
  const assignment = ASSIGNMENTS[developer];
  if (!assignment) {
    console.warn(`⚠️  Unknown developer: ${developer}`);
    return content;
  }

  // Find and update the specific developer row, capturing existing completed count
  const safeDeveloper = _.escapeRegExp(developer);
  const devPattern = new RegExp(
    `(\\| \\d+ \\| ${safeDeveloper} \\| )(\\d+)/(\\d+)( \\| )\\d+%( \\| )[🟢🟡🔴]( \\|)`,
  );
  const match = content.match(devPattern);

  if (match) {
    const existingCompleted = parseInt(match[2]);
    const total = parseInt(match[3]);
    const increment = Number(completedRoutes);
    if (isNaN(increment)) {
      console.warn(`⚠️  Invalid completed routes value: ${completedRoutes}, defaulting to 0`);
      return content;
    }
    const newCompleted = existingCompleted + increment;
    const newPercentage = Math.round((newCompleted / total) * 100);
    const status = newPercentage === 100 ? "🟢" : newPercentage > 0 ? "🟡" : "🔴";

    content = content.replace(devPattern, `$1${newCompleted}/$3$4${newPercentage}%$5${status}$6`);
  }

  return content;
}

function addDailyUpdate(content, developer, completedRoutes) {
  const today = new Date().toISOString().split("T")[0];
  const updateSection = `### **${today}**
- **Completed Today**: ${completedRoutes} routes by ${developer}
- **Issues Found**: None reported
- **Blockers**: None
- **Notes**: Progress updated via automation script

---`;

  // Look for "## Daily Updates" header and insert after it
  const dailyUpdatesPattern = /(## Daily Updates\s*\n)/;
  const match = content.match(dailyUpdatesPattern);

  if (match) {
    // Insert the new update right after the header
    const insertIndex = match.index + match[0].length;
    content = content.slice(0, insertIndex) + updateSection + content.slice(insertIndex);
  } else {
    // If no Daily Updates section exists, create it
    const newSection = `## Daily Updates

${updateSection}`;
    content += `\n\n${newSection}`;
  }

  return content;
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length !== 2) {
    console.log("Usage: node scripts/update-migration-progress.js [developer] [completed-routes]");
    console.log('Example: node scripts/update-migration-progress.js "Dev 1" 5');
    console.log("\nAvailable developers:");
    Object.keys(ASSIGNMENTS).forEach((dev) => {
      console.log(`  - "${dev}" (${ASSIGNMENTS[dev].total} routes total)`);
    });
    process.exit(1);
  }

  const [developer, completedRoutes] = args;

  if (!ASSIGNMENTS[developer]) {
    console.error(`❌ Unknown developer: ${developer}`);
    console.log("Available developers:", Object.keys(ASSIGNMENTS).join(", "));
    process.exit(1);
  }

  if (isNaN(completedRoutes) || parseInt(completedRoutes) <= 0) {
    console.error("❌ Completed routes must be a positive number");
    process.exit(1);
  }

  updateProgress(developer, completedRoutes);
}

module.exports = { updateProgress, ASSIGNMENTS, TOTAL_ROUTES };
