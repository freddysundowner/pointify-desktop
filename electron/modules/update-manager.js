// electron/modules/update-manager.js
// Handles application updates with user notifications

const fs = require("fs");
const path = require("path");
const { dialog, shell, BrowserWindow } = require("electron");

class UpdateManager {
  constructor() {
    this.config = this.loadConfig();
    this.currentVersion = this.config.app.version;
    this.updateCheckUrl = this.config.updates.checkUrl;
    this.downloadUrl = this.config.updates.downloadUrl;
    this.isChecking = false;
    this.updateWindow = null;
  }

  loadConfig() {
    try {
      const configPath = path.join(__dirname, "../config.json");
      const configData = fs.readFileSync(configPath, "utf8");
      return JSON.parse(configData);
    } catch (error) {
      console.error(
        "❌ Error loading config.json in UpdateManager:",
        error.message
      );
      throw new Error(
        "Config file is required. Please ensure electron/config.json exists."
      );
    }
  }

  async checkForUpdates(silent = false) {
    if (this.isChecking) {
      console.log("⏳ Update check already in progress");
      return;
    }

    this.isChecking = true;

    try {
      if (!silent) {
        console.log("🔍 Checking for updates...");
      }

      const updateInfo = await this.fetchUpdateInfo();

      if (!updateInfo) {
        if (!silent) {
          this.showNoUpdatesDialog();
        }
        return;
      }

      const hasUpdate =
        this.compareVersions(updateInfo.version, this.currentVersion) > 0;

      if (hasUpdate) {
        console.log(
          `📦 Update available: ${updateInfo.version} (current: ${this.currentVersion})`
        );
        await this.showUpdateAvailableDialog(updateInfo);
      } else {
        if (!silent) {
          this.showNoUpdatesDialog();
        }
      }
    } catch (error) {
      console.error("❌ Update check failed:", error.message);
      if (!silent) {
        this.showUpdateErrorDialog(error.message);
      }
    } finally {
      this.isChecking = false;
    }
  }

  async fetchUpdateInfo() {
    try {
      const response = await fetch(this.updateCheckUrl, {
        method: "GET",
        headers: {
          "User-Agent": `Pointify-Desktop/${this.currentVersion}`,
          "Content-Type": "application/json",
        },
        timeout: this.config.updates.timeout || 10000,
      });

      if (!response.ok) {
        throw new Error(`Update server responded with ${response.status}`);
      }

      const updateData = await response.json();
      return updateData;
    } catch (error) {
      console.error("❌ Failed to fetch update info:", error);
      return null;
    }
  }

  compareVersions(newVersion, currentVersion) {
    const parseVersion = (version) => {
      return version.split(".").map((num) => parseInt(num, 10));
    };

    const newVer = parseVersion(newVersion);
    const curVer = parseVersion(currentVersion);

    for (let i = 0; i < Math.max(newVer.length, curVer.length); i++) {
      const newNum = newVer[i] || 0;
      const curNum = curVer[i] || 0;

      if (newNum > curNum) return 1;
      if (newNum < curNum) return -1;
    }

    return 0;
  }

  async showUpdateAvailableDialog(updateInfo) {
    const options = {
      type: "info",
      buttons: ["Update Now", "Update Later", "View Release Notes"],
      defaultId: 0,
      title: "Update Available",
      message: `Pointify Desktop ${updateInfo.version} is available`,
      detail: `You are currently running version ${this.currentVersion}.\n\n${
        updateInfo.releaseNotes || "New features and improvements available."
      }`,
      icon: path.join(__dirname, "../assets/icon.png"),
    };

    const result = await dialog.showMessageBox(options);

    switch (result.response) {
      case 0: // Update Now
        await this.startUpdate(updateInfo);
        break;
      case 1: // Update Later
        this.scheduleReminderCheck();
        break;
      case 2: // View Release Notes
        if (updateInfo.releaseNotesUrl) {
          shell.openExternal(updateInfo.releaseNotesUrl);
        }
        // Show dialog again after viewing notes
        setTimeout(() => this.showUpdateAvailableDialog(updateInfo), 1000);
        break;
    }
  }

  async startUpdate(updateInfo) {
    try {
      this.createUpdateProgressWindow();

      const downloadUrl = updateInfo.downloadUrl || this.downloadUrl;
      const updateFile = await this.downloadUpdate(
        downloadUrl,
        updateInfo.version
      );

      if (updateFile) {
        await this.promptForInstallation(updateFile, updateInfo);
      }
    } catch (error) {
      console.error("❌ Update failed:", error);
      this.showUpdateErrorDialog(`Update failed: ${error.message}`);
      this.closeUpdateWindow();
    }
  }

  createUpdateProgressWindow() {
    this.updateWindow = new BrowserWindow({
      width: 450,
      height: 200,
      resizable: false,
      minimizable: false,
      maximizable: false,
      closable: false,
      alwaysOnTop: true,
      parent: BrowserWindow.getFocusedWindow(),
      modal: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    const progressHTML = `<!DOCTYPE html>
<html><head><style>
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; padding: 30px; background: #f5f5f5; text-align: center; }
.title { font-size: 18px; font-weight: bold; margin-bottom: 20px; color: #333; }
.status { font-size: 14px; margin-bottom: 15px; color: #666; }
.progress-bar { width: 100%; height: 6px; background: #e0e0e0; border-radius: 3px; overflow: hidden; margin-bottom: 15px; }
.progress-fill { height: 100%; background: #007AFF; border-radius: 3px; transition: width 0.3s ease; width: 0%; }
.details { font-size: 12px; color: #888; }
</style></head><body>
<div class="title">Downloading Update</div>
<div class="status" id="status">Preparing download...</div>
<div class="progress-bar"><div class="progress-fill" id="progress"></div></div>
<div class="details" id="details">Please wait while we download the latest version</div>
<script>
const { ipcRenderer } = require("electron");
ipcRenderer.on("update-progress", (event, data) => {
  document.getElementById("status").textContent = data.status;
  document.getElementById("progress").style.width = data.progress + "%";
  if (data.details) document.getElementById("details").textContent = data.details;
});
</script></body></html>`;

    this.updateWindow.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(progressHTML)}`
    );

    this.updateWindow.once("ready-to-show", () => {
      this.updateWindow.show();
      this.updateWindow.center();
    });

    this.updateWindow.setMenuBarVisibility(false);
  }

  async downloadUpdate(downloadUrl, version) {
    return new Promise((resolve, reject) => {
      const https = require("https");
      const { app } = require("electron");

      const fileName = `pointify-desktop-${version}-${process.platform}.${
        process.platform === "win32" ? "exe" : "dmg"
      }`;
      const downloadPath = path.join(app.getPath("downloads"), fileName);
      const file = fs.createWriteStream(downloadPath);

      this.updateProgress(
        "Connecting to server...",
        0,
        "Initializing download"
      );

      const request = https.get(downloadUrl, (response) => {
        if (response.statusCode !== 200) {
          reject(
            new Error(`Download failed with status: ${response.statusCode}`)
          );
          return;
        }

        const totalSize = parseInt(response.headers["content-length"] || 0);
        let downloadedSize = 0;

        response.on("data", (chunk) => {
          downloadedSize += chunk.length;
          if (totalSize > 0) {
            const progress = Math.round((downloadedSize / totalSize) * 100);
            const sizeMB = (downloadedSize / 1024 / 1024).toFixed(1);
            const totalMB = (totalSize / 1024 / 1024).toFixed(1);

            this.updateProgress(
              `Downloading... ${progress}%`,
              progress,
              `${sizeMB}MB / ${totalMB}MB downloaded`
            );
          }
        });

        response.pipe(file);

        file.on("finish", () => {
          file.close();
          this.updateProgress("Download complete!", 100, "Ready to install");
          setTimeout(() => resolve(downloadPath), 1000);
        });

        file.on("error", (err) => {
          fs.unlink(downloadPath, () => {});
          reject(err);
        });
      });

      request.on("error", (err) => {
        fs.unlink(downloadPath, () => {});
        reject(err);
      });

      request.setTimeout(this.config.updates.downloadTimeout || 300000, () => {
        request.destroy();
        fs.unlink(downloadPath, () => {});
        reject(new Error("Download timeout"));
      });
    });
  }

  updateProgress(status, progress, details = "") {
    if (this.updateWindow && !this.updateWindow.isDestroyed()) {
      this.updateWindow.webContents.send("update-progress", {
        status,
        progress,
        details,
      });
    }
  }

  async promptForInstallation(updateFile, updateInfo) {
    this.closeUpdateWindow();

    const options = {
      type: "question",
      buttons: ["Install Now & Restart", "Install Later"],
      defaultId: 0,
      title: "Update Ready",
      message: `Pointify Desktop ${updateInfo.version} has been downloaded`,
      detail:
        "The update is ready to install. The application will restart to complete the installation.",
      icon: path.join(__dirname, "../assets/icon.png"),
    };

    const result = await dialog.showMessageBox(options);

    if (result.response === 0) {
      // Install now
      this.installUpdate(updateFile);
    } else {
      // Install later - show file location
      const { shell } = require("electron");
      shell.showItemInFolder(updateFile);

      dialog.showMessageBox({
        type: "info",
        title: "Update Saved",
        message: "Update file saved to Downloads",
        detail:
          "You can install the update later by running the downloaded file.",
      });
    }
  }

  installUpdate(updateFile) {
    const { shell, app } = require("electron");

    try {
      // Open the installer
      shell.openPath(updateFile);

      // Give user time to see the installer opening
      setTimeout(() => {
        app.quit();
      }, 2000);
    } catch (error) {
      console.error("❌ Failed to open installer:", error);
      this.showUpdateErrorDialog(`Failed to open installer: ${error.message}`);
    }
  }

  closeUpdateWindow() {
    if (this.updateWindow && !this.updateWindow.isDestroyed()) {
      this.updateWindow.close();
      this.updateWindow = null;
    }
  }

  showNoUpdatesDialog() {
    dialog.showMessageBox({
      type: "info",
      title: "No Updates",
      message: "You are running the latest version",
      detail: `Pointify Desktop ${this.currentVersion} is up to date.`,
      buttons: ["OK"],
    });
  }

  showUpdateErrorDialog(message) {
    dialog.showErrorBox(
      "Update Error",
      `Failed to check for updates:\n\n${message}`
    );
  }

  scheduleReminderCheck() {
    const reminderDelay =
      this.config.updates.reminderDelay || 24 * 60 * 60 * 1000; // 24 hours
    setTimeout(() => {
      this.checkForUpdates(true); // Silent check
    }, reminderDelay);
  }

  // Start periodic update checks
  startPeriodicChecks() {
    if (!this.config.updates.autoCheck) {
      return;
    }

    const checkInterval =
      this.config.updates.checkInterval || 6 * 60 * 60 * 1000; // 6 hours

    // Initial check after startup delay
    setTimeout(() => {
      this.checkForUpdates(true);
    }, this.config.updates.startupDelay || 30000); // 30 seconds after startup

    // Periodic checks
    setInterval(() => {
      this.checkForUpdates(true);
    }, checkInterval);
  }

  // Manual update check (called from menu)
  async manualUpdateCheck() {
    await this.checkForUpdates(false); // Not silent - show results
  }
}

module.exports = { UpdateManager };
