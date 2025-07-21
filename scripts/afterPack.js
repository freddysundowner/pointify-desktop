// scripts/afterPack.js
// This script runs after packaging to fix file permissions

const fs = require("fs");
const path = require("path");

exports.default = async function afterPack(context) {
  console.log("🔧 Running afterPack script...");

  const { appOutDir, packager } = context;
  const platform = packager.platform.name;

  if (platform === "mac") {
    const appPath = path.join(
      appOutDir,
      `${packager.appInfo.productFilename}.app`
    );
    const unpackedPath = path.join(
      appPath,
      "Contents",
      "Resources",
      "app.asar.unpacked"
    );
    const serverPath = path.join(unpackedPath, "server", "dist");

    console.log(`📁 Looking for server files in: ${serverPath}`);

    if (fs.existsSync(serverPath)) {
      // Fix permissions for all files in server directory
      const fixPermissions = (dir) => {
        const items = fs.readdirSync(dir);
        items.forEach((item) => {
          const itemPath = path.join(dir, item);
          const stats = fs.statSync(itemPath);

          if (stats.isDirectory()) {
            fixPermissions(itemPath);
          } else if (stats.isFile()) {
            try {
              // Make all server files executable
              fs.chmodSync(itemPath, 0o755);
              console.log(`✅ Fixed permissions for: ${item}`);
            } catch (error) {
              console.log(
                `⚠️ Could not fix permissions for ${item}: ${error.message}`
              );
            }
          }
        });
      };

      fixPermissions(serverPath);
      console.log("✅ Server file permissions fixed");
    } else {
      console.log("⚠️ Server path not found, skipping permission fixes");
    }

    // Also fix any other executable files in unpacked directory
    if (fs.existsSync(unpackedPath)) {
      const findExecutables = (dir, depth = 0) => {
        if (depth > 3) return; // Prevent infinite recursion

        try {
          const items = fs.readdirSync(dir);
          items.forEach((item) => {
            const itemPath = path.join(dir, item);
            const stats = fs.statSync(itemPath);

            if (stats.isDirectory()) {
              findExecutables(itemPath, depth + 1);
            } else if (stats.isFile()) {
              // Check if file should be executable (common patterns)
              if (
                item.includes("api") ||
                item.includes("server") ||
                item.includes("bin") ||
                item.endsWith(".node") ||
                path.extname(item) === ".cjs"
              ) {
                try {
                  fs.chmodSync(itemPath, 0o755);
                  console.log(`✅ Made executable: ${item}`);
                } catch (error) {
                  console.log(
                    `⚠️ Could not make executable ${item}: ${error.message}`
                  );
                }
              }
            }
          });
        } catch (error) {
          console.log(
            `⚠️ Could not process directory ${dir}: ${error.message}`
          );
        }
      };

      findExecutables(unpackedPath);
    }
  } else if (platform === "win") {
    console.log("📦 Windows packaging - no permission fixes needed");
  } else if (platform === "linux") {
    console.log("🐧 Linux packaging - applying permission fixes...");
    // Similar logic for Linux if needed
  }

  console.log("✅ afterPack script completed");
};
