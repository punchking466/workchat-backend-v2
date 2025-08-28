module.exports = {
  apps: [
    {
      name: 'workchat',
      script: 'dist/src/main.js',
      instances: '1',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'local',
      },
      env_dev: {
        NODE_ENV: 'dev',
      },
      env_prod: {
        NODE_ENV: 'prod',
      },
    },
  ],
};
