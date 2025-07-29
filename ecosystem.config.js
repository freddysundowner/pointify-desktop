// ecosystem.config.js
module.exports = {
    apps: [
      {
        name: "pointify-web",
        script: "server/dist/index.cjs",
        cwd: "/var/www/pointify/pos-web/web/",
        watch: false,
        env: {
          NODE_ENV: "production",
          PORT: 1999
        }
      }
    ]
  };
  