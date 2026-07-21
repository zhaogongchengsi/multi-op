# MultiOp

![Electron](https://img.shields.io/badge/Electron-43-blue?logo=electron)
![TypeScript](https://img.shields.io/badge/TypeScript-7.0-blue?logo=typescript)
![pnpm](https://img.shields.io/badge/pnpm-10.14-orange?logo=pnpm)

> 基于 Electron 的桌面多开器 — 同时管理多个平台账号（Telegram / WhatsApp / Twitter），支持 Hook 和脚本扩展。

## 功能

- **多平台多开** — 在同一窗口内同时打开 Telegram、WhatsApp、Twitter 的多个账号
- **自定义协议通信** — 通过 `multi-op://` 自定义协议实现 sandbox 无关的 IPC
- **三层脚本系统** — preload 通信层 + API 拦截器 + 用户 Hook 脚本
- **窗口布局管理** — 平铺 / 网格 / 标签页 / 自由 四种布局模式
- **数据持久化** — 基于 `@libsql/client` 的本地数据库存储
- **Zod 类型校验** — 全仓库运行时类型安全

## 快速开始

```bash
# 克隆
git clone https://github.com/zhaogongchengsi/multi-op.git
cd multi-op

# 安装依赖
pnpm install

# 开发模式
pnpm dev:desktop
```

## 项目结构

```
multi-op/
├── desktop/           # Electron 入口
├── packages/
│   ├── shared/        # 公共类型 + Zod schema
│   ├── database/      # 数据库层
│   ├── core/          # 核心模块（Router / Layout / Account / Script）
│   ├── preload/       # preload 通信层
│   ├── renderer/      # React UI
│   └── adapters/      # 平台适配器（telegram / whatsapp / twitter）
└── docs/
    └── ARCHITECTURE.md
```

## 技术栈

| 类别 | 选型 |
|------|------|
| 框架 | Electron 43 + TypeScript 7 |
| 前端 | React 19 + Vite 8 |
| 通信 | 自定义协议 `multi-op://` (fetch/SSE) |
| 存储 | @libsql/client + drizzle-orm |
| 构建 | pnpm workspace + Turborepo |
| 校验 | Zod |

## License

MIT
