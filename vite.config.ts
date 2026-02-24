import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ["react", "react-dom", "react/jsx-runtime"],
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
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
          "query-vendor": ["@tanstack/react-query"],
          "dnd-vendor": ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities"],
          "recharts": ["recharts"],
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
