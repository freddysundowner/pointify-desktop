// electron/modules/seeding-manager.js
// Handles data seeding coordination and verification

const fs = require("fs");
const path = require("path");
const { DataSeeder } = require("../data-seeder.js");

class SeedingManager {
  constructor() {
    this.config = this.loadConfig();
    this.seeder = new DataSeeder();
  }

  loadConfig() {
    try {
      const configPath = path.join(__dirname, "../config.json");
      const configData = fs.readFileSync(configPath, "utf8");
      return JSON.parse(configData);
    } catch (error) {
      console.error(
        "❌ Error loading config.json in SeedingManager:",
        error.message
      );
      throw new Error(
        "Config file is required. Please ensure electron/config.json exists."
      );
    }
  }

  // =================== EXPORT METHODS (Build Time) ===================

  async exportDataFromSource() {
    console.log("📤 Starting data export from source database...");

    try {
      // Try database export first, fallback to API
      if (this.config.database.sourceUrl) {
        console.log("🗄️ Using direct database connection for export");
        await this.seeder.exportFromSourceDatabase();
      } else if (this.config.database.sourceApiUrl) {
        console.log("🌐 Using API endpoints for export");
        await this.seeder.exportFromAPI();
      } else {
        throw new Error(
          "No source database URL or API URL configured for export"
        );
      }

      // Get export statistics
      const stats = await this.seeder.getDataStatistics();
      console.log("📊 Export Summary:");
      stats.jsonFiles.forEach((file) => {
        console.log(
          `  ✅ ${file.collection}: ${file.count} items (${(
            file.size / 1024
          ).toFixed(1)}KB)`
        );
      });

      console.log("✅ Data export completed successfully");
      return true;
    } catch (error) {
      console.error("❌ Data export failed:", error);
      throw error;
    }
  }

  async exportSpecificCollections(collections) {
    console.log(`📤 Exporting specific collections: ${collections.join(", ")}`);

    try {
      // Temporarily update config to only export specific collections
      const originalCollections = this.config.database.seedCollections;
      this.config.database.seedCollections = collections;

      await this.exportDataFromSource();

      // Restore original collections
      this.config.database.seedCollections = originalCollections;

      console.log("✅ Specific collections export completed");
      return true;
    } catch (error) {
      console.error("❌ Specific collections export failed:", error);
      throw error;
    }
  }

  // =================== IMPORT METHODS (Runtime) ===================

  async seedPointifyData() {
    console.log("🌱 Seeding Pointify data into local MongoDB...");

    try {
      // Give MongoDB extra time to be fully ready for operations
      console.log("⏳ Ensuring MongoDB is ready for data operations...");
      const readyDelay =
        this.config.database.seedingReadyDelay ||
        this.config.database.readyDelay;
      await new Promise((resolve) => setTimeout(resolve, readyDelay));

      // Check what data is available to seed
      const availableData = await this.seeder.listAvailableData();
      if (availableData.length > 0) {
        console.log("📊 Available Pointify data to seed:");
        availableData.forEach(({ collection, count }) => {
          console.log(`  - ${collection}: ${count} items`);
        });

        // Seed all the data (will only seed if collections don't exist)
        await this.seeder.seedAllData();

        // Verify seeding was successful
        console.log("🔍 Verifying seeded data...");
        const verification = await this.verifySeededData();
        if (verification.success) {
          console.log("✅ Data seeding verification passed");
          console.log(`📈 Total items in local DB: ${verification.totalItems}`);
        }

        // Show data statistics
        await this.showDataStatistics();
      } else {
        console.log("📊 No Pointify data bundle found");
        console.log("💡 This is normal for development builds");
        console.log(
          "💡 For production builds, run export first: npm run export-data"
        );
      }

      console.log("✅ Data seeding process completed");
    } catch (error) {
      // Don't fail the entire startup if seeding fails
      console.error(
        "⚠️ Data seeding failed, but continuing startup:",
        error.message
      );
      console.error("💡 The Pointify API will start with an empty database");
      console.error("💡 You can manually add categories through the dashboard");
    }
  }

  async verifySeededData() {
    const { MongoClient } = require("mongodb");

    let client;
    try {
      client = new MongoClient(this.config.database.url);
      await client.connect();

      const db = client.db();
      const collections = this.config.database.seedCollections;
      let totalItems = 0;

      for (const collectionName of collections) {
        const collection = db.collection(collectionName);
        const count = await collection.countDocuments();
        const syncCount = await collection.countDocuments({ sync: true });
        totalItems += count;

        if (count > 0) {
          console.log(
            `✅ ${collectionName}: ${count} items (${syncCount} synced)`
          );
        }
      }

      return { success: true, totalItems };
    } catch (error) {
      console.error("❌ Failed to verify seeded data:", error);
      return { success: false, totalItems: 0 };
    } finally {
      if (client) {
        await client.close();
      }
    }
  }

  // =================== STATUS AND MONITORING ===================

  async showDataStatistics() {
    try {
      const stats = await this.seeder.getDataStatistics();

      console.log("📊 Data Statistics:");

      if (stats.lastExport) {
        console.log(`📅 Last export: ${stats.lastExport.toLocaleString()}`);
      }

      console.log("📁 JSON Files:");
      stats.jsonFiles.forEach((file) => {
        console.log(
          `  ${file.collection}: ${file.count} items (${(
            file.size / 1024
          ).toFixed(1)}KB)`
        );
      });

      console.log("🗄️ Database Collections:");
      stats.databaseCollections.forEach((col) => {
        const status = col.hasData ? "✅" : "❌";
        console.log(
          `  ${status} ${col.collection}: ${col.count} items (${col.syncCount} synced)`
        );
      });
    } catch (error) {
      console.error("❌ Failed to show data statistics:", error);
    }
  }

  async getDatabaseStatus() {
    const { MongoClient } = require("mongodb");

    let client;
    try {
      client = new MongoClient(this.config.database.url);
      await client.connect();

      const db = client.db();
      const collections = this.config.database.seedCollections;
      const status = {
        connected: true,
        collections: {},
        totalDocuments: 0,
        lastChecked: new Date(),
      };

      for (const collectionName of collections) {
        const collection = db.collection(collectionName);
        const count = await collection.countDocuments();
        const hasSync = await collection.countDocuments({ sync: true });

        status.collections[collectionName] = {
          count: count,
          syncedCount: hasSync,
          isEmpty: count === 0,
        };
        status.totalDocuments += count;
      }

      return status;
    } catch (error) {
      console.error("❌ Failed to get database status:", error);
      return {
        connected: false,
        error: error.message,
        lastChecked: new Date(),
      };
    } finally {
      if (client) {
        await client.close();
      }
    }
  }

  async needsSeeding() {
    const { MongoClient } = require("mongodb");

    let client;
    try {
      client = new MongoClient(this.config.database.url);
      await client.connect();

      const db = client.db();
      const collections = this.config.database.seedCollections;

      for (const collectionName of collections) {
        const collection = db.collection(collectionName);
        const count = await collection.countDocuments();

        if (count === 0) {
          return true; // At least one collection is empty
        }
      }

      return false; // All collections have data
    } catch (error) {
      console.error("❌ Failed to check seeding status:", error);
      return true; // Assume needs seeding if we can't check
    } finally {
      if (client) {
        await client.close();
      }
    }
  }

  async needsCollectionSeeding(collectionName) {
    const { MongoClient } = require("mongodb");

    let client;
    try {
      client = new MongoClient(this.config.database.url);
      await client.connect();

      const db = client.db();
      const collection = db.collection(collectionName);
      const count = await collection.countDocuments();

      return count === 0;
    } catch (error) {
      console.error(
        `❌ Failed to check ${collectionName} seeding status:`,
        error
      );
      return true; // Assume needs seeding if we can't check
    } finally {
      if (client) {
        await client.close();
      }
    }
  }

  // =================== MAINTENANCE OPERATIONS ===================

  async reseedCollection(collectionName) {
    try {
      console.log(`🔄 Reseeding ${collectionName} collection...`);

      // First, clear the existing collection
      const { MongoClient } = require("mongodb");
      let client;

      try {
        client = new MongoClient(this.config.database.url);
        await client.connect();

        const db = client.db();
        const collection = db.collection(collectionName);
        await collection.deleteMany({});

        console.log(`🗑️ Cleared existing ${collectionName} data`);
      } finally {
        if (client) {
          await client.close();
        }
      }

      // Now reseed the collection
      await this.seeder.seedCollection(collectionName);

      console.log(`✅ Successfully reseeded ${collectionName}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to reseed ${collectionName}:`, error);
      return false;
    }
  }

  async reseedAllCollections() {
    try {
      console.log("🔄 Reseeding all collections...");

      const collections = this.config.database.seedCollections;

      for (const collectionName of collections) {
        await this.reseedCollection(collectionName);
      }

      console.log("✅ Successfully reseeded all collections");
      return true;
    } catch (error) {
      console.error("❌ Failed to reseed all collections:", error);
      return false;
    }
  }

  // =================== CONFIGURATION ===================

  getSeedingConfig() {
    return {
      collections: this.config.database.seedCollections,
      dataSource: this.config.database.dataSource,
      sourceUrl: this.config.database.sourceUrl,
      sourceApiUrl: this.config.database.sourceApiUrl,
      readyDelay:
        this.config.database.seedingReadyDelay ||
        this.config.database.readyDelay,
      maxRetries: this.config.database.seedingMaxRetries,
      retryDelay: this.config.database.seedingRetryDelay,
    };
  }

  // Check if export is properly configured
  canExport() {
    return !!(
      this.config.database.sourceUrl || this.config.database.sourceApiUrl
    );
  }

  // Check if import is properly configured
  canImport() {
    return !!(
      this.config.database.url &&
      this.config.database.seedCollections?.length > 0
    );
  }

  // Get export/import capabilities summary
  getCapabilities() {
    return {
      canExport: this.canExport(),
      canImport: this.canImport(),
      exportMethod: this.config.database.sourceUrl
        ? "database"
        : this.config.database.sourceApiUrl
        ? "api"
        : "none",
      collections: this.config.database.seedCollections || [],
      sourceUrl: this.config.database.sourceUrl || null,
      sourceApiUrl: this.config.database.sourceApiUrl || null,
    };
  }
}

module.exports = { SeedingManager };
