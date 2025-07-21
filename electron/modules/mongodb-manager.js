// electron/modules/mongodb-manager.js
// Handles MongoDB download, extraction, and startup

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

class MongoDBManager {
  constructor(updateProgress) {
    this.updateProgress = updateProgress;
    this.mongoProcess = null;
  }

  async startMongoDB(mongoPath) {
    const platform = process.platform;

    // Find the correct mongod path based on platform
    let mongodPath;
    if (platform === "win32") {
      mongodPath = path.join(mongoPath, "bin", "mongod.exe");
      // If standard path doesn't exist, try looking in subdirectories
      if (!fs.existsSync(mongodPath)) {
        const mongodAlt = path.join(
          mongoPath,
          "mongodb-windows-x86_64-4.4.18",
          "bin",
          "mongod.exe"
        );
        if (fs.existsSync(mongodAlt)) {
          mongodPath = mongodAlt;
        }
      }
    } else {
      mongodPath = path.join(mongoPath, "bin", "mongod");
    }

    const dataPath = path.join(mongoPath, "data");

    // Create data directory
    fs.mkdirSync(dataPath, { recursive: true });

    // Check if mongod binary exists and provide debugging info
    if (!fs.existsSync(mongodPath)) {
      console.log(`❌ MongoDB binary not found at: ${mongodPath}`);
      console.log(`📁 MongoDB directory contents:`);

      // List contents of mongodb directory for debugging
      try {
        const listDirectory = (dir, depth = 0) => {
          const items = fs.readdirSync(dir);
          const indent = "  ".repeat(depth);
          for (const item of items) {
            const itemPath = path.join(dir, item);
            const stats = fs.statSync(itemPath);
            console.log(`${indent}${item}${stats.isDirectory() ? "/" : ""}`);

            if (stats.isDirectory() && depth < 2) {
              listDirectory(itemPath, depth + 1);
            }
          }
        };

        listDirectory(mongoPath);
      } catch (error) {
        console.log(`❌ Cannot list directory: ${error.message}`);
      }

      throw new Error(`MongoDB binary not found at: ${mongodPath}`);
    }

    console.log(`✅ MongoDB binary found at: ${mongodPath}`);

    return new Promise((resolve, reject) => {
      this.mongoProcess = spawn(
        mongodPath,
        ["--dbpath", dataPath, "--port", "27017", "--bind_ip", "127.0.0.1"],
        {
          detached: false,
          stdio: ["pipe", "pipe", "pipe"],
        }
      );

      let readyDetected = false;

      this.mongoProcess.stdout.on("data", (data) => {
        const output = data.toString();

        if (
          (output.includes("Waiting for connections") ||
            output.includes("waiting for connections") ||
            output.includes("ready for connections")) &&
          !readyDetected
        ) {
          readyDetected = true;
          console.log(
            "✅ MongoDB started and ready for connections on 127.0.0.1:27017"
          );
          resolve();
        }
      });

      this.mongoProcess.stderr.on("data", (data) => {
        const error = data.toString();
        console.log("MongoDB Error:", error.trim());

        // Some MongoDB messages come through stderr but aren't actual errors
        if (
          (error.includes("Waiting for connections") ||
            error.includes("waiting for connections") ||
            error.includes("ready for connections")) &&
          !readyDetected
        ) {
          readyDetected = true;
          console.log(
            "✅ MongoDB started and ready for connections on 127.0.0.1:27017"
          );
          resolve();
        }
      });

      this.mongoProcess.on("error", (error) => {
        console.error("MongoDB Process Error:", error);
        reject(error);
      });

      // Timeout after 15 seconds
      setTimeout(() => {
        if (!readyDetected) {
          console.log("✅ MongoDB startup timeout reached - continuing anyway");
          resolve();
        }
      }, 15000);
    });
  }

  async extractMongoDB(archivePath, installDir) {
    return new Promise(async (resolve, reject) => {
      try {
        if (process.platform === "win32") {
          // Use Node.js built-in ZIP extraction for Windows
          const { execSync } = require("child_process");

          // Use .NET System.IO.Compression which handles paths better
          const script = `
              Add-Type -AssemblyName System.IO.Compression.FileSystem
              $source = "${archivePath.replace(/\\/g, "\\\\")}"
              $destination = "${installDir.replace(/\\/g, "\\\\")}"
              [System.IO.Compression.ZipFile]::ExtractToDirectory($source, $destination)
            `;

          const scriptFile = path.join(installDir, "extract.ps1");
          fs.writeFileSync(scriptFile, script, "utf8");

          execSync(`powershell -ExecutionPolicy Bypass -File "${scriptFile}"`, {
            stdio: "pipe",
          });

          // Clean up script file
          fs.unlinkSync(scriptFile);
        } else {
          // Mac/Linux TAR extraction
          const { execSync } = require("child_process");
          execSync(`tar -xzf "${archivePath}" -C "${installDir}"`, {
            stdio: "pipe",
          });
        }

        // Find extracted MongoDB directory and organize it properly
        const files = fs.readdirSync(installDir);
        const mongoDir = files.find(
          (file) =>
            file.startsWith("mongodb-") &&
            fs.statSync(path.join(installDir, file)).isDirectory()
        );

        if (mongoDir) {
          const oldPath = path.join(installDir, mongoDir);
          const newPath = path.join(installDir, "mongodb");

          if (!fs.existsSync(newPath)) {
            // Create mongodb directory
            fs.mkdirSync(newPath, { recursive: true });

            // Move contents from extracted directory to mongodb directory
            const contents = fs.readdirSync(oldPath);
            for (const item of contents) {
              const srcPath = path.join(oldPath, item);
              const destPath = path.join(newPath, item);
              fs.renameSync(srcPath, destPath);
            }

            // Remove empty extracted directory
            fs.rmSync(oldPath, { recursive: true, force: true });
          }
        }

        // Clean up archive file
        fs.unlinkSync(archivePath);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  shutdown() {
    if (this.mongoProcess) {
      console.log("🛑 Shutting down MongoDB...");
      this.mongoProcess.kill();
      this.mongoProcess = null;
    }
  }
}

module.exports = { MongoDBManager };
