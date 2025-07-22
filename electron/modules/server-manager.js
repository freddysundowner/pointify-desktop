// electron/modules/server-manager.js
// Handles React server startup using fork

const fs = require("fs");
const path = require("path");
const { fork } = require("child_process");
const { app } = require("electron");

class ServerManager {
  constructor() {
    this.serverProcess = null;
    this.config = this.loadConfig();
  }

  loadConfig() {
    try {
      const configPath = path.join(__dirname, "../config.json");
      const configData = fs.readFileSync(configPath, "utf8");
      return JSON.parse(configData);
    } catch (error) {
      console.error(
        "❌ Error loading config.json in ServerManager:",
        error.message
      );
      throw new Error(
        "Config file is required. Please ensure electron/config.json exists."
      );
    }
  }

  async startReactServer() {
    console.log("🚀 Starting server...");

    const isPackaged = app.isPackaged;

   const serverPath = isPackaged
  ? path.join(process.resourcesPath, "server", "dist", "index.cjs")
  : path.join(__dirname, "..", "..", "server", "dist", "index.cjs");

    console.log(`📍 Server path: ${serverPath}`);
    console.log(`📍 Server exists: ${fs.existsSync(serverPath)}`);

    if (!fs.existsSync(serverPath)) {
      throw new Error(`Backend server not found at: ${serverPath}`);
    }

    // Clean up any existing processes on ports first
    await this.cleanupExistingProcesses();

    return new Promise((resolve, reject) => {
      // Setup environment
      const userDataPath = app.getPath("userData");
      const dumpDirPath = path.join(userDataPath, this.config.server.dumpsDir);
      fs.mkdirSync(dumpDirPath, { recursive: true });

      const env = {
        ...process.env,
        NODE_ENV: this.config.environment.nodeEnv,
        PORT: this.config.server.port.toString(),
        POINTIFY_DUMPS_DIR: dumpDirPath,
        // Pass API connection info to React server
        POINTIFY_API_URL: this.config.server.online_api,
        POINTIFY_OFFLINE_API_URL: this.config.server.offline_api,
        DEFAULT_API_MODE: this.config.server.api_mode,
        MONGODB_URL: this.config.database.url,
        VITE_GOOGLE_MAPS_API_KEY: this.config.server.env.VITE_GOOGLE_MAPS_API_KEY,
        ...this.config.server.env,
      };

      // Use fork() with explicit execPath for Node.js
      console.log(`🍴 Forking server process: ${this.config.server.env.VITE_GOOGLE_MAPS_API_KEY}`);
      console.log(`🔧 Server will run on port: ${this.config.server.port}`);
      console.log(`🔧 Server environment: ${this.config.environment.nodeEnv}`);

      const forkOptions = {
        cwd: path.dirname(serverPath),
        env: env,
        silent: true, // Capture stdio
        detached: false,
      };

      // Try to use system Node.js instead of Electron's Node.js
      if (isPackaged && process.platform === "darwin") {
        const possibleNodePaths = this.config.server.nodePaths;

        for (const nodePath of possibleNodePaths) {
          if (fs.existsSync(nodePath)) {
            forkOptions.execPath = nodePath;
            console.log(`🎯 Using system Node.js: ${nodePath}`);
            break;
          }
        }
      }

      this.serverProcess = fork(serverPath, [], forkOptions);

      let serverStarted = false;

      this.serverProcess.on("error", (error) => {
        console.error("❌ Server process error:", error);
        if (!serverStarted) {
          reject(new Error(`Server process failed to start: ${error.message}`));
        }
      });

      // Log server output
      if (this.serverProcess.stdout) {
        this.serverProcess.stdout.on("data", (data) => {
          const output = data.toString().trim();
          console.log("📊 Server:", output);

          // Detect when server is ready - configurable success message
          const successMessages = this.config.server.successMessages;

          const isReady = successMessages.some((message) =>
            output.includes(message)
          );

          if (isReady && !serverStarted) {
            serverStarted = true;
            console.log("✅ Server started successfully!");
            resolve();
          }
        });
      }

      if (this.serverProcess.stderr) {
        this.serverProcess.stderr.on("data", (data) => {
          const output = data.toString().trim();
          console.log("📊 Server Error:", output);
        });
      }

      this.serverProcess.on("exit", (code, signal) => {
        console.log(
          `🏁 Server process exited with code ${code}, signal ${signal}`
        );
        if (code !== 0 && code !== null && !serverStarted) {
          reject(new Error(`Server process failed with exit code ${code}`));
        }
      });

      this.serverProcess.on("spawn", () => {
        console.log("✅ Server process forked successfully");
      });

      // Fallback: Check server health if we don't see the startup message
      const healthCheckTimeout = this.config.server.healthCheckTimeout;
      setTimeout(() => {
        if (!serverStarted) {
          console.log("🔍 Checking server health (fallback)...");
          this.checkServerHealth(resolve, reject, serverStarted);
        }
      }, healthCheckTimeout);
    });
  }

  async cleanupExistingProcesses() {
    console.log("🧹 Cleaning up existing processes...");
    try {
      const { execSync } = require("child_process");
      const port = this.config.server.port;

      if (process.platform === "darwin") {
        execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, {
          stdio: "ignore",
        });
        console.log(`✅ Cleaned up port ${port}`);
      } else if (process.platform === "win32") {
        execSync(
          `netstat -ano | findstr :${port} | for /f "tokens=5" %a in ('more') do taskkill /F /PID %a 2>nul || echo Process not found`,
          {
            stdio: "ignore",
          }
        );
        console.log(`✅ Cleaned up port ${port}`);
      }
    } catch (error) {
      console.log(
        "⚠️ Could not clean up processes (this is normal on first run)"
      );
    }
  }

  async checkServerHealth(resolve, reject, serverStarted) {
    try {
      const serverUrl = `http://${this.config.server.host}:${this.config.server.port}`;
      const healthTimeout = this.config.server.healthTimeout;

      const response = await fetch(serverUrl, {
        signal: AbortSignal.timeout(healthTimeout),
      });

      if (response.ok) {
        if (!serverStarted) {
          serverStarted = true;
          console.log("✅ Server health check passed!");
          resolve();
        }
      } else {
        throw new Error(`Server responded with status: ${response.status}`);
      }
    } catch (err) {
      if (!serverStarted) {
        console.log(`❌ Server health check failed: ${err.message}`);
        reject(new Error(`Server failed to respond: ${err.message}`));
      }
    }
  }

  shutdown() {
    if (this.serverProcess) {
      console.log("🛑 Shutting down server...");
      this.serverProcess.kill();
      this.serverProcess = null;
    }
  }
}

module.exports = { ServerManager };
