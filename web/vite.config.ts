import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

import { parseChangelog } from "./src/lib/release";

const webDir = dirname(fileURLToPath(import.meta.url));
const localVersion = readFileSync(resolve(webDir, "../VERSION"), "utf8").trim() || "dev";
const localChangelog = readFileSync(resolve(webDir, "../CHANGELOG.md"), "utf8");

// 暴露 /plugins/index.json:列出 public/plugins 下的本地插件文件,
// 供前端自动发现并加入插件列表(默认关闭)。dev 下实时读目录,构建时产出静态清单。
function localPluginsManifest(): Plugin {
    const pluginsDir = resolve(webDir, "public/plugins");
    const listLocalPlugins = () => {
        try {
            return readdirSync(pluginsDir)
                .filter((file) => file.endsWith(".js"))
                .sort()
                .map((file) => `/plugins/${file}`);
        } catch {
            return [];
        }
    };
    return {
        name: "local-plugins-manifest",
        configureServer(server) {
            server.middlewares.use("/plugins/index.json", (_req, res) => {
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(listLocalPlugins()));
            });
        },
        generateBundle() {
            this.emitFile({ type: "asset", fileName: "plugins/index.json", source: JSON.stringify(listLocalPlugins()) });
        },
    };
}

export default defineConfig({
    base: process.env.VITE_BASE || "/",
    plugins: [react(), localPluginsManifest()],
    resolve: {
        alias: {
            "@": resolve(webDir, "src"),
        },
    },
    define: {
        __APP_VERSION__: JSON.stringify(localVersion),
        __APP_RELEASES__: JSON.stringify(parseChangelog(localChangelog)),
    },
    build: {
        // 分包：把大而稳定的第三方库拆成独立 chunk —— 跨部署长期缓存 + 并行下载，
        // 业务代码变更不会让 antd/react 等重库的缓存失效。配合路由级懒加载，首屏更小。
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (!id.includes("node_modules")) return;
                    // 只把最大的 antd 生态拆成独立块（它只被应用代码引用、不被其它第三方反向依赖，无环）；
                    // react 与其余第三方统一进 vendor —— 避免 react-router 依赖链绕回 catch-all 形成循环块。
                    if (id.includes("/antd/") || id.includes("/@ant-design/") || id.includes("/rc-") || id.includes("/@rc-component/")) return "antd-vendor";
                    if (id.includes("/@codemirror/") || id.includes("/codemirror") || id.includes("/@uiw/")) return "codemirror-vendor";
                    return "vendor";
                },
            },
        },
    },
});
