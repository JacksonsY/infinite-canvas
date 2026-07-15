import { lazy, Suspense } from "react";
import { createBrowserRouter, Outlet } from "react-router-dom";

import UserLayout from "@/layouts/user-layout";
import { pageLoaders } from "@/lib/route-prefetch";
import NotFound from "@/pages/not-found";

// 路由级代码分割：每个页面单独成 chunk，首屏只加载当前路由；画布编辑器（project ~186KB）等重页面
// 按需拉取。导入器与「悬停预取」共用同一个 import()（见 lib/route-prefetch）。EdgeOne 边缘并行分发。
const HomePage = lazy(pageLoaders["/"]);
const ImagePage = lazy(pageLoaders["/image"]);
const VideoPage = lazy(pageLoaders["/video"]);
const AssetsPage = lazy(pageLoaders["/assets"]);
const PromptsPage = lazy(pageLoaders["/prompts"]);
const CanvasPage = lazy(pageLoaders["/canvas"]);
const CanvasProjectPage = lazy(pageLoaders["/canvas-project"]);
const ConfigPage = lazy(pageLoaders["/config"]);

// 页面 chunk 加载期间的占位（仅替换内容区，顶栏/布局保持不动）。
function RouteFallback() {
    return (
        <div className="flex h-full min-h-[50vh] w-full items-center justify-center">
            <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
        </div>
    );
}

export const router = createBrowserRouter([
    {
        element: (
            <UserLayout>
                <Suspense fallback={<RouteFallback />}>
                    <Outlet />
                </Suspense>
            </UserLayout>
        ),
        children: [
            { path: "/", element: <HomePage /> },
            { path: "/image", element: <ImagePage /> },
            { path: "/video", element: <VideoPage /> },
            { path: "/assets", element: <AssetsPage /> },
            { path: "/prompts", element: <PromptsPage /> },
            { path: "/canvas", element: <CanvasPage /> },
            { path: "/canvas/:id", element: <CanvasProjectPage /> },
            { path: "/config", element: <ConfigPage /> },
        ],
    },
    { path: "*", element: <NotFound /> },
]);
