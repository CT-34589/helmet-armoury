module.exports = {
  apps: [
    {
      name: "helmet-armoury",
      script: "node_modules/.bin/next",
      args: "start",
      instances: "max",
      exec_mode: "cluster",
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      // Restart if the app crashes, with exponential backoff
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: "10s",
    },
  ],
}
