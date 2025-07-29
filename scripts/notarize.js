const { notarize } = require("@electron/notarize");

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== "darwin") {
    return;
  }

  const appName = context.packager.appInfo.productFilename;

  return await notarize({
    tool: "notarytool",
    appBundleId: "com.pointify.desktop",
    appPath: `${appOutDir}/${appName}.app`,
    appleId: "reggycodas@gmail.com",
    appleIdPassword: "fmee-xyps-wret-lrci",
    teamId: "SVR4WTVPT3",
  });
};
