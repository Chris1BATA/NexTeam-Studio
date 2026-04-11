import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const anthropicKey = env.ANTHROPIC_API_KEY || "";

  return {
    plugins: [react()],
    server: {
      port: process.env.PORT || 5173,
      host: "0.0.0.0",
      proxy: {
        "/api/anthropic": {
          target: "https://api.anthropic.com",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/anthropic/, ""),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              if (anthropicKey) {
                proxyReq.setHeader("x-api-key", anthropicKey);
                proxyReq.setHeader("anthropic-version", "2023-06-01");
              }
            });
          }
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
  };
});
