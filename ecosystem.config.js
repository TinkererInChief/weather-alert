module.exports = {
  apps: [
    {
      name: 'nextjs',
      script: 'pnpm',
      args: 'dev',
      cwd: '/Users/yash/weather-alert',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        TZ: 'UTC'
      },
      error_file: './logs/nextjs-error.log',
      out_file: './logs/nextjs-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'ais-streaming',
      script: 'pnpm',
      args: 'ais:start',
      cwd: '/Users/yash/weather-alert',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        TZ: 'UTC'
      },
      error_file: './logs/ais-error.log',
      out_file: './logs/ais-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '30s'
    },
    {
      name: 'stats-updater',
      script: 'pnpm',
      args: 'stats:update',
      cwd: '/Users/yash/weather-alert',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production',
        TZ: 'UTC'
      },
      error_file: './logs/stats-error.log',
      out_file: './logs/stats-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
}
