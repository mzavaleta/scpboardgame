import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // No router (§S7.1), so no SPA fallback is needed and the build is a plain
  // static bundle — which also keeps the GitHub Pages caveat out of the project.
  build: { outDir: "dist", sourcemap: true },
});
