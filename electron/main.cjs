// electron/main.cjs
// Main Electron process - simplified and modular

const { app, BrowserWindow, Menu, shell, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");

// Create debug log function
function debugLog(message) {
  const logFile = path.join(os.tmpdir(), "pointify-debug.log");
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logFile, `${timestamp}: ${message}\n`);
  console.log(message);
}

// Catch all unhandled errors
process.on("uncaughtException", (error) => {
  debugLog(`Uncaught Exception: ${error.message}`);
  debugLog(`Stack: ${error.stack}`);
});

process.on("unhandledRejection", (reason, promise) => {
  debugLog(`Unhandled Rejection at: ${promise}`);
  debugLog(`Reason: ${reason}`);
});
debugLog("🚀 Starting Pointify Desktop...");

// Add this after your debug setup and before the imports:
debugLog("Loading modules...");

// try {
debugLog("Loading MongoDBManager...");
const { MongoDBManager } = require("./modules/mongodb-manager.js");

debugLog("Loading APIManager...");
const { APIManager } = require("./modules/api-manager.js");

debugLog("Loading ServerManager...");
const { ServerManager } = require("./modules/server-manager.js");

debugLog("Loading DownloadManager...");
const { DownloadManager } = require("./modules/download-manager.js");

debugLog("Loading UpdateManager...");
const { UpdateManager } = require("./modules/update-manager.js");

debugLog("✅ All modules loaded successfully");
// } catch (error) {
//   debugLog(`❌ Module loading failed: ${error.message}`);
//   debugLog(`Stack: ${error.stack}`);
// process.exit(1);
// }

// Global state
let mainWindow;
let progressWindow;
let systemReady = false;
let initializationInProgress = false;

// Load main configuration
function loadMainConfig() {
  try {
    const configPath = path.join(__dirname, "config.json");
    const configData = fs.readFileSync(configPath, "utf8");
    return JSON.parse(configData);
  } catch (error) {
    console.error("❌ Error loading main config.json:", error.message);
    throw new Error(
      "Config file is required. Please ensure electron/config.json exists."
    );
  }
}

// Load configuration first
const CONFIG = loadMainConfig();

const isDev = CONFIG.environment.nodeEnv === "development";
// Initialize managers
let mongoManager;
let apiManager;
let serverManager;
let downloadManager;
let updateManager;
// let seedingManager;

// Force production mode for Electron testing
if (!isDev) {
  process.env.NODE_ENV = "production";
}

// Load user configuration for API keys and settings
function loadUserConfig() {
  const configPath = path.join(app.getPath("userData"), "config.json");

  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
      debugLog("✅ Loaded user configuration");
      return config;
    }
  } catch (error) {
    debugLog("⚠️ Could not load user config:", error.message);
  }

  return {
    JWT_SECRET: CONFIG.defaults.jwtSecret,
    GOOGLE_MAPS_API_KEY: CONFIG.defaults.googleMapsApiKey,
  };
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: CONFIG.ui.mainWindow.width,
    height: CONFIG.ui.mainWindow.height,
    closable: true,
    resizable: false,
    minimizable: true,
    maximizable: false,
    minWidth: CONFIG.ui.mainWindow.minWidth,
    minHeight: CONFIG.ui.mainWindow.minHeight,
    icon: path.join(__dirname, "assets/icon.png"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      preload: path.join(__dirname, "preload.js"),
    },
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    show: true, // Change from false to true - show immediately
    alwaysOnTop: false, // Add this to bring to front
  });

  mainWindow.loadURL(`http://${CONFIG.server.host}:${CONFIG.server.port}`);
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    mainWindow.focus();
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    const currentUrl = new URL(mainWindow.webContents.getURL());

    if (parsedUrl.origin !== currentUrl.origin) {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });
}

function createMenu() {
  const template = [
    {
      label: "Pointify",
      submenu: [
        {
          label: "Check for Updates...",
          click: async () => {
            if (updateManager) {
              await updateManager.manualUpdateCheck();
            }
          },
        },
        { type: "separator" },
        {
          label: "About Pointify Desktop",
          click: () => {
            dialog.showMessageBox({
              type: "info",
              title: "About Pointify Desktop",
              message: `Pointify Desktop POS v${CONFIG.app.version}`,
              detail: "Point of Sale System\nBuilt By ReggyCodas\n© 2025",
              buttons: ["OK"],
            });
          },
        },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [{ role: "minimize" }, { role: "close" }],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "Check for Updates...",
          click: async () => {
            if (updateManager) {
              await updateManager.manualUpdateCheck();
            }
          },
        },
        { type: "separator" },
        {
          label: "Report Issue",
          click: () => {
            shell.openExternal("https://pointifypos.com/support");
          },
        },
        {
          label: "Documentation",
          click: () => {
            shell.openExternal("https://docs.pointifypos.com");
          },
        },
      ],
    },
  ];

  // macOS specific menu adjustments
  if (process.platform === "darwin") {
    template[0].submenu.splice(template[0].submenu.length - 1, 0, {
      type: "separator",
    });
    template[0].submenu.splice(template[0].submenu.length - 1, 0, {
      role: "services",
    });
    template[0].submenu.splice(template[0].submenu.length - 1, 0, {
      type: "separator",
    });
    template[0].submenu.splice(template[0].submenu.length - 1, 0, {
      role: "hide",
    });
    template[0].submenu.splice(template[0].submenu.length - 1, 0, {
      role: "hideOthers",
    });
    template[0].submenu.splice(template[0].submenu.length - 1, 0, {
      role: "unhide",
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Initialize all managers
function initializeManagers() {
  mongoManager = new MongoDBManager(updateProgress);
  apiManager = new APIManager(loadUserConfig);
  serverManager = new ServerManager();
  // seedingManager = new SeedingManager();
  downloadManager = new DownloadManager(updateProgress, mongoManager);
  updateManager = new UpdateManager();
}

// Main system initialization
async function initializeSystem() {
  if (systemReady) {
    return debugLog("⚠️ System already initialized, skipping.");
  }
  if (initializationInProgress) {
    return debugLog("⚠️ Initialization already in progress, skipping.");
  }

  initializationInProgress = true;

  // Initialize our managers
  initializeManagers();

  const downloadConfig = downloadManager.getDownloadConfig();
  const paths = (() => {
    const userDataPath = app.getPath("userData");
    const installDir = path.join(userDataPath, "runtime");
    return {
      installDir,
      api: path.join(installDir, downloadConfig.apiFile),
      mongo: path.join(installDir, "mongodb"),
      mongoZip: path.join(installDir, downloadConfig.mongoFile),
    };
  })();

  const utils = {
    progress: (message, percent, detail) =>
      updateProgress(message, percent, detail),
    fileExists: (filePath) => fs.existsSync(filePath),
    validateFile: (filePath, minSize = 0) => {
      if (!utils.fileExists(filePath)) {
        return { valid: false, reason: "File not found" };
      }

      const stats = fs.statSync(filePath);
      if (stats.size < minSize) {
        return { valid: false, reason: `File too small (${stats.size} bytes)` };
      }
      if (process.platform !== "win32" && !(stats.mode & parseInt("111", 8))) {
        return { valid: false, reason: "File not executable" };
      }
      return { valid: true, stats };
    },

    async retry(name, fn, ...args) {
      for (let attempt = 1; attempt <= CONFIG.api.maxRetries; attempt++) {
        try {
          await fn(...args);
          debugLog(`✅ ${name} started successfully`);
          return;
        } catch (error) {
          debugLog(`❌ ${name} attempt ${attempt} failed: ${error.message}`);
          if (attempt === CONFIG.api.maxRetries) {
            throw new Error(
              `${name} failed after ${CONFIG.api.maxRetries} attempts: ${error.message}`
            );
          }
          await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
        }
      }
    },
  };

  try {
    debugLog("🚀 Initializing Pointify Desktop System...");

    // Validate and update components
    utils.progress("Validating components...", 5, "Checking system files");

    const apiValidation = utils.validateFile(paths.api, CONFIG.api.minSize);
    if (!apiValidation.valid) {
      debugLog(`🗑️ ${apiValidation.reason}, will re-download API`);
      utils.fileExists(paths.api) && fs.unlinkSync(paths.api);
    }

    // Download missing components
    const needsDownload =
      !utils.fileExists(paths.api) ||
      (!utils.fileExists(paths.mongo) && !utils.fileExists(paths.mongoZip));

    if (needsDownload) {
      utils.progress(
        "Downloading components...",
        10,
        "Setting up your offline POS system"
      );
      await downloadManager.downloadComponents(paths.installDir);

      // Make API executable on Unix
      if (process.platform !== "win32" && utils.fileExists(paths.api)) {
        fs.chmodSync(paths.api, "755");
      }
    }

    // Extract MongoDB if needed
    if (utils.fileExists(paths.mongoZip) && !utils.fileExists(paths.mongo)) {
      utils.progress("Installing database...", 40, "Extracting MongoDB files");
      await mongoManager.extractMongoDB(paths.mongoZip, paths.installDir);
    }

    // Start services using our managers
    const services = [
      {
        name: "MDB",
        fn: async () => {
          await mongoManager.startMongoDB(paths.mongo);
          // Don't update config - if MongoDB can't start, use existing one on 27017
          console.log("📋 Using MongoDB connection: " + CONFIG.database.url);
        },
        progress: [50, "Initializing MDB"],
      },
      // {
      //   name: "Data Seeding",
      //   fn: () => seedingManager.seedPointifyData(),
      //   progress: [60, "Setting up initial data"],
      // },
      {
        name: "Pointify",
        fn: () => apiManager.startPointifyAPI(paths.api),
        progress: [70, "Loading your business data"],
      },
      {
        name: "POS Dashboard",
        fn: () => serverManager.startReactServer(),
        progress: [90, "Preparing user interface"],
      },
    ];

    for (const service of services) {
      utils.progress(
        `Starting ${service.name.toLowerCase()}...`,
        ...service.progress
      );

      if (service.name === "Pointify") {
        const validation = utils.validateFile(paths.api, CONFIG.api.minSize);
        if (!validation.valid) {
          throw new Error(
            `Connnections validation failed: ${validation.reason}`
          );
        }
        debugLog(`📊 Connnections validated: ${validation.stats.size} bytes`);
      }

      await utils.retry(service.name, service.fn);

      if (service.name === "MDB") {
        utils.progress("Waiting for database...", 55, "Ensuring MDB is ready");
        await new Promise((resolve) =>
          setTimeout(resolve, CONFIG.database.readyDelay)
        );
      }
    }

    systemReady = true;
    utils.progress("Ready!", 100, "Pointify Desktop is ready to use");
    debugLog("✅ All systems running locally"); // Change console.log to debugLog

    // Start automatic update checks
    if (updateManager) {
      updateManager.startPeriodicChecks();
    }

    debugLog("🕐 Setting timeout to transition to main window..."); // Change to debugLog
    debugLog(`🕐 Timeout delay: ${CONFIG.app.successDisplayTime}ms`); // Change to debugLog

    const timeoutDelay = CONFIG.app.successDisplayTime || 3000; // fallback to 3 seconds

    setTimeout(() => {
      debugLog(
        "🕐 Timeout executed - closing progress and opening main window"
      );
      try {
        debugLog("📝 Calling closeProgressWindow()...");
        closeProgressWindow();
        debugLog("✅ Progress window closed successfully");

        debugLog("📝 Calling createWindow()...");
        createWindow();
        debugLog("✅ Main window created successfully");
      } catch (error) {
        debugLog(`❌ Error during window transition: ${error.message}`);
        debugLog(`Stack: ${error.stack}`);
      }
    }, timeoutDelay);
  } catch (error) {
    console.error("❌ System initialization failed:", error.message);

    const userMessages = {
      corrupted:
        "Some system files need to be re-downloaded. Please restart the application.",
      "update available":
        "A system update is available. Please restart to download the latest version.",
      "failed to start":
        "Failed to start system services. Please check if another instance is running.",
    };

    const userMessage =
      Object.entries(userMessages).find(([key]) =>
        error.message.includes(key)
      )?.[1] || error.message;

    await dialog.showErrorBox(
      "Pointify Desktop Error",
      `${userMessage}\n\nIf this problem persists, please contact support.`
    );
  } finally {
    initializationInProgress = false;
  }
}

// Clean shutdown of all components
async function shutdownSystem() {
  debugLog("🛑 Shutting down system...");

  if (apiManager) apiManager.shutdown();
  if (mongoManager) mongoManager.shutdown();
  if (serverManager) serverManager.shutdown();
  if (updateManager) updateManager.closeUpdateWindow();

  debugLog("🛑 System shutdown complete");
}

// App event handlers
app.whenReady().then(async () => {
  debugLog("🚀 Starting Pointify Desktop...");

  if (systemReady) {
    debugLog("⚠️ App already ready, skipping initialization");
    return;
  }

  try {
    const userDataPath = app.getPath("userData");
    process.chdir(userDataPath);
    debugLog(`✅ Working directory set to: ${process.cwd()}`);
  } catch (err) {
    console.error("❌ Failed to set working directory:", err);
  }

  // Check if first-time setup is needed
  const installDir = path.join(app.getPath("userData"), "runtime");
  const tempDownloadManager = new DownloadManager(() => {}, null);
  const config = tempDownloadManager.getDownloadConfig();
  const apiPath = path.join(installDir, config.apiFile);

  createMenu();

  try {
    if (!fs.existsSync(apiPath)) {
      createProgressWindow();
    }
    await initializeSystem();
  } catch (error) {
    console.error("❌ Initialization failed:", error);
    dialog.showErrorBox("Startup Error", error.message);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", async () => {
  await shutdownSystem();
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", async (event) => {
  if (systemReady) {
    event.preventDefault();
    await shutdownSystem();
    systemReady = false;
    app.quit();
  }
});

// Security handlers
app.on("web-contents-created", (event, contents) => {
  contents.on("new-window", (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});

app.on(
  "certificate-error",
  (event, webContents, url, error, certificate, callback) => {
    if (isDev) {
      event.preventDefault();
      callback(true);
    } else {
      callback(false);
    }
  }
);

// Progress window functions
function createProgressWindow() {
  progressWindow = new BrowserWindow({
    width: CONFIG.ui.progressWindow.width,
    height: CONFIG.ui.progressWindow.height,
    resizable: false,
    minimizable: true,
    maximizable: false,
    closable: true,
    alwaysOnTop: false,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  const progressHTML = `<!DOCTYPE html>
<html><head><style>
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; padding: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center; }
.logo { font-size: 28px; font-weight: bold; margin-bottom: 30px; }
.status { font-size: 16px; margin-bottom: 20px; min-height: 20px; }
.progress-bar { width: 100%; height: 8px; background: rgba(255,255,255,0.3); border-radius: 4px; overflow: hidden; margin-bottom: 20px; }
.progress-fill { height: 100%; background: white; border-radius: 4px; transition: width 0.3s ease; width: 0%; }
.details { font-size: 12px; opacity: 0.8; }
</style></head><body>
<div class="logo">Pointify Desktop</div>
<div class="status" id="status">Initializing...</div>
<div class="progress-bar"><div class="progress-fill" id="progress"></div></div>
<div class="details" id="details">Preparing your POS system</div>
<script>
const { ipcRenderer } = require("electron");
ipcRenderer.on("progress-update", (event, data) => {
document.getElementById("status").textContent = data.status;
document.getElementById("progress").style.width = data.progress + "%";
if (data.details) document.getElementById("details").textContent = data.details;
});
</script></body></html>`;

  progressWindow.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(progressHTML)}`
  );
  progressWindow.once("ready-to-show", () => {
    progressWindow.show();
    progressWindow.center();
  });
  progressWindow.setMenuBarVisibility(false);
}

function updateProgress(status, progress, details = "") {
  if (progressWindow && !progressWindow.isDestroyed()) {
    progressWindow.webContents.send("progress-update", {
      status,
      progress,
      details,
    });
  }
}

function closeProgressWindow() {
  debugLog(
    `📋 closeProgressWindow called. progressWindow exists: ${!!progressWindow}`
  );
  if (progressWindow && !progressWindow.isDestroyed()) {
    debugLog(`📋 progressWindow is not destroyed, calling close()`);
    progressWindow.close();
    progressWindow = null;
    debugLog(`📋 progressWindow closed and set to null`);
  } else {
    debugLog(`📋 progressWindow is null or destroyed`);
  }
}
