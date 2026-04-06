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
        UPLOAD_DIR: "/var/data/helmet-armoury/uploads/helmets",
        UPLOAD_PUBLIC_PREFIX: "/uploads/helmets",
        REDIS_URL: "redis://localhost:6379",
        NEXT_PUBLIC_VAPID_PUBLIC_KEY: "BLkGbDfL8d2kzLYeAsUasUS5YyYS09r_d16EipqKMkHcGEfsxNSMW9dezM19Zo9FoWNZjnput8MZpp1baXMapqs",
        VAPID_PRIVATE_KEY: "OD4Vwmwpr_yvLhfgqftpAqYi5LK_OwRzA6jqi9dbNis",
        VAPID_SUBJECT: "mailto:noreply@104thbattalionmilsim.com",
      },
      // Restart if the app crashes, with exponential backoff
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: "10s",
    },
  ],
}
