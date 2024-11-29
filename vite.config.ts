import { resolve } from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(require("./package.json").version),
  },
  plugins: [dts({ rollupTypes: true })],
  build: {
    emptyOutDir: true,
    lib: {
      entry: {
        index: resolve(__dirname, "src/ObservableWorker.ts"),
        worker: resolve(__dirname, "src/worker.ts"),
      },
      formats: ["es"],
      fileName: (_, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: ["rxjs"],
      output: {
        globals: {
          rxjs: "rxjs",
        },
      },
    },
  },
});
