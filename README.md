# AI Plan Radar

> 选模型、比套餐、看行情。AI Coding Plan 比价与选型工具（PWA MVP）。

## 快速开始

```bash
npm install
npm run db:migrate         # 应用数据库迁移（prisma migrate dev，含基线）
node prisma/seed.mjs        # 写入 Demo 数据（或 npm run db:seed）
npm run dev                 # 开发模式
# 或
npm run build && npm start  # 生产模式，默认 3000 端口

npm test                    # 单元测试（vitest）
npm run lint                # ESLint
npm run format              # Prettier 格式化
```

- 前台：`http://localhost:3000`
- 后台：`http://localhost:3000/admin`（口令见 `.env` 的 `ADMIN_PASSWORD`；生产环境务必改为强口令）
- 定时采样：`GET /api/cron?token=<TOKEN>[&sources=1]`，供外部调度器每日调用

### 安全说明

- `.env` 已被 `.gitignore` 排除，请勿提交真实密钥；模板见 `.env.example`。
- 后台登录令牌与 Cron 令牌均为 `sha256("apr-admin:" + ADMIN_PASSWORD)` 的十六进制，不再明文传输口令。
  - 例如默认口令 `demo1234` 对应令牌 `083807de94943c556518239117a93d46bca9bf66877067179bcef29f33b0fc6f`。
  - 计算方式：`node -e "console.log(require('crypto').createHash('sha256').update('apr-admin:'+process.env.ADMIN_PASSWORD).digest('hex'))"`
- 后台写操作已加 CSRF Origin 校验；登录已加内存级速率限制（10 分钟 5 次失败）。

## 技术栈

Next.js 15 · TypeScript strict · Tailwind CSS v4 · Prisma · Lucide Icons；图表为自绘 SVG（零依赖）。

## 数据库

使用 PostgreSQL（Supabase / Neon 等），迁移由 Prisma Migrate 管理（`prisma/migrations/`）。改动 schema 后执行 `npm run db:migrate` 生成迁移。

本地开发切换到 SQLite 只需把 `prisma/schema.prisma` 的 provider 改回 `sqlite`，并把 `DATABASE_URL` 改为 `file:./dev.db`。

## 数据说明

当前为 MVP 演示：价格、额度、评分为示例数据（后台可编辑）。前台与页脚均已标注。数据流水线已预留：SourceMonitor 定时抓取 → Content Hash 变化入审核队列 → 规则解析草稿（`src/services/extract.ts`，未来替换为 LLM Extraction）→ 管理员确认入库。
