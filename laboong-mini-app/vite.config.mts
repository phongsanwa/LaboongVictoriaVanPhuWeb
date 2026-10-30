import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import zaloMiniApp from "zmp-vite-plugin";

// Build ra thư mục www/ — zmp deploy đẩy thư mục này lên Zalo.
export default defineConfig({
  base: "",
  plugins: [zaloMiniApp(), react()],
  server: { port: 3000 },
});
