# 构建流程

## 概览

```
root: pnpm build
  → tsdown (shared + core + database + desktop)
  → vite build (renderer)
  → cp renderer/dist/ → desktop/dist/client/
```

- **shared / core / database** — tsdown 构建为 ESM，输出到各自 `dist/` 目录
- **desktop** — tsdown 构建 `main.ts` + `preload.ts` 到 `desktop/dist/`
- **renderer** — vite 构建到 `packages/renderer/dist/`
- **copy renderer** — `packages/renderer/dist/` 的内容被拷贝到 `desktop/dist/client/`
  - 静态文件中间件从 `desktop/dist/client/` 提供前端资源
  - 生产环境下 `loadFile()` 指向 `dist/client/index.html`

## 命令

| 命令 | 位置 | 作用 |
|------|------|------|
| `pnpm build` | root | 完整构建所有包（libs → renderer → copy） |
| `pnpm build:libs` | root | 构建 shared / core / database / desktop |
| `pnpm build:renderer` | root | 仅构建 renderer |
| `pnpm dist` | desktop | 构建所有依赖 → electron-builder 打包 |
| `pnpm pack` | desktop | 构建所有依赖 → electron-builder --dir |

## 构建顺序

`desktop/dist/client/` 的渲染器文件是 **desktop 运行所依赖的**，因此 desktop 相关的命令 (`dist` / `pack`) 都通过 `pre` 钩子先构建 shared / core / database / renderer：

```
desktop: pnpm dist
  → predist:
      1. pnpm build:libs        (shared + core + database)
      2. pnpm build:renderer    (renderer → packages/renderer/dist/)
      3. cp → desktop/dist/client/
  → electron-builder
```

## 打包后的目录结构

```
app.asar/
  dist/
    main.mjs
    main.mjs.map
    preload.mjs
    preload.mjs.map
    client/                    ← renderer 的构建产物
      index.html
      assets/
        *.js
        *.css
      ...
resources/
drizzle/                     ← 数据库迁移文件（extraResources 打包到此处）
...

首次启动时，`resources/drizzle/` 自动复制到 `userData/.multi-op/drizzle/`（可写目录），drizzle migrator 在此处执行读写。

- **dev 模式**: `window.loadURL('http://localhost:4173')` 加载 vite 预览服务器
- **prod 模式**: `window.loadFile()` + 静态中间件从 `dist/client/` 提供服务

## 环境变量 (构建时注入)

通过 rolldown 的 `define` 在构建时注入，不会出现在运行时源码中：

| 变量 | 说明 |
|------|------|
| `import.meta.env.DEV`   | `true` / `false` |
| `import.meta.env.PROD`  | `true` / `false` |
| `import.meta.env.MODE`  | `'development'` / `'production'` |
