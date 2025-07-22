// electron/modules/api-manager.js
// Handles Pointify API startup and management

const fs = require("fs");
const path = require("path");
const { spawn, exec } = require("child_process");
const net = require("net");

class APIManager {
  constructor(loadUserConfig) {
    this.loadUserConfig = loadUserConfig;
    this.apiProcess = null;
    this.config = this.loadConfig();
  }
  setMongoConnectionInfo(connectionInfo) {
    this.mongoConnectionInfo = connectionInfo;
    console.log(`🔗 API will use MongoDB: ${connectionInfo.connectionString}`);
  }

  loadConfig() {
    try {
      const configPath = path.join(__dirname, "../config.json");
      const configData = fs.readFileSync(configPath, "utf8");
      return JSON.parse(configData);
    } catch (error) {
      console.error(
        "❌ Error loading config.json, using defaults:",
        error.message
      );
    }
  }

  async isPortFree(port) {
    // Check both IPv4 and IPv6
    const checkIPv4 = () => {
      return new Promise((resolve) => {
        const server = net.createServer();
        server.once("error", () => resolve(false));
        server.once("listening", () => {
          server.close(() => resolve(true));
        });
        server.listen(port, "127.0.0.1");
      });
    };

    const checkIPv6 = () => {
      return new Promise((resolve) => {
        const server = net.createServer();
        server.once("error", () => resolve(false));
        server.once("listening", () => {
          server.close(() => resolve(true));
        });
        server.listen(port, "::1"); // IPv6 localhost
      });
    };

    const checkAll = () => {
      return new Promise((resolve) => {
        const server = net.createServer();
        server.once("error", (err) => {
          console.log(`⚠️ Port ${port} check failed:`, err.code);
          resolve(false);
        });
        server.once("listening", () => {
          server.close(() => {
            console.log(`✅ Port ${port} is completely free`);
            resolve(true);
          });
        });
        // Bind to all interfaces like the API does
        server.listen(port);
      });
    };

    try {
      const [ipv4Free, ipv6Free, allFree] = await Promise.all([
        checkIPv4(),
        checkIPv6(),
        checkAll(),
      ]);

      const isFree = ipv4Free && ipv6Free && allFree;
      if (!isFree) {
        console.log(
          `⚠️ Port ${port} status - IPv4: ${ipv4Free}, IPv6: ${ipv6Free}, All: ${allFree}`
        );
      }
      return isFree;
    } catch (error) {
      console.log(`⚠️ Port check error for ${port}:`, error.message);
      return false;
    }
  }

  async killProcessOnPort(port) {
    return new Promise((resolve) => {
      console.log(`🔄 Attempting to kill ALL processes on port ${port}...`);

      const isWindows = process.platform === "win32";

      let command;
      if (isWindows) {
        command = `netstat -ano | findstr :${port}`;
      } else {
        // Use multiple commands to find all processes
        command = `lsof -ti :${port} 2>/dev/null || netstat -tulpn 2>/dev/null | grep :${port} | awk '{print $7}' | cut -d'/' -f1 || true`;
      }

      exec(command, (error, stdout, stderr) => {
        if (error || !stdout.trim()) {
          console.log(`ℹ️ No processes found on port ${port}`);
          resolve(true);
          return;
        }

        if (isWindows) {
          // Windows logic (unchanged)
          const lines = stdout.trim().split("\n");
          const pids = lines
            .map((line) => {
              const parts = line.trim().split(/\s+/);
              return parts[parts.length - 1];
            })
            .filter((pid) => pid && !isNaN(pid));

          if (pids.length === 0) {
            resolve(true);
            return;
          }

          const killCommand = `taskkill /F /PID ${pids.join(" /PID ")}`;
          exec(killCommand, (killError) => {
            if (killError) {
              console.log(`⚠️ Failed to kill process: ${killError.message}`);
            } else {
              console.log(`✅ Killed process(es) on port ${port}`);
            }
            resolve(true);
          });
        } else {
          // Enhanced Unix/Mac logic
          const pids = stdout
            .trim()
            .split("\n")
            .map((line) => line.trim())
            .filter((pid) => pid && !isNaN(pid) && pid !== "");

          if (pids.length === 0) {
            console.log(`ℹ️ No valid PIDs found for port ${port}`);
            resolve(true);
            return;
          }

          console.log(`🎯 Found PIDs using port ${port}: ${pids.join(", ")}`);

          // More aggressive killing - try multiple approaches
          const killCommands = [
            `kill -TERM ${pids.join(" ")}`, // Graceful first
            `sleep 1 && kill -9 ${pids.join(" ")} 2>/dev/null || true`, // Force kill without sudo
          ];

          const executeKills = async () => {
            for (let i = 0; i < killCommands.length; i++) {
              const cmd = killCommands[i];
              await new Promise((cmdResolve) => {
                exec(cmd, (killError, killStdout, killStderr) => {
                  if (i === 0) {
                    if (killError) {
                      console.log(`⚠️ SIGTERM failed, trying SIGKILL...`);
                    } else {
                      console.log(
                        `✅ Sent SIGTERM to processes: ${pids.join(", ")}`
                      );
                    }
                  } else if (i === 1) {
                    console.log(
                      `💀 Sent SIGKILL to processes: ${pids.join(", ")}`
                    );
                  }

                  // Wait a bit between kill attempts
                  setTimeout(cmdResolve, 500);
                });
              });
            }

            // Verify processes are actually dead
            setTimeout(() => {
              exec(
                `lsof -ti :${port} 2>/dev/null || true`,
                (checkError, checkStdout) => {
                  if (checkStdout.trim()) {
                    console.log(
                      `⚠️ Some processes may still exist on port ${port}: ${checkStdout.trim()}`
                    );
                  } else {
                    console.log(
                      `✅ Confirmed all processes killed on port ${port}`
                    );
                  }
                  resolve(true);
                }
              );
            }, 1000);
          };

          executeKills();
        }
      });
    });
  }
  async killPointifyProcesses() {
    return new Promise((resolve) => {
      console.log(`🔄 Killing any existing Pointify processes...`);

      const isWindows = process.platform === "win32";
      let command;

      if (isWindows) {
        command = `taskkill /F /IM "Pointify Desktop POS.exe" 2>nul`;
      } else {
        command = `pkill -f "Pointify Desktop POS" || true`;
      }

      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.log(`ℹ️ No existing Pointify processes found`);
        } else {
          console.log(`✅ Killed existing Pointify processes`);
        }
        resolve(true);
      });
    });
  }
  async ensurePortFree(port, maxRetries = 5) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`🔍 Port check attempt ${attempt}/${maxRetries}`);

      const isFree = await this.isPortFree(port);
      if (isFree) {
        console.log(`✅ Port ${port} is free`);
        return true;
      }

      console.log(`🔄 Port ${port} in use, attempting cleanup...`);
      await this.killProcessOnPort(port);

      // Progressive wait time
      const waitTime = Math.min(2000 * attempt, 10000);
      console.log(`⏳ Waiting ${waitTime}ms for cleanup...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    throw new Error(
      `Port ${port} is still in use after ${maxRetries} cleanup attempts`
    );
  }

  async startPointifyAPI(apiPath) {
    // Kill any existing Pointify processes first
    await this.killPointifyProcesses();
    await this.ensurePortFree(this.config.api.port);

    // Critical: Add final safety wait for OS to fully release the port
    console.log("⏳ Final safety wait for port release...");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Double-check one more time before starting
    const finalCheck = await this.isPortFree(this.config.api.port);
    if (!finalCheck) {
      throw new Error(
        `Port ${this.config.api.port} is still not free after cleanup - another service may be using it`
      );
    }

    // Check if API file exists
    if (!fs.existsSync(apiPath)) {
      throw new Error(`API binary not found at: ${apiPath}`);
    }

    // Check if file is executable
    try {
      fs.accessSync(apiPath, fs.constants.F_OK | fs.constants.X_OK);
    } catch (error) {
      throw new Error(`API binary is not executable: ${apiPath}`);
    }

    return new Promise((resolve, reject) => {
      const installDir = path.dirname(apiPath);
      const userConfig = this.loadUserConfig();
      const jwtSecret = userConfig.JWT_SECRET || this.config.security.jwtSecret;
      console.log("🔑 jwtsecret being passed to API:", jwtSecret);

      const apiEnv = {
        ...process.env,
        ENV_PRO_PORT: this.config.api.port.toString(),
        MONGO_URL: this.config.database.url,
        jwtsecret: jwtSecret,
        NODE_ENV: this.config.environment.nodeEnv,
        GOOGLE_MAPS_API_KEY:
          userConfig.GOOGLE_MAPS_API_KEY ||
          process.env.GOOGLE_MAPS_API_KEY ||
          this.config.security.googleMapsApiKey,
        POINTIFY_USER_DATA_DIR: require("electron").app.getPath("userData"),
        ...userConfig,
      };

      let errorMessages = []; // Collect all error messages
      let startupTimeout;

      this.apiProcess = spawn(apiPath, [], {
        env: apiEnv,
        detached: false,
        stdio: ["pipe", "pipe", "pipe"],
        cwd: installDir,
      });

      // Set a startup timeout to catch hanging processes
      startupTimeout = setTimeout(() => {
        console.log("⚠️ API startup timeout - killing process");
        if (this.apiProcess && !this.apiProcess.killed) {
          this.apiProcess.kill("SIGKILL");
        }
        reject(
          new Error("API startup timeout - process took too long to start")
        );
      }, 15000); // 15 second timeout

      this.apiProcess.on("error", (error) => {
        clearTimeout(startupTimeout);
        console.error("❌ API process error:", error);
        reject(new Error(`API process failed to start: ${error.message}`));
      });

      this.apiProcess.on("spawn", () => {
        console.log(
          `✅ Pointify API process spawned on port ${this.config.api.port}`
        );

        // Test if API is actually responding
        setTimeout(async () => {
          clearTimeout(startupTimeout);
          try {
            let apiWorking = false;

            for (const endpoint of this.config.api.healthCheckEndpoints) {
              try {
                const response = await fetch(
                  `http://localhost:${this.config.api.port}${endpoint}`
                );
                if (response.ok) {
                  console.log(`✅ API responding at ${endpoint}`);
                  apiWorking = true;
                  break;
                }
              } catch (e) {
                // Try next endpoint
              }
            }

            if (apiWorking) {
              console.log("✅ API is responding correctly");
              resolve();
            } else {
              console.log("⚠️ API started but endpoints may not be ready yet");
              resolve(); // Still resolve to continue
            }
          } catch (error) {
            console.log("⚠️ API connection test failed, continuing anyway");
            resolve();
          }
        }, this.config.api.healthCheckTimeout);
      });

      // Log API output for debugging
      this.apiProcess.stdout.on("data", (data) => {
        console.log("API:", data.toString().trim());
      });

      // Collect error messages and reject immediately on EADDRINUSE
      this.apiProcess.stderr.on("data", (data) => {
        const errorMsg = data.toString().trim();
        console.error("API Error:", errorMsg);
        errorMessages.push(errorMsg);

        // Immediately fail on port conflicts
        if (errorMsg.includes("EADDRINUSE")) {
          clearTimeout(startupTimeout);
          reject(new Error(`Port conflict detected: ${errorMsg}`));
        }
      });

      this.apiProcess.on("exit", (code, signal) => {
        clearTimeout(startupTimeout);
        if (code !== 0 && code !== null) {
          console.error(
            `❌ API process exited with code ${code}, signal ${signal}`
          );

          // Show the real error messages in the dialog
          const fullError =
            errorMessages.length > 0
              ? errorMessages.join("\n")
              : `API process failed with exit code ${code}`;

          reject(new Error(`API Error:\n${fullError}`));
        }
      });
    });
  }

  shutdown() {
    if (this.apiProcess) {
      console.log("🛑 Shutting down Pointify API...");

      try {
        // Try graceful shutdown first
        this.apiProcess.kill("SIGTERM");

        // Wait a bit, then force kill if still alive
        setTimeout(() => {
          if (this.apiProcess && !this.apiProcess.killed) {
            console.log("💀 Force killing API process...");
            this.apiProcess.kill("SIGKILL");
          }
        }, 3000);

        // Also kill by port as backup
        setTimeout(() => {
          this.killProcessOnPort(this.config.api.port);
        }, 1000);
      } catch (error) {
        console.log("⚠️ Error during API shutdown:", error.message);
        // Try killing by port as fallback
        this.killProcessOnPort(this.config.api.port);
      }

      this.apiProcess = null;
    }
  }
}

module.exports = { APIManager };
