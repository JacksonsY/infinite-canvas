import { copyFileSync, existsSync, readdirSync, readFileSync } from "node:fs";
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

// 生成 404.html（内容 = index.html）：静态托管（EdgeOne / GitHub Pages 等）在找不到路由对应文件时
// 回退到 404.html，从而无需贪吃的 /* rewrite —— 那会把 /assets/*.js 也重写成 HTML、导致模块加载 MIME 报错。
// 真实静态资源仍按文件正常返回，只有未命中的前端路由才落到 404.html（= index.html），交给 React Router。
function spa404Fallback(): Plugin {
    return {
        name: "spa-404-fallback",
        closeBundle() {
            const index = resolve(webDir, "dist/index.html");
            if (existsSync(index)) copyFileSync(index, resolve(webDir, "dist/404.html"));
        },
    };
}

export default defineConfig({
    base: process.env.VITE_BASE || "/",
    plugins: [react(), localPluginsManifest(), spa404Fallback()],
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
