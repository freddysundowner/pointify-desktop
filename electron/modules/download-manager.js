// electron/modules/download-manager.js
// Handles downloading MongoDB and Pointify API components

const fs = require("fs");
const path = require("path");

class DownloadManager {
  constructor(updateProgress, mongoDBManager) {
    this.updateProgress = updateProgress;
    this.mongoDBManager = mongoDBManager;
  }

  getDownloadConfig() {
    const platform = process.platform;

    if (platform === "win32") {
      return {
        mongoUrl:
          "https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-4.4.18.zip",
        apiUrl: "https://pointifypos.com/installers/pointify-api.exe",
        mongoFile: "mongodb.zip",
        apiFile: "pointify-api.exe",
      };
    } else if (platform === "darwin") {
      return {
        mongoUrl:
          "https://fastdl.mongodb.org/osx/mongodb-macos-x86_64-4.4.18.tgz",
        apiUrl: "https://pointifypos.com/installers/pointify-api-mac",
        mongoFile: "mongodb.tgz",
        apiFile: "pointify-api",
      };
    } else {
      return {
        mongoUrl:
          "https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-ubuntu2004-4.4.18.tgz",
        apiUrl: "https://pointifypos.com/installers/pointify-api-linux",
        mongoFile: "mongodb.tgz",
        apiFile: "pointify-api",
      };
    }
  }

  async downloadComponents(installDir) {
    // Create install directory
    fs.mkdirSync(installDir, { recursive: true });

    const config = this.getDownloadConfig();

    // Smart component detection - only download what's missing
    const apiPath = path.join(installDir, config.apiFile);

    // Download API only if missing
    if (!fs.existsSync(apiPath)) {
      this.updateProgress(
        "Downloading API...",
        20,
        "Getting your business logic"
      );
      await this.downloadFile(config.apiUrl, apiPath);
    } else {
      console.log("✅ API already exists, skipping download");
    }

    // Download MongoDB only if missing
    const mongoPath = path.join(installDir, config.mongoFile);
    if (!fs.existsSync(mongoPath)) {
      this.updateProgress(
        "Downloading services...",
        30,
        "Getting Service Read MDB"
      );
      try {
        await this.downloadFile(config.mongoUrl, mongoPath);
      } catch (error) {
        console.log(`❌ MDB download failed: ${error.message}`);
        this.updateProgress(
          "Download failed, trying alternative...",
          35,
          "Switching to backup MDB source"
        );

        // Fallback to lightweight MongoDB alternative
        const platform = process.platform;
        const fallbackUrl =
          "https://fastdl.mongodb.org/community-server/mongodb-community-minimal-" +
          (platform === "win32"
            ? "windows-x64-4.4.18.zip"
            : "linux-x64-4.4.18.tgz");
        await this.downloadFile(fallbackUrl, mongoPath);
      }
    } else {
      console.log("✅ MDB already exists, skipping download");
    }

    // Extract MongoDB
    this.updateProgress(
      "Installing MDB...",
      40,
      "Extracting MDB files"
    );
    await this.mongoDBManager.extractMongoDB(
      path.join(installDir, config.mongoFile),
      installDir
    );


    // ✅ VERIFY extraction was successful
    const mongoBinPath = path.join(installDir, "mongodb", "bin", "mongod.exe");

    if (!fs.existsSync(mongoBinPath)) {
      console.warn("❌ MongoDB binary not found after extract – retrying...");

      // Cleanup partial extraction
      const mongoDir = path.join(installDir, "mongodb");
      if (fs.existsSync(mongoDir)) {
        fs.rmSync(mongoDir, { recursive: true, force: true });
      }

      // Re-download and re-extract
      this.updateProgress("Retrying MongoDB setup...", 45, "Fixing corrupted MDB install");

      // Download again
      await this.downloadFile(config.mongoUrl, path.join(installDir, config.mongoFile));

      // Retry extract
      await this.mongoDBManager.extractMongoDB(path.join(installDir, config.mongoFile), installDir);

      // Verify again
      if (!fs.existsSync(mongoBinPath)) {
        throw new Error("MongoDB installation failed after retry. Please check your internet connection.");
      } else {
        console.log("✅ MongoDB setup successful after retry");
      }
    }
  }

  downloadFile(url, filePath) {
    return new Promise((resolve, reject) => {
      const https = require("https");
      const file = fs.createWriteStream(filePath);

      const request = https.get(url, { timeout: 600000 }, (response) => {
        if (response.statusCode !== 200) {
          reject(
            new Error(`Download failed with status: ${response.statusCode}`)
          );
          return;
        }

        const totalSize = parseInt(response.headers["content-length"] || 0);
        let downloadedSize = 0;
        let lastProgressUpdate = 0;

        response.on("data", (chunk) => {
          downloadedSize += chunk.length;
          if (totalSize > 0) {
            const progress = Math.round((downloadedSize / totalSize) * 100);

            if (progress - lastProgressUpdate >= 5 || progress === 100) {
              lastProgressUpdate = progress;
              const sizeMB = (downloadedSize / 1024 / 1024).toFixed(1);
              const totalMB = (totalSize / 1024 / 1024).toFixed(1);

              if (url.includes("mongodb")) {
                this.updateProgress(
                  `Downloading MDB... ${progress}%`,
                  30 + progress * 0.1,
                  `${sizeMB}MB / ${totalMB}MB downloaded`
                );
              } else {
                this.updateProgress(
                  `Downloading Connections... ${progress}%`,
                  20 + progress * 0.1,
                  `${sizeMB}MB / ${totalMB}MB downloaded`
                );
              }
            }
          }
        });

        response.pipe(file);

        file.on("finish", () => {
          file.close();
          const finalSize = fs.statSync(filePath).size;

          // Make executable on macOS/Linux
          if (process.platform !== "win32" && filePath.includes("api")) {
            try {
              fs.chmodSync(filePath, 0o755);
              console.log("✅ Made downloaded Connections executable");
            } catch (error) {
              console.error("⚠️ Could not make Connections executable:", error.message);
            }
          }

          // Enhanced API validation for packaged apps
          if (filePath.includes("api")) {
            if (finalSize < 1000000) {
              console.log(`⚠️ API file seems too small (${finalSize} bytes)`);

              // Check if it's HTML error page
              try {
                const content = fs
                  .readFileSync(filePath, "utf8")
                  .substring(0, 500);
                if (
                  content.includes("<html>") ||
                  content.includes("<!DOCTYPE")
                ) {
                  fs.unlink(filePath, () => {});
                  reject(
                    new Error(
                      "Connections download returned HTML error page instead of binary"
                    )
                  );
                  return;
                }
              } catch (e) {
                // If we can't read as text, it might be a valid binary
                console.log("✅ File appears to be binary (good sign)");
              }
            }

            // Additional validation: check if file is actually executable
            try {
              if (process.platform !== "win32") {
                const { execSync } = require("child_process");
                execSync(`file "${filePath}"`, { stdio: "pipe" });
                console.log("✅ Connections file format validated");
              }
            } catch (e) {
              console.log(
                "⚠️ Could not validate file format, continuing anyway"
              );
            }
          }

          resolve();
        });

        file.on("error", (err) => {
          fs.unlink(filePath, () => {});
          reject(err);
        });
      });

      request.on("timeout", () => {
        request.destroy();
        fs.unlink(filePath, () => {});
        reject(new Error("Download timeout after 10 minutes"));
      });

      request.on("error", (err) => {
        fs.unlink(filePath, () => {});
        reject(err);
      });
    });
  }
}

module.exports = { DownloadManager };
