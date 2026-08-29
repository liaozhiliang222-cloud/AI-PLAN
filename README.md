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

## 部署

部署目标为 **Cloudflare Workers**（OpenNext），配置见 `wrangler.jsonc`。早期曾使用 Netlify，其 `netlify.toml` 已移除，勿再新增。

```bash
npm run preview      # opennextjs-cloudflare build + 本地 preview
npm run deploy       # 应用数据库迁移 + 构建 + 部署到 Cloudflare
npm run upload       # 仅上传产物
```

- 生产域名：`https://aiplan.surveykit.cc`，在 Cloudflare 侧绑定自定义域名。
- 域名唯一真源是 `src/lib/config.ts` 的 `SITE.url`，sitemap / robots / OG / canonical 全部读取它，改域名只改这一处。`.env` 里的 `NEXT_PUBLIC_SITE_URL` 代码并不读取，仅作备忘。
- 密钥（`DATABASE_URL`、`ARTIFICIAL_ANALYSIS_API_KEY`、`ADMIN_PASSWORD` 等）通过 Cloudflare secret 注入，不要写入 `wrangler.jsonc`。

> **Windows 构建踩坑**：OpenNext 构建会清空 `.open-next` 与 `.next`（数千个文件）。若终端环境通过 `NODE_OPTIONS=--require <safe-delete-shim>` 注入了删除保护钩子，构建会因「批量删除需确认」或「回收站操作失败」而中断。构建前把该 require 去掉、只保留系统 CA 即可：
>
> ```bash
> export NODE_OPTIONS="--use-system-ca"
> npm run deploy
> ```
>
> 这两个目录都是 `.gitignore` 中的构建产物，可安全重建。

## 数据库

使用 PostgreSQL（Supabase / Neon 等），迁移由 Prisma Migrate 管理（`prisma/migrations/`）。改动 schema 后执行 `npm run db:migrate` 生成迁移。

- 运行时从 `DATABASE_URL` 解析连接信息并使用数据库主机名做 DNS/TLS；不要把托管数据库域名固定到某个 IP，数据库故障转移后该 IP 可能失效。
- Cloudflare Worker 的 `DATABASE_URL` 应使用 Supabase Transaction Pool（端口 `6543`）；`DIRECT_URL` 仅用于 Prisma Migrate 等管理任务。运行时数据库客户端按单次操作创建和释放，避免跨 Worker 请求复用 socket。
- 公共页面仅对可识别的瞬时 PostgreSQL/Prisma 连接错误降级；只读查询最多使用新连接重试一次，写操作绝不自动重放。日志使用 `public_database_degraded` 事件名，便于在 Workers Observability 中筛选。
- 生产主域名在 `src/lib/config.ts` 的 `SITE.url` 中统一配置，避免 `NEXT_PUBLIC_*` 在 Next 构建期被本地 `.env` 的旧值内联。
- Cloudflare Hyperdrive 是后续推荐的生产连接方式。启用它需要先在 Cloudflare 账户创建 Hyperdrive 配置、取得真实 binding ID，再将 binding 的 `connectionString` 接入数据库客户端；这属于外部资源变更，本仓库不会自动创建或部署。当前 `pg` 版本已满足 Hyperdrive `>=8.16.3` 的要求。
- `DATABASE_URL` 必须通过本地 `.env` 或 Cloudflare secret 提供，不要放入 `wrangler.jsonc` 或提交到 Git。

本地开发切换到 SQLite 只需把 `prisma/schema.prisma` 的 provider 改回 `sqlite`，并把 `DATABASE_URL` 改为 `file:./dev.db`。

## 数据说明

当前为 MVP 演示：价格、额度、评分为示例数据（后台可编辑）。前台与页脚均已标注。数据流水线已预留：SourceMonitor 定时抓取 → Content Hash 变化入审核队列 → 规则解析草稿（`src/services/extract.ts`，未来替换为 LLM Extraction）→ 管理员确认入库。

### Seed 与套餐可见性

`node prisma/seed.mjs` 会**清空并重建** Providers / Models / Plans / ChangeLogs / PricePoints，其中模型表会被重写为 seed 内置的 15 条，Artificial Analysis 同步进来的模型（约 600+ 条）会一并被删除。生产环境执行前请确认。

如需恢复 AA 模型数据，seed 之后执行：

```bash
npm run db:sync-models
```

### 增量更新（生产推荐）

`seed` 会 `deleteMany` 清空 Model 表，把 AA 同步来的 600+ 模型一并删除。只更新套餐或行情时，改用增量脚本，不触碰 Model 表：

```bash
npm run db:upsert-plans      # 套餐：按 slug upsert，自动同步 PlanModel 关联
npm run db:upsert-changes    # 行情：清理失效记录 + 补入已核实的变化
```

两个脚本的数据源都是 `prisma/seed.mjs`，因此 seed 仍是唯一真源；脚本只是把它「增量应用」到生产库，避免重建整个库。加 `--dry` 可先预览改动。

套餐的 `status` 由 seed 按以下规则自动判定，与后台发布逻辑一致：

- 所属 Provider 有 `website` → `officialUrl` 取该网址，`status = published`，前台 `/plans` 立即可见
- 所属 Provider 无 `website` → `officialUrl = null`，`status = draft`，前台不可见（后台补齐官方来源后才可发布）

当前 seed 的 11 个 Provider 均带 `website`，因此 15 个套餐默认全部 `published`。seed 结束时会在日志输出「前台可见套餐（published）= N / 15」，若 N 小于总数，说明有 Provider 缺 `website`，需补齐后再 seed。
