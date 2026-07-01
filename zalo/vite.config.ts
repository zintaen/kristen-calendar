import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(() => {
  return {
    root: "./src",
    base: "",
    plugins: [react()],
    resolve: {
      alias: {
        "@": "/src",
      },
    },
    build: {
      outDir: "../dist",
      emptyOutDir: true,
    },
  };
});
