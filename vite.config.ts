import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "wouter",
      "@tanstack/react-query",
    ],
  },
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react-dom") || id.includes("node_modules/react/")) {
            return "react-vendor";
          }
          if (id.includes("@tanstack/react-query")) return "query-vendor";
          if (id.includes("livekit") || id.includes("@livekit")) return "livekit";
          if (id.includes("framer-motion") || id.includes("/motion/")) return "motion";
          if (id.includes("recharts")) return "recharts";
          if (id.includes("@dnd-kit")) return "dnd-vendor";
          if (id.includes("react-easy-crop")) return "cropper";
        },
      },
    },
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    // Sin proxy: Express sirve /api en el mismo proceso (npm run dev). Si usas Vite standalone, las peticiones /api fallarían.
    proxy: undefined,
  },
});
