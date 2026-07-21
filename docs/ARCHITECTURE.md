# MultiOp — 架构文档

## 概述

MultiOp 是一个基于 Electron 的桌面多开器，支持同时打开多个平台账号（Telegram、WhatsApp、Twitter/X），并通过 Hook 系统和脚本系统添加扩展能力。

### 技术栈
- **Electron + TypeScript** — 桌面端
- **React + Vite** — 渲染进程 UI
- **pnpm + Turborepo** — Monorepo 构建
- **@libsql/client** — 数据存储（纯 WASM，无原生绑定）
- **Zod** — 全仓库运行时类型校验
- **自定义协议** — 跨进程通信（`multi-op://`）

---

## 一、多开方案

### WebContentsView 多窗口

每个平台账号创建独立的 `WebContentsView`，挂载到主 `BaseWindow` 的 `contentView` 上：

```
BaseWindow
├── WebContentsView (telegram_account1)  ← session partition: persist:telegram_acc1
├── WebContentsView (telegram_account2)  ← session partition: persist:telegram_acc2
├── WebContentsView (whatsapp_account1)  ← session partition: persist:whatsapp_acc1
└── ...
```

- 每个实例使用独立 session: `session.fromPartition("persist:${platform}_${accountId}")`
- `WebContentsView.setBounds()` 控制精确位置和大小
- 拖拽分割线调整布局，最小宽度保护

### 生命周期

```
creating → loading → intercepted → ready → active ↔ hidden → destroyed
```

- **hidden** 状态延迟 30s 后自动 `webContents.close()` 释放内存
- **show()** 时若已 destroy 则重新 `loadURL`
- `before-quit` 时保存布局快照、持久化、安全退出

---

## 二、通信方案 — 自定义协议

### 核心思路

参考 holix-ai 的 `createRouter()` 模式，注册自定义 scheme `multi-op://`，渲染进程通过标准 `fetch()` 和 `EventSource(SSE)` 与主进程通信。

**优点：** 不依赖 `ipcRenderer` / `contextBridge`，sandbox 和非 sandbox 环境在通信层面完全一致。

### 实现

```ts
// 主进程注册
protocol.registerSchemesAsPrivileged([
  { scheme: 'multi-op', privileges: { supportFetchAPI: true, stream: true } },
])

// Router 模式
const router = createRouter()
router.get('/api/views')
router.post('/api/views/:id/hide')
router.sse('/api/events')
```

```ts
// 渲染进程调用（preload 注入的 API，或页面直接 fetch）
await fetch('multi-op://api/views').then(r => r.json())
```

### 跨进程调用关系

```
主进程 (router)  ←── fetch/SSE ──→  WebContentsView (渲染进程)
        ↕
    LayoutManager / AccountManager / ScriptManager / Database
```

三端均可互相调用：
- 主进程 → 渲染进程：`executeJavaScript` + SSE push
- 渲染进程 → 主进程：`fetch()` 自定义协议
- 视图之间 → 通过注册的 Hook + Event 机制

---

## 三、脚本系统 — 三层模型

| 层级 | 注入方式 | 执行环境 | 职责 |
|------|----------|----------|------|
| **Layer 1** preload | `contextBridge` | Node (Isolated World) | 通信层 `__multiOp`, 暴露有限的 Node 能力 |
| **Layer 2** 拦截器 | `executeJavaScript(worldId: 0)` | Main World (页面之前) | API 拦截 fetch/XHR/WS/Notification |
| **Layer 3** 用户脚本 | `executeJavaScript(default world)` | Main World (页面之后) | 业务 Hook, 自动化操作 |

### Layer 1 — preload 通信层

```ts
// preload/src/index.ts
contextBridge.exposeInMainWorld('__multiOp', {
  call: (method, path, body?) => fetch(`multi-op://${path}`, { ... }).then(r => r.json()),
  get: (path) => ..., post: (path, body) => ...,
  hook: (event, config) => api.post('/api/hooks/register', { event, ...config }),
  onEvent: (event, callback) => {
    const es = new EventSource('multi-op://api/events')
    es.addEventListener(event, e => callback(JSON.parse(e.data)))
    return () => es.close()
  },
})
```

### Layer 2 — API 拦截器

在 `did-start-loading` 时注入，`worldId: 0` 确保在页面 JS 之前执行：

```ts
view.webContents.on('did-start-loading', () => {
  view.webContents.executeJavaScript(`
    (function() {
      // 拦截 fetch
      window.fetch = async function(input, init) { ... }
      // 拦截 Notification
      window.Notification = function(title, opts) { ... }
      // 隐藏自动化标记
      Object.defineProperty(navigator, 'webdriver', { get: () => false })
    })(); true;
  `, { worldId: 0 })
})
```

### Layer 3 — 用户 Hook 脚本

在 `did-finish-load` 后注入，支持热重载：

```ts
view.webContents.on('did-finish-load', () => {
  scriptManager.injectScripts(view, viewId, platform)
})
```

---

## 四、数据存储

### 技术选型

`@libsql/client` + `drizzle-orm`（替代 `better-sqlite3`）

原因：纯 JS/WASM 实现，无 `.node` 原生二进制，无需 `asar.unpacked`，跨平台打包无忧。

### 数据库表结构

```sql
-- 平台账号
accounts (id, platform, account_id, cookies, status, created_at, updated_at)
  UNIQUE(platform, account_id)

-- 用户脚本
scripts (id, name, version, code, enabled, priority, permissions, platforms, created_at, updated_at)

-- 布局快照
layout_snapshots (id, snapshot, created_at)

-- 通用 KV 存储
kv_store (key, value, view_id, script_id, updated_at)

-- 运行日志
logs (id, level, message, view_id, script_id, created_at)
```

### 使用模式

```ts
import { getDb, migrateDb } from '@multi-op/database'
import { ZAccountPayload } from '@multi-op/shared'

// 运行时校验
const account = ZAccountPayload.parse(rawData)
const db = getDb()
await db.execute({ sql: 'INSERT INTO accounts ...', args: [...] })
```

---

## 五、窗口管理方案

### LayoutManager

`packages/core/src/layout-manager.ts`

四种布局模式：

| 模式 | 描述 |
|------|------|
| `tile` | 水平平铺，每个 view 等宽 |
| `grid` | 网格排列，自动计算行列 |
| `stack` | 标签页模式，一次只显示一个 |
| `free` | 自由拖拽定位 |

### 拖拽分割线

- 分割线 DOM 在 MainWindow Renderer 中渲染
- mousedown → mousemove → mouseup 事件驱动
- 通过自定义协议通知主进程 `setBounds()`
- 最小宽度/高度保护

### 显示/隐藏

```
hide(id)     → setBounds(0,0,0,0) + setVisible(false)
                → 30s 后 destroy webContents (释放内存)
show(id)     → 恢复 bounds + 若 destroyed 则重新 loadURL
focus(id)    → removeChildView + addChildView (调整 z-order)
```

### 布局持久化

- `LayoutSnapshot` 通过 `layout_snapshots` 表持久化
- 启动时 restore，变化后自动保存
- 状态: `normal` / `minimized` / `hidden` / `maximized`

---

## 六、API 拦截方案

### 拦截时机

`did-start-loading` + `worldId: 0`（Main World）确保在页面 `<script>` 之前执行。

### 按平台配置

| 平台 | 拦截目标 |
|------|----------|
| Telegram | analytics, log API |
| WhatsApp | WebSocket, fetch |
| Twitter/X | fetch, navigator.webdriver |

### 补充手段

- `session.webRequest.onBeforeRequest` — HTTP 级别拦截（移除 CSP 限制等）
- `webContents.on('did-start-loading')` — 精确时机保障

### 拦截器不放在 preload 的原因

preload 在 Isolated World，无法直接修改页面 `window` 对象。`contextBridge` 只能暴露白名单 API。真正的拦截必须在 Main World 执行，因此必须用 `executeJavaScript(worldId: 0)`。

---

## 七、类型系统 — Zod

整个仓库统一使用 Zod 做运行时类型校验。

### 规范

- 每个类型有两个导出：`Z*`（zod schema）和 `*`（TypeScript type，由 `z.infer` 推导）
- 所有包引入 schema 使用 `.parse()` 进行运行时校验
- IPC 消息体有专用 Payload Schema

```ts
import { ZScriptManifest, type ScriptManifest } from '@multi-op/shared'

// 运行时校验
const script = ZScriptManifest.parse(rawData)

// 编译时类型
function run(s: ScriptManifest) { ... }
```

---

## 八、应用级生命周期

```
init → ready → running → stopping → stopped
```

- `before-quit` 时保存布局、注销路由、清理 view
- 应用退出前确保所有 WebContentsView 被销毁

---

## 九、项目结构

```
multi-op/
├── desktop/                       # Electron 入口
│   ├── package.json
│   ├── tsconfig.json
│   └── src/main.ts                # 主进程入口：协议注册 → DB → 窗口 → 恢复视图
├── docs/
│   └── ARCHITECTURE.md            # ← 本文档
├── packages/
│   ├── shared/                    # 公共类型 + Zod schema
│   ├── database/                  # 数据库（@libsql/client + drizzle-orm）
│   ├── core/                      # 核心模块
│   │   ├── router.ts              #   自定义协议路由
│   │   ├── layout-manager.ts      #   多窗口布局管理
│   │   ├── account-manager.ts     #   账号 CRUD
│   │   └── script-manager.ts      #   脚本编排 + 注入
│   ├── preload/                   # contextBridge 通信层
│   ├── renderer/                  # React + Vite 主界面
│   └── adapters/
│       ├── telegram/              # TG 平台适配器（拦截器 + Hook）
│       ├── whatsapp/              # WA 平台适配器
│       └── twitter/               # TW 平台适配器
├── package.json                   # pnpm workspace root
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.json
```

---

## 十、开发路线

### Phase 1: 基础设施 ✅
- [x] Monorepo 脚手架（pnpm + turbo）
- [x] 自定义协议 + Router
- [x] 数据库初始化 + migration
- [x] 类型系统（shared + Zod）
- [x] preload 通信层

### Phase 2: 多窗口 + 账号管理
- [ ] LayoutManager 完整实现（4 种布局模式）
- [ ] AccountManager CRUD + 会话持久化
- [ ] 布局拖拽分割线
- [ ] 显示/隐藏/延迟回收

### Phase 3: 脚本系统
- [ ] Hook 注册 + 编排引擎
- [ ] 脚本热重载文件监听
- [ ] SPA 导航拦截（Telegram Web hash 路由）

### Phase 4: 平台适配器
- [ ] Telegram 完整适配
- [ ] WhatsApp 完整适配
- [ ] Twitter/X 完整适配
- [ ] 反检测优化

### Phase 5: 打包与发布
- [ ] electron-builder 配置
- [ ] 自动更新
- [ ] 开发者插件市场
