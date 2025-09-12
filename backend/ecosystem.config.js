/**
 * @description pm2 configuration file.
 * @example
 *  production mode :: pm2 start ecosystem.config.js
 */
module.exports = {
  apps: [
    {
      name: 'ontheform', // pm2 start App name
      script: './src/server.js',
      exec_mode: 'fork', // 'cluster' or 'fork'
      instance_var: 'INSTANCE_ID', // instance variable
      instances: 1, // pm2 instance count
      autorestart: true, // auto restart if process crash
      watch: false, // files change automatic restart
      ignore_watch: ['node_modules'], // ignore files change
      max_memory_restart: '1G', // restart if process use more than 1G memory
    },
  ],
};
