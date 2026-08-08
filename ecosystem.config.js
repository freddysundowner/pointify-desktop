// ecosystem.config.js
// PM2 process configuration for the Pointify POS server.
// Used by setup-autostart.bat to register the server as a Windows startup service.
// __dirname resolves to wherever this file lives (e.g. C:\PointifyPOS\).
module.exports = {
  apps: [
    {
      name: "pointify-pos",
      script: "server/dist/index.cjs",
      cwd: __dirname,
      watch: false,
      // Restart up to 10 times if it crashes, then stop trying
      max_restarts: 10,
      // Wait 5 s before each restart so a bad boot loop doesn't spin hard
      restart_delay: 5000,
      env: {
        NODE_ENV: "production"
        // PORT and other secrets come from .env — PM2 reads it automatically
        // because dotenv is loaded inside server/dist/index.cjs
      }
    }
  ]
};
