import { lazy, Suspense } from "react";
import { createBrowserRouter, Outlet } from "react-router-dom";

import UserLayout from "@/layouts/user-layout";
import NotFound from "@/pages/not-found";

// 路由级代码分割：每个页面单独成 chunk，首屏只加载当前路由，其余按需拉取。
// 画布编辑器（canvas/project）等重页面不再拖慢首屏；EdgeOne 边缘并行分发这些 chunk。
const HomePage = lazy(() => import("@/pages/home"));
const ImagePage = lazy(() => import("@/pages/image"));
const VideoPage = lazy(() => import("@/pages/video"));
const AssetsPage = lazy(() => import("@/pages/assets"));
const PromptsPage = lazy(() => import("@/pages/prompts"));
const CanvasPage = lazy(() => import("@/pages/canvas"));
const CanvasProjectPage = lazy(() => import("@/pages/canvas/project"));
const ConfigPage = lazy(() => import("@/pages/config"));

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
