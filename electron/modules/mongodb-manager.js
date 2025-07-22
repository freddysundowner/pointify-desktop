// electron/modules/mongodb-manager.js
// Handles MongoDB download, extraction, and startup
const os = require("os"); // make sure this is at the top of the file

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const net = require("net"); //  ← new

class MongoDBManager {
  constructor(updateProgress) {
    this.updateProgress = updateProgress;
    this.mongoProcess = null;
  }
  // REPLACE your startMongoDB() method in MongoDBManager with this:
  async isMongoPortOpen(port = 27017, host = "127.0.0.1") {
    return new Promise((resolve) => {
      const socket = net.createConnection({ port, host });
      socket.once("connect", () => {
        socket.destroy();
        resolve(true);
      });
      socket.once("error", () => {
        resolve(false);
      });
      socket.setTimeout(1000, () => {
        socket.destroy();
        resolve(false);
      });
    });
  }
  isProcessRunning(pid) {
    try {
      process.kill(pid, 0); // just probes
      return true;
    } catch (e) {
      return false;
    }
  }
  async startMongoDB(mongoPath) {
    const platform = process.platform;

    // Step 1: Find the correct mongod binary
    let mongodPath;
    if (platform === "win32") {
      mongodPath = path.join(mongoPath, "bin", "mongod.exe");
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
      if (!fs.existsSync(mongodPath)) {
        const mongodAlt = path.join(mongoPath, "mongodb", "bin", "mongod");
        if (fs.existsSync(mongodAlt)) {
          mongodPath = mongodAlt;
        }
      }
    }

    const dataPath = path.join(mongoPath, "data");
    fs.mkdirSync(dataPath, { recursive: true });

    if (!fs.existsSync(mongodPath)) {
      throw new Error(`MongoDB binary not found at: ${mongodPath}`);
    }

    console.log(`✅ MongoDB binary found at: ${mongodPath}`);

    // 🛡️ Step 2: Check for existing mongod.lock file
    const lockFile = path.join(dataPath, "mongod.lock");
    let reuseExisting = false;

    if (fs.existsSync(lockFile)) {
      const text = fs.readFileSync(lockFile, "utf8").trim(); // ← may be empty / non‑numeric
      const pid = parseInt(text, 10);

      if (!Number.isNaN(pid) && pid > 0 && this.isProcessRunning(pid)) {
        // 🔒 Valid lock *and* live PID
        reuseExisting = true;
      } else {
        // Could be stale.  Before deleting, ask: is port 27017 actually open?
        const portOpen = await this.isMongoPortOpen(27017);
        if (portOpen) {
          reuseExisting = true;
        } // live Mongo, just corrupt lock contents
        else {
          fs.unlinkSync(lockFile);
        } // really stale – safe to remove
      }
    } else {
      // No lock – still verify port 27017
      reuseExisting = await this.isMongoPortOpen(27017);
    }

    if (reuseExisting) {
      console.log("✅ Existing MongoDB instance detected – will reuse it.");
      return; // ⬅️  DO NOT spawn a new mongod
    }

    // 🏁 Step 3: Start MongoDB on default port
    return new Promise((resolve, reject) => {
      // this.mongoProcess = spawn(
      //   mongodPath,
      //   ["--dbpath", dataPath, "--port", "27017", "--bind_ip", "127.0.0.1"],
      //   {
      //     detached: false,
      //     stdio: ["pipe", "pipe", "pipe"],
      //   }
      // );
      this.mongoProcess = spawn(
        mongodPath,
        ["--dbpath", dataPath, "--port", "27017", "--bind_ip", "127.0.0.1"],
        {
          cwd: os.homedir(), // ✅ use a safe directory like ~/ (important on macOS)
          detached: false,
          stdio: ["pipe", "pipe", "pipe"],
        }
      );

      let readyDetected = false;

      const onReady = () => {
        if (!readyDetected) {
          readyDetected = true;
          console.log("✅ MongoDB started and ready on 127.0.0.1:27017");
          resolve();
        }
      };

      this.mongoProcess.stdout.on("data", (data) => {
        const output = data.toString();
        console.log("MongoDB:", output.trim());
        if (output.includes("waiting for connections")) onReady();
      });

      this.mongoProcess.stderr.on("data", (data) => {
        const error = data.toString();
        console.log("MongoDB Error:", error.trim());
        if (error.includes("waiting for connections")) onReady();
      });

      this.mongoProcess.on("error", (err) => {
        console.log("⚠️ MongoDB process error:", err.message);
        resolve(); // Allow app to continue using existing DB
      });

      this.mongoProcess.on("exit", (code) => {
        if (!readyDetected && code !== 0) {
          console.log(`⚠️ MongoDB exited with code ${code}`);
          resolve();
        }
      });

      // ⏳ Timeout fallback
      setTimeout(() => {
        if (!readyDetected) {
          console.log("⏱️ MongoDB not ready after timeout — continuing anyway");
          resolve();
        }
      }, 15000);
    });
  }

  // ADD this method to kill all MongoDB processes:
  async killAllMongoProcesses() {
    return new Promise((resolve) => {
      const { exec } = require("child_process");
      const isWindows = process.platform === "win32";

      let command;
      if (isWindows) {
        command = `taskkill /F /IM mongod.exe 2>nul || echo "No MongoDB processes found"`;
      } else {
        command = `pkill -f mongod || echo "No MongoDB processes found"`;
      }

      exec(command, (error, stdout, stderr) => {
        if (stdout.includes("No MongoDB processes found")) {
          console.log("ℹ️ No existing MongoDB processes to kill");
        } else {
          console.log("✅ Killed existing MongoDB processes");
        }

        // Wait a moment for processes to fully terminate
        setTimeout(resolve, 2000);
      });
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
