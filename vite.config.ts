import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // loadEnv is required so server.proxy sees .env values (process.env alone
  // does not pick up VITE_* from .env inside vite.config).
  const env = loadEnv(mode, process.cwd(), "");
  const frappeUrl = env.VITE_PROXY_TARGET || env.VITE_FRAPPE_URL || "http://localhost:8080";
  const frappeSite = env.VITE_FRAPPE_SITE || "frontend";

  const proxyOpts = {
    target: frappeUrl,
    changeOrigin: true,
    // Multi-tenant Frappe needs the site name as Host (or X-Frappe-Site-Name).
    headers: {
      Host: frappeSite,
      "X-Frappe-Site-Name": frappeSite,
    },
    // Rewrite Set-Cookie so the browser keeps cookies for localhost:5173.
    cookieDomainRewrite: "",
    secure: false,
  };

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 5173,
      // Proxy API / files / socket.io to ERPNext so the browser stays same-origin
      // (no CORS) and the Frappe session cookie works.
      proxy: {
        "/api": proxyOpts,
        "/files": proxyOpts,
        "/private": proxyOpts,
        "/assets": proxyOpts,
        "/socket.io": { ...proxyOpts, ws: true },
      },
    },
    build: {
      outDir: "dist",
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            "vendor-react": ["react", "react-dom", "react-router-dom"],
            "vendor-frappe": ["frappe-react-sdk", "swr", "axios"],
            "vendor-charts": ["recharts"],
          },
        },
      },
    },
  };
});
