import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig(({ mode }) => {
  const projectRoot = resolve(__dirname, "..");
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    publicDir: resolve(projectRoot, "public"),
    resolve: {
      alias: {
        "@": projectRoot,
        "react": resolve(__dirname, "node_modules/react"),
        "react-dom": resolve(__dirname, "node_modules/react-dom"),
      },
    },
    define: {
      "process.env.NEXT_PUBLIC_SPRING_API_URL": JSON.stringify(
        env.VITE_SPRING_API_URL || env.NEXT_PUBLIC_SPRING_API_URL || "http://localhost:8080",
      ),
      "process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID": JSON.stringify(
        env.VITE_NAVER_MAP_CLIENT_ID ||
          env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID ||
          "",
      ),
    },
    server: {
      fs: { allow: [projectRoot] },
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
    },
  };
});
