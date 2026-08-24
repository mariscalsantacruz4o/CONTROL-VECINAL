import { defineConfig } from "vite";

export default defineConfig({
  ssr: {
    noExternal: true,
  },
  build: {
    ssr: "worker/index.ts",
    outDir: "worker-dist",
    emptyOutDir: true,
    target: "es2022",
    rollupOptions: {
      output: {
        format: "es",
        entryFileNames: "index.js",
      },
    },
  },
});
