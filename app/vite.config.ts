import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'plugin-inspect-react-code'

// https://vite.dev/config/
// 部署为子路径站点（wanxiayushaonian.github.io/mansheng/），本地 dev/preview 同样挂在该前缀下
export default defineConfig({
  base: process.env.BASE_PATH ?? '/mansheng/',
  plugins: [inspectAttr(), react()],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
