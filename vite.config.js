import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { defineConfig } from "vite";

const DEFAULT_CONFIG = {
    base: process.env.basename ?? "./",
    build: {
        rolldownOptions: {
            input: {
                main: resolve(import.meta.dirname, "./index.html"),
            },
            output: {
                dir: resolve(import.meta.dirname, "./dist"),
            },
        },
    },
    server: {
        port: 9002,
    },
    css: {
        modules: {
            localsConvention: "camelCase",
        },
    },
    optimizeDeps: {
        // geotiff is only imported indirectly in vole-core workers, so vite will
        // exclude it unless it's explicitly included here.
        include: ["@aics/vole-core > geotiff"],
    },
    plugins: [react()],
};

export default defineConfig(DEFAULT_CONFIG);
