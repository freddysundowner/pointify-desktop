// scripts/export-from-pointify-api.js
// Script to export data from source database/API to JSON files for bundling

const { SeedingManager } = require("../electron/modules/seeding-manager.js");

async function exportData() {
  console.log("🚀 Starting Pointify data export process...");
  console.log("=".repeat(60));

  try {
    const seedingManager = new SeedingManager();

    // Show current configuration
    const capabilities = seedingManager.getCapabilities();
    console.log("📋 Export Configuration:");
    console.log(`   Method: ${capabilities.exportMethod}`);
    console.log(
      `   Source: ${
        capabilities.sourceUrl || capabilities.sourceApiUrl || "Not configured"
      }`
    );
    console.log(`   Collections: ${capabilities.collections.join(", ")}`);
    console.log("");

    // Check if export is possible
    if (!capabilities.canExport) {
      throw new Error(
        "Export not configured. Please set database.sourceUrl or database.sourceApiUrl in config.json"
      );
    }

    // Perform the export
    console.log("📤 Starting export...");
    await seedingManager.exportDataFromSource();

    // Show final statistics
    console.log("");
    console.log("📊 Final Statistics:");
    await seedingManager.showDataStatistics();

    console.log("");
    console.log("=".repeat(60));
    console.log("✅ Export completed successfully!");
    console.log("💡 JSON files are ready to be bundled with the app");
    console.log("💡 Run 'npm run build:production' to create the installer");
  } catch (error) {
    console.error("");
    console.error("=".repeat(60));
    console.error("❌ Export failed:", error.message);
    console.error("");

    if (error.message.includes("ECONNREFUSED")) {
      console.error("💡 Possible solutions:");
      console.error("   - Check if the source database is running");
      console.error("   - Verify the database URL in config.json");
      console.error("   - Check network connectivity");
    } else if (error.message.includes("authentication")) {
      console.error("💡 Possible solutions:");
      console.error("   - Check database credentials");
      console.error("   - Verify API token is valid");
      console.error("   - Check authentication settings");
    } else if (error.message.includes("not configured")) {
      console.error("💡 Required configuration:");
      console.error("   - Set database.sourceUrl for direct database access");
      console.error("   - Or set database.sourceApiUrl for API-based export");
      console.error(
        "   - Configure database.seedCollections with collections to export"
      );
    }

    console.error("");
    process.exit(1);
  }
}

// Run the export if this script is executed directly
if (require.main === module) {
  exportData();
}

module.exports = { exportData };
