// 页面动态导入器 + 路由预取。独立模块，供 router（React.lazy 代码分割）与导航布局（悬停预取）
// 共同引用，避免 router ↔ 布局 的循环依赖。

export const pageLoaders = {
    "/": () => import("@/pages/home"),
    "/image": () => import("@/pages/image"),
    "/video": () => import("@/pages/video"),
    "/assets": () => import("@/pages/assets"),
    "/prompts": () => import("@/pages/prompts"),
    "/canvas": () => import("@/pages/canvas"),
    "/canvas-project": () => import("@/pages/canvas/project"),
    "/config": () => import("@/pages/config"),
} as const;

// 路由预取：悬停/聚焦导航项时提前加载对应页面 chunk，点击即秒开（import() 自带去重，不会重复请求）。
// 按顶层路由归一（如 /canvas/:id → /canvas）。
export function prefetchRoute(path: string) {
    const segs = path.split("/").filter(Boolean);
    // /canvas/:id 打开的是画布编辑器（最重的 chunk），而非画布列表；悬停画布卡片时提前拉编辑器。
    if (segs[0] === "canvas" && segs.length > 1) {
        void pageLoaders["/canvas-project"]();
        return;
    }
    const loader = pageLoaders[("/" + (segs[0] ?? "")) as keyof typeof pageLoaders];
    if (loader) void loader();
}
