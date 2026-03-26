import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: process.env.PORT || 5173,
    host: "0.0.0.0",
    proxy: {
      "/api/anthropic": {
        target: "https://api.anthropic.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/anthropic/, "")
      },
      "/elevenlabs": {
        target: "https://api.elevenlabs.io",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/elevenlabs/, "")
      }
    }
  },
  preview: {
    port: process.env.PORT || 4173,
    host: "0.0.0.0",
    allowedHosts: ["all"]
  }
});
