// import { defineConfig } from "vite";
// import react from "@vitejs/plugin-react";

// // @ts-expect-error process is a nodejs global
// const host = process.env.TAURI_DEV_HOST;

// // https://vite.dev/config/
// export default defineConfig(async () => ({
//   plugins: [react()],

//   // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
//   //
//   // 1. prevent Vite from obscuring rust errors
//   clearScreen: false,
//   // 2. tauri expects a fixed port, fail if that port is not available
//   server: {
//     port: 1420,
//     strictPort: true,
//     host: host || false,
//     hmr: host
//       ? {
//           protocol: "ws",
//           host,
//           port: 1421,
//         }
//       : undefined,
//     watch: {
//       // 3. tell Vite to ignore watching `src-tauri`
//       ignored: ["**/src-tauri/**"],
//     },
//   },
// }));

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  // 💥 THE FIX: Add the 'base' property
  // Setting base to '' (empty string) forces Vite to use relative paths (./)
  // for all assets, which is required when serving the app from the
  // local file system within the Tauri bundle.
  base: '', 

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));