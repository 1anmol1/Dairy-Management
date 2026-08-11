module.exports = {
  apps: [
    {
      name: 'dairymanagement-backend',
      script: './server.js',
      instances: 'max', // Scale across all available CPU cores for multi-user performance
      exec_mode: 'cluster', // Enables clustering mode
      watch: false, // Don't watch files in production
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 5000,
      },
      max_memory_restart: '1G', // Restart if memory exceeds 1GB
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      merge_logs: true,
      time: true
    }
  ]
};
