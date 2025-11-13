module.exports = {
  apps: [
    {
      name: "frontend",
      cwd: "./",
      script: "npm",
      args: "run dev",
      watch: false,
      autorestart: true
    },
    {
      name: "backend",
      cwd: "./server",
      script: "npm",
      args: "run dev",
      watch: false,
      autorestart: true
    }
  ]
};

