import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import path from "node:path";

if (process.env.CI && process.env.COVEL_CATALOG_KIT) throw new Error("CI must build the pinned catalog kit");
const kit = process.env.COVEL_CATALOG_KIT ? path.resolve(process.env.COVEL_CATALOG_KIT) : fileURLToPath(new URL("./vendor/catalog-kit", import.meta.url));

export default defineConfig({
  root: "site",
  // Relative assets work on project Pages, custom domains and local previews.
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: { dedupe: ["react", "react-dom", "radix-ui"], alias: {
    "@covel/catalog-kit/ui/styles.css": path.join(kit, "ui/styles.css"),
    "@covel/catalog-kit/ui": path.join(kit, "ui/catalog-app.tsx"),
    "@": fileURLToPath(new URL("./site/src", import.meta.url)),
  } },
  build: { outDir: "../dist", emptyOutDir: true },
});
