// electron/data-seeder.js
// Seeds the local MongoDB with categories from the online Pointify API

const fs = require("fs");
const path = require("path");

class DataSeeder {
  constructor() {
    this.config = this.loadConfig();
    this.localMongoUrl = this.config.database.url; // Local MongoDB
    this.sourceMongoUrl = this.config.database.sourceUrl; // Source MongoDB (online)
  }

  loadConfig() {
    try {
      const configPath = path.join(__dirname, "./config.json");
      const configData = fs.readFileSync(configPath, "utf8");
      return JSON.parse(configData);
    } catch (error) {
      console.error(
        "❌ Error loading config.json in DataSeeder:",
        error.message
      );
      throw new Error(
        "Config file is required. Please ensure electron/config.json exists."
      );
    }
  }

  // =================== EXPORT METHODS (Source DB → JSON) ===================

  async exportFromSourceDatabase() {
    console.log("📤 Exporting data from source database to JSON files...");

    if (!this.sourceMongoUrl) {
      throw new Error(
        "Source database URL not configured. Please set database.sourceUrl in config."
      );
    }

    try {
      // Ensure data directory exists
      const dataDir = path.join(__dirname, this.config.paths?.data || "data");
      fs.mkdirSync(dataDir, { recursive: true });

      const { MongoClient } = require("mongodb");
      let sourceClient;

      try {
        sourceClient = new MongoClient(this.sourceMongoUrl);
        await sourceClient.connect();
        console.log("✅ Connected to source database");

        const sourceDb = sourceClient.db();
        const collectionsToExport = this.config.database.seedCollections;

        for (const collectionName of collectionsToExport) {
          await this.exportCollection(sourceDb, collectionName, dataDir);
        }

        console.log("✅ Export completed successfully");
        console.log(`📁 JSON files saved to: ${dataDir}`);
      } finally {
        if (sourceClient) {
          await sourceClient.close();
        }
      }
    } catch (error) {
      console.error("❌ Export failed:", error);
      throw error;
    }
  }

  async exportCollection(sourceDb, collectionName, dataDir) {
    try {
      console.log(`📤 Exporting ${collectionName}...`);

      const collection = sourceDb.collection(collectionName);
      const documents = await collection.find({}).toArray();

      if (documents.length === 0) {
        console.log(`⚠️ No data found in ${collectionName} collection`);
        return;
      }

      // Clean the data for export (remove any local-only fields)
      const cleanedDocuments = documents.map((doc) => {
        // Remove any sync flags or local metadata
        const { sync, importedAt, source, ...cleanDoc } = doc;
        return cleanDoc;
      });

      const filePath = path.join(dataDir, `${collectionName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(cleanedDocuments, null, 2));

      console.log(
        `✅ Exported ${cleanedDocuments.length} documents from ${collectionName}`
      );
      console.log(`📝 Saved to: ${filePath}`);
    } catch (error) {
      console.error(`❌ Failed to export ${collectionName}:`, error);
      // Continue with other collections
    }
  }

  // Method to export via API instead of direct database connection
  async exportFromAPI() {
    console.log("📤 Exporting data from API endpoints to JSON files...");

    try {
      // Ensure data directory exists
      const dataDir = path.join(__dirname, this.config.paths?.data || "data");
      fs.mkdirSync(dataDir, { recursive: true });

      const collectionsToExport = this.config.database.seedCollections;
      const apiBaseUrl = this.config.database.sourceApiUrl;

      if (!apiBaseUrl) {
        throw new Error(
          "Source API URL not configured. Please set database.sourceApiUrl in config."
        );
      }

      for (const collectionName of collectionsToExport) {
        await this.exportCollectionFromAPI(apiBaseUrl, collectionName, dataDir);
      }

      console.log("✅ API export completed successfully");
      console.log(`📁 JSON files saved to: ${dataDir}`);
    } catch (error) {
      console.error("❌ API export failed:", error);
      throw error;
    }
  }

  async exportCollectionFromAPI(apiBaseUrl, collectionName, dataDir) {
    try {
      console.log(`📤 Fetching ${collectionName} from API...`);

      // Construct API endpoint (customize based on your API structure)
      const apiUrl = `${apiBaseUrl}/${collectionName}`;

      const response = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${this.config.database.sourceApiToken || ""}`,
          "Content-Type": "application/json",
        },
        timeout: this.config.network?.timeout || 30000,
      });

      if (!response.ok) {
        throw new Error(
          `API request failed: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      // Handle different API response formats
      const documents = Array.isArray(data)
        ? data
        : data.data || data.results || [data];

      if (documents.length === 0) {
        console.log(`⚠️ No data returned from API for ${collectionName}`);
        return;
      }

      const filePath = path.join(dataDir, `${collectionName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(documents, null, 2));

      console.log(
        `✅ Exported ${documents.length} documents from ${collectionName}`
      );
      console.log(`📝 Saved to: ${filePath}`);
    } catch (error) {
      console.error(`❌ Failed to export ${collectionName} from API:`, error);
      // Continue with other collections
    }
  }

  // =================== IMPORT METHODS (JSON → Local DB) ===================

  async seedAllData() {
    console.log("🌱 Seeding local MongoDB with exported data...");

    try {
      // Wait for MongoDB to be fully ready
      await this.waitForMongoDB();

      // Check if this is a fresh installation
      const isEmpty = await this.isDatabaseEmpty();
      if (!isEmpty) {
        console.log(
          "✅ Database already has data, skipping seed (user data preserved)"
        );
        return;
      }

      // Seed each collection from the JSON files
      const collectionsToSeed = this.config.database.seedCollections;
      for (const collectionName of collectionsToSeed) {
        await this.seedCollection(collectionName);
      }

      // Set up initial admin user or default settings if needed
      await this.setupInitialConfiguration();

      console.log("✅ Local MongoDB seeding completed successfully");
      console.log("🎯 Ready for Pointify API to connect");
    } catch (error) {
      console.error("❌ Data seeding failed:", error);
      throw error;
    }
  }

  async waitForMongoDB() {
    const { MongoClient } = require("mongodb");
    const maxRetries = this.config.database.seedingMaxRetries;
    const retryDelay = this.config.database.seedingRetryDelay;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const client = new MongoClient(this.localMongoUrl);
        await client.connect();
        await client.db().admin().ping();
        await client.close();
        console.log("✅ Local MongoDB connection verified");
        return;
      } catch (error) {
        console.log(
          `⏳ Waiting for local MongoDB... (attempt ${i + 1}/${maxRetries})`
        );
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
    throw new Error("Local MongoDB not available after multiple attempts");
  }

  // Replace the isDatabaseEmpty method in your DataSeeder class

  async isDatabaseEmpty() {
    const { MongoClient } = require("mongodb");

    let client;
    try {
      client = new MongoClient(this.localMongoUrl);
      await client.connect();

      const db = client.db();

      // Only check OUR specific collections, not system collections
      const collectionsToCheck = this.config.database.seedCollections;

      for (const collectionName of collectionsToCheck) {
        try {
          const collection = db.collection(collectionName);
          const count = await collection.countDocuments();

          console.log(
            `🔍 Collection '${collectionName}' has ${count} documents`
          );

          if (count > 0) {
            console.log(
              `📊 Found data in ${collectionName}, database is not empty`
            );
            return false; // Has data
          }
        } catch (error) {
          // Collection doesn't exist, that's fine for our purposes
          console.log(`ℹ️ Collection ${collectionName} doesn't exist yet`);
        }
      }

      console.log(
        "🆕 All seed collections are empty or don't exist, database is empty"
      );
      return true; // Empty database (for our purposes)
    } catch (error) {
      console.error("❌ Failed to check database status:", error);
      return false; // Assume not empty to be safe
    } finally {
      if (client) {
        await client.close();
      }
    }
  }

  async seedCollection(collectionName) {
    const { MongoClient } = require("mongodb");

    console.log(`🌱 Seeding ${collectionName} collection...`);

    let client;
    try {
      // Load data from JSON files
      const data = await this.loadDataFile(collectionName);

      if (!data || data.length === 0) {
        console.log(`⚠️ No ${collectionName} data found in JSON files`);
        return;
      }

      // Connect to local MongoDB
      client = new MongoClient(this.localMongoUrl);
      await client.connect();

      const db = client.db();
      const collection = db.collection(collectionName);

      // Clean and prepare data for import
      const cleanData = data.map((item) => {
        // Keep the exact _id as is and add sync flag
        return {
          ...item,
          sync: true,
          importedAt: new Date(),
          sourceDatabase: this.config.database.dataSource,
        };
      });

      // Import the data
      console.log(
        `📥 Importing ${cleanData.length} ${collectionName} to local MongoDB...`
      );
      const result = await collection.insertMany(cleanData);

      console.log(
        `✅ Successfully imported ${result.insertedCount} ${collectionName}`
      );

      // Log some sample items for verification
      if (result.insertedCount > 0) {
        const sampleCount = this.config.database.sampleCount;
        const samples = await collection.find({}).limit(sampleCount).toArray();
        const sampleNames = samples.map(
          (item) =>
            item.name ||
            item.title ||
            item.key ||
            item._id?.toString() ||
            "unnamed"
        );
        console.log(`📋 Sample ${collectionName}:`, sampleNames);
      }
    } catch (error) {
      console.error(`❌ Failed to seed ${collectionName}:`, error);
      // Continue with other collections instead of failing completely
    } finally {
      if (client) {
        await client.close();
      }
    }
  }

  async loadDataFile(collectionName) {
    try {
      // Get data paths from config
      const dataPaths = this.config.database.dataPaths;

      // Build possible paths based on config
      const possiblePaths = [];

      // Packaged app paths
      dataPaths.packaged.forEach((relativePath) => {
        possiblePaths.push(
          path.join(
            process.resourcesPath,
            relativePath,
            `${collectionName}.json`
          )
        );
      });

      // Development paths
      dataPaths.development.forEach((relativePath) => {
        possiblePaths.push(
          path.join(__dirname, relativePath, `${collectionName}.json`)
        );
      });

      let dataPath = null;

      for (const possiblePath of possiblePaths) {
        if (fs.existsSync(possiblePath)) {
          dataPath = possiblePath;
          break;
        }
      }

      if (!dataPath) {
        console.log(`⚠️ ${collectionName}.json not found. Checked paths:`);
        possiblePaths.forEach((p) => console.log(`  - ${p}`));
        return null;
      }

      console.log(`📁 Loading ${collectionName} from: ${dataPath}`);

      const rawData = fs.readFileSync(dataPath, "utf8");
      const data = JSON.parse(rawData);

      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error(`❌ Failed to load ${collectionName} data:`, error);
      return null;
    }
  }

  // =================== UTILITY METHODS ===================

  async setupInitialConfiguration() {
    const { MongoClient } = require("mongodb");

    console.log("⚙️ Setting up initial configuration...");

    let client;
    try {
      client = new MongoClient(this.localMongoUrl);
      await client.connect();

      const db = client.db();

      // Create indexes for better performance
      await this.createIndexes(db);

      // Set up any additional configuration
      await this.setupSystemSettings(db);

      console.log("✅ Initial configuration completed");
    } catch (error) {
      console.error("⚠️ Failed to setup initial configuration:", error);
      // Don't fail the entire process for this
    } finally {
      if (client) {
        await client.close();
      }
    }
  }

  async createIndexes(db) {
    try {
      // Get index configuration from config file
      const indexConfig = this.config.database.indexes;

      for (const { name, indexes } of indexConfig) {
        const collection = db.collection(name);

        for (const index of indexes) {
          try {
            await collection.createIndex(index);
          } catch (error) {
            // Index might already exist, that's ok
          }
        }
      }

      console.log("✅ Database indexes created");
    } catch (error) {
      console.error("⚠️ Failed to create indexes:", error);
    }
  }

  async setupSystemSettings(db) {
    try {
      const systemCollection = db.collection(
        this.config.database.systemCollection
      );

      // Record the installation/seeding info
      const systemInfo = {
        installedAt: new Date(),
        version: this.config.app.version,
        dataSource: this.config.database.dataSource,
        sourceDatabase: this.sourceMongoUrl || "unknown",
        isInitialSetup: true,
        exportedAt: this.getExportTimestamp(),
      };

      await systemCollection.insertOne(systemInfo);
      console.log("✅ System settings recorded");
    } catch (error) {
      console.error("⚠️ Failed to setup system settings:", error);
    }
  }

  getExportTimestamp() {
    try {
      const dataDir = path.join(__dirname, this.config.paths?.data || "data");
      const collections = this.config.database.seedCollections;

      let latestTimestamp = null;

      for (const collection of collections) {
        const filePath = path.join(dataDir, `${collection}.json`);
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          if (!latestTimestamp || stats.mtime > latestTimestamp) {
            latestTimestamp = stats.mtime;
          }
        }
      }

      return latestTimestamp;
    } catch (error) {
      return null;
    }
  }

  // Utility method to check what data is available
  async listAvailableData() {
    const collections = this.config.database.seedCollections;
    const available = [];

    for (const collection of collections) {
      const data = await this.loadDataFile(collection);
      if (data && data.length > 0) {
        available.push({ collection, count: data.length });
      }
    }

    return available;
  }

  // Get export/import statistics
  async getDataStatistics() {
    const stats = {
      jsonFiles: [],
      databaseCollections: [],
      lastExport: this.getExportTimestamp(),
    };

    // Check JSON files
    const dataDir = path.join(__dirname, this.config.paths?.data || "data");
    const collections = this.config.database.seedCollections;

    for (const collection of collections) {
      const filePath = path.join(dataDir, `${collection}.json`);
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
        stats.jsonFiles.push({
          collection,
          count: Array.isArray(data) ? data.length : 0,
          size: fs.statSync(filePath).size,
          lastModified: fs.statSync(filePath).mtime,
        });
      }
    }

    // Check database collections
    try {
      const { MongoClient } = require("mongodb");
      const client = new MongoClient(this.localMongoUrl);
      await client.connect();

      const db = client.db();
      for (const collection of collections) {
        const count = await db.collection(collection).countDocuments();
        const syncCount = await db
          .collection(collection)
          .countDocuments({ sync: true });

        stats.databaseCollections.push({
          collection,
          count,
          syncCount,
          hasData: count > 0,
        });
      }

      await client.close();
    } catch (error) {
      console.error("❌ Failed to get database statistics:", error);
    }

    return stats;
  }
}

module.exports = { DataSeeder };
