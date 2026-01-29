module.exports = {
  apps: [
    {
      name: 'wa',
      script: './src/server.js', // 👈 importante el "./"
      instances: 1, // o 'max' si quieres usar todos los núcleos
      exec_mode: 'fork', // 'cluster' si necesitas múltiples instancias
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 8001,
        DATABASE_URL: 'mysql://internet:internet@localhost:3306/wa_sessions',
        PRISMA_CLIENT_ENGINE_TYPE: 'binary',
      },
      out_file: './logs/out.log',   // logs estándar
      error_file: './logs/error.log', // logs de error
      merge_logs: true,
      time: true, // agrega timestamp a los logs
    },
  ],
};
