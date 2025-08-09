/**
 * PM2 конфігурація для оптимізованого бота
 */

module.exports = {
  apps: [
    {
      name: 'was-contract-bot-v2',
      script: 'bot-optimized.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        LOG_LEVEL: 'info'
      },
      env_production: {
        NODE_ENV: 'production',
        LOG_LEVEL: 'info'
      },
      env_development: {
        NODE_ENV: 'development',
        LOG_LEVEL: 'debug'
      },
      // Логування
      log_file: './logs/pm2-combined.log',
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Restart policy
      min_uptime: '10s',
      max_restarts: 5,
      
      // Graceful shutdown
      kill_timeout: 5000,
      
      // Health monitoring
      health_check_grace_period: 3000,
      health_check_interval: 30000
    },
    
    // Backup старої версії (опціонально)
    {
      name: 'was-contract-bot-v1-backup',
      script: 'bot.js',
      instances: 1,
      autorestart: false,  // Вимкнено за замовчуванням
      watch: false,
      env: {
        NODE_ENV: 'production',
        LOG_LEVEL: 'warn'
      }
    }
  ]
};