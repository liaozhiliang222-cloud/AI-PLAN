/* AI Plan Radar Demo Seed —— MVP 示例数据（2026-08），价格/评分为演示值，后台可编辑 */
import pkg from "@prisma/client";
const { PrismaClient } = pkg;

const db = new PrismaClient();
const J = JSON.stringify;

// ---------- Providers ----------
// 价格基准：2026-08 各厂商官方页面；USD->CNY 按 1:7.2 折算，仅用于同表比较
const providers = [
  { name: "Moonshot AI", slug: "moonshot", country: "domestic", logoColor: "#0F172A", website: "https://www.moonshot.cn", officialSource: "https://platform.moonshot.cn/docs/pricing/chat" },
  { name: "智谱 AI", slug: "zhipu", country: "domestic", logoColor: "#2563EB", website: "https://bigmodel.cn", officialSource: "https://bigmodel.cn/glm-coding" },
  { name: "MiniMax", slug: "minimax", country: "domestic", logoColor: "#DB2777", website: "https://www.minimaxi.com" },
  { name: "DeepSeek", slug: "deepseek", country: "domestic", logoColor: "#4D6BFE", website: "https://www.deepseek.com" },
  { name: "火山方舟", slug: "volcengine", country: "domestic", logoColor: "#EA580C", website: "https://www.volcengine.com/product/ark" },
  // slug 与 scripts/sync-models.mjs 的 providerMap 保持一致（alibaba 等），
  // 否则 AA 同步会再建一套同名 provider，导致套餐与模型挂在不同 provider 下
  { name: "阿里云百炼", slug: "alibaba", country: "domestic", logoColor: "#FF6A00", website: "https://bailian.console.aliyun.com" },
  { name: "小米 MiMo", slug: "xiaomi", country: "domestic", logoColor: "#FF6900", website: "https://mimo.xiaomi.com" },
  { name: "Anthropic", slug: "anthropic", country: "overseas", logoColor: "#C2410C", website: "https://www.anthropic.com", officialSource: "https://www.anthropic.com/pricing" },
  { name: "OpenAI", slug: "openai", country: "overseas", logoColor: "#111827", website: "https://openai.com" },
  { name: "Cursor", slug: "cursor", country: "overseas", logoColor: "#334155", website: "https://cursor.com/pricing" },
  { name: "GitHub", slug: "github", country: "overseas", logoColor: "#6B21A8", website: "https://github.com/features/copilot" },
  { name: "Google", slug: "google", country: "overseas", logoColor: "#2563EB", website: "https://ai.google.dev" },
  { name: "字节 Trae", slug: "trae", country: "domestic", logoColor: "#000000", website: "https://www.trae.com.cn", officialSource: "https://www.trae.com.cn/pricing" },
  { name: "百度文心快码", slug: "baidu", country: "domestic", logoColor: "#2932E1", website: "https://comate.baidu.com", officialSource: "https://comate.baidu.com" },
  { name: "腾讯云 CodeBuddy", slug: "tencent", country: "domestic", logoColor: "#0052D9", website: "https://codebuddy.cn", officialSource: "https://codebuddy.cn/docs/workbuddy/Pricing" },
  { name: "Windsurf", slug: "windsurf", country: "overseas", logoColor: "#0EA5E9", website: "https://windsurf.com", officialSource: "https://windsurf.com/pricing" },
  { name: "Cognition", slug: "cognition", country: "overseas", logoColor: "#111827", website: "https://devin.ai", officialSource: "https://devin.ai/pricing" },
  { name: "Replit", slug: "replit", country: "overseas", logoColor: "#F26207", website: "https://replit.com", officialSource: "https://replit.com/pricing" },
  { name: "Zed", slug: "zed", country: "overseas", logoColor: "#1E1E1E", website: "https://zed.dev", officialSource: "https://zed.dev/pricing" },
  { name: "Cline", slug: "cline", country: "overseas", logoColor: "#2563EB", website: "https://cline.bot", officialSource: "https://cline.bot" },

];

// ---------- Models: [providerSlug,name,slug,ctxK,inP,outP,release,[overall,coding,agent,frontend,backend,debug,longCtx,speed,cost],strengths[],weaknesses[],recScenarios[],trend]
const models = [
  ["moonshot","Kimi K3","kimi-k3",256,14,56,"2026-08-25",[92,93,94,90,93,91,96,88,95],["Agent Coding 与工具调用稳定，长链路不易丢步","256K 长上下文任务表现出色","国内直连快、价格友好"],["复杂视觉 UI 的像素级精细还原","极高难度算法竞赛题"],["agent","fullstack","bigrepo"],3],
  ["moonshot","Kimi K2.5","kimi-k2-5",200,9,36,"2026-05-12",[88,88,86,87,89,85,92,90,96],["前端组件生成质量高","性价比好"],["超长 Agent 链路偶有丢步"],["frontend","light"],1],
  ["zhipu","GLM-4.7","glm-4.7",128,4,16,"2026-07-02",[90,90,89,89,91,88,84,91,94],["全栈均衡，Debug 能力强","中文语境理解优秀"],["上下文窗口小于同档竞品"],["backend","debug","fullstack"],2],
  ["zhipu","GLM-Flash","glm-flash",128,0.2,1,"2025-12-01",[74,72,70,73,73,71,82,97,99],["极快极便宜","适合批量简单任务"],["复杂架构设计能力有限"],["light"],0],
  ["deepseek","DeepSeek V4","deepseek-v4",160,5,20,"2026-06-30",[89,91,87,88,92,90,86,85,97],["代码生成严谨、一次通过率高","API 价格行业最低档"],["第三方工具官方集成少"],["backend","debug"],2],
  ["deepseek","DeepSeek R2","deepseek-r2",120,7,28,"2026-04-15",[87,85,83,81,92,88,80,72,92],["推理型 Debug 强，善解疑难 Bug","数学与算法题表现好"],["速度偏慢，不适合高频交互"],["debug"],0],
  ["minimax","MiniMax M3","minimax-m3",180,6,24,"2026-06-08",[81,80,82,78,82,79,85,86,90],["多语言项目适应性好","额度宽松"],["前沿能力输出偏保守"],["fullstack"],1],
  ["volcengine","Doubao Seed Code","doubao-seed-code",128,5,18,"2026-05-20",[76,76,74,75,77,74,78,90,92],["企业合规与私有化方案完善"],["开源社区实测样本较少"],["backend"],0],
  ["anthropic","Claude Opus 5","claude-opus-5",500,35,140,"2026-03-18",[96,97,96,94,96,95,98,74,42],["当前 Coding 上限最强","大型重构与复杂 Agent 链路极稳"],["价格高，高频调用不友好"],["agent","bigrepo","backend"],2],
  ["anthropic","Claude Sonnet 5","claude-sonnet-5",400,9,36,"2026-02-10",[93,93,92,92,93,91,94,86,58],["能力/成本平衡好，代码质量稳定"],["周额度政策收紧后额度一般"],["fullstack","debug"],1],
  ["openai","GPT-5.2-Codex","gpt-5.2-codex",400,12,48,"2026-07-22",[94,94,95,91,93,92,92,83,60],["Agent 任务编排强","Codex CLI 深度适配"],["国内直连不稳定"],["agent","fullstack"],1],
  ["openai","GPT-5 Codex Mini","gpt-5-codex-mini",200,2,8,"2026-07-22",[82,81,80,80,83,79,78,95,94],["便宜快速","日常补全够用"],["大型任务上限不足"],["light"],0],
  ["google","Gemini 3 Pro","gemini-3-pro",1000,8,32,"2026-01-18",[91,90,89,88,90,88,99,88,72],["百万级上下文独一档","跨文件检索式修改强"],["Coding 决策精度略逊 Claude/GPT"],["bigrepo"],2],
  ["google","Gemini 3 Flash","gemini-3-flash",600,1,4,"2026-01-18",[84,83,82,84,83,81,97,98,95],["速度快、上下文大","免费额度慷慨"],["深度推理一般"],["light","bigrepo"],1],
  ["cursor","Cursor Composer 1","cursor-composer-1",160,null,null,"2026-06-05",[79,80,78,83,77,76,78,96,97],["IDE 内联编辑延迟极低"],["仅 Cursor 内可用","公开基准样本少"],["frontend","light"],0],
];

// ---------- Plans ----------
// 数据源：2026-08 各厂商官方定价页（见各 provider.officialSource / website）
// USD->CNY 按 1:7.2 折算，仅供同表比较；国内价格以厂商控制台实时页面为准
const plans = [
  // ===== Moonshot Kimi Code Plan（音乐档位命名，K3 需 Moderato 及以上）=====
  // 注：Kimi Adagio（¥0 免费档）已下线——仅 1 个并发 Agent 且不支持 K3，实际干不了活
  {
    p: "moonshot", name: "Kimi Andante", slug: "kimi-andante", price: 49, region: "domestic",
    tagline: "入门付费档：约 300-1200 API 调用/5h",
    quotaType: "requests", quotaAmount: 1200, quotaUnit: "API 调用/5h", quotaWindow: "monthly",
    fastQuota: "约 300-1200 API 调用/5h", normalQuota: "额度每 7 天刷新",
    capacityIndex: 46, contextNote: "K2.7 / K2，K3 需 Moderato 及以上",
    toolCompat: { "Kimi CLI": "official", "Claude Code": "community", "OpenCode": "community" },
    scenarios: ["light", "frontend"],
    pros: ["¥49 门槛低，年付 ¥39", "20 个项目 + 20GB 存储"],
    cons: ["用不了 K3 旗舰模型", "重度用户额度偏紧"],
    recommendedFor: ["学生与业余项目", "想低成本试用 Kimi 生态"],
    notRecommendedFor: ["日均 4 小时以上高强度使用"],
    verified: "2026-08-27T11:20:00+08:00", trust: "official_verified",
    scores: { ability: 78, quota: 52, price: 88, toolCompat: 68, stability: 84, cnExperience: 96 }, trend: 1, heat: 66,
  },
  {
    p: "moonshot", name: "Kimi Moderato", slug: "kimi-moderato", price: 99, region: "domestic",
    tagline: "解锁 K3 旗舰：2.8T 参数、1M 上下文",
    quotaType: "requests", quotaAmount: 2, quotaUnit: "并发 Agent 任务", quotaWindow: "monthly",
    fastQuota: "2 并发 Agent 任务 + 2 个集群子任务",
    capacityIndex: 68, contextNote: "Kimi K3（2.8T 参数，2026-07-17 发布）",
    toolCompat: { "Kimi CLI": "official", "Claude Code": "community", "OpenCode": "community" },
    scenarios: ["fullstack", "agent", "bigrepo"],
    pros: ["首次解锁 K3 旗舰模型", "2 个并发 Agent 任务"],
    cons: ["1M 完整上下文需 Allegro 档", "额度每 7 天刷新，周中可能见底"],
    recommendedFor: ["想用 K3 但预算有限的全栈开发者"], notRecommendedFor: ["需要 1M 完整上下文的长任务"],
    verified: "2026-08-27T11:20:00+08:00", trust: "official_verified",
    scores: { ability: 88, quota: 70, price: 78, toolCompat: 72, stability: 86, cnExperience: 96 }, trend: 2, heat: 82,
  },
  {
    p: "moonshot", name: "Kimi Allegretto", slug: "kimi-allegretto", price: 199, region: "domestic",
    tagline: "进阶档：K3 + Agent 集群 40 次/月",
    quotaType: "requests", quotaAmount: 40, quotaUnit: "次 Agent 集群/月", quotaWindow: "monthly",
    fastQuota: "2 并发 Agent + 4 集群子任务", normalQuota: "Agent 集群 40 次/月",
    capacityIndex: 80, contextNote: "Kimi K3，支持 256K 上下文",
    toolCompat: { "Kimi CLI": "official", "Claude Code": "community", "OpenCode": "community" },
    scenarios: ["fullstack", "agent", "bigrepo", "debug"],
    pros: ["K3 + Agent 集群，长任务更稳", "含 Goal Mode 10 次与 10 个 Kimi Claw 群聊"],
    cons: ["1M 完整上下文仍需 Allegro 档"],
    recommendedFor: ["每天使用 AI Coding 的开发者", "中重度 Agent 开发"],
    notRecommendedFor: ["每周只偶尔 Coding"],
    verified: "2026-08-27T11:20:00+08:00", trust: "official_verified",
    scores: { ability: 92, quota: 88, price: 66, toolCompat: 78, stability: 88, cnExperience: 96 }, trend: 3, heat: 94,
  },
  {
    p: "moonshot", name: "Kimi Allegro", slug: "kimi-allegro", price: 699, region: "domestic",
    tagline: "顶档：K3 完整 1M 上下文 + 4 并发",
    quotaType: "requests", quotaAmount: 4, quotaUnit: "并发 Agent 任务", quotaWindow: "monthly",
    fastQuota: "4 并发 Agent + 8 集群子任务", normalQuota: "K3 1M token 对话容量",
    capacityIndex: 97, contextNote: "Kimi K3 完整 1M token 上下文",
    toolCompat: { "Kimi CLI": "official", "Claude Code": "community", "OpenCode": "community" },
    scenarios: ["agent", "bigrepo", "fullstack"],
    pros: ["唯一给到 K3 完整 1M 上下文的档位", "4 并发任务 + 云端/Android/桌面全端"],
    cons: ["月费接近 Claude Max 20x", "个人开发者很难跑满"],
    recommendedFor: ["超大仓库的长上下文重构", "把它当主力生产力的技术负责人"],
    notRecommendedFor: ["绝大多数个人开发者"],
    verified: "2026-08-27T11:20:00+08:00", trust: "official_verified",
    scores: { ability: 95, quota: 97, price: 26, toolCompat: 80, stability: 90, cnExperience: 96 }, trend: 1, heat: 58,
  },

  // ===== 智谱 GLM Coding Plan（官网 bigmodel.cn/glm-coding 国内价，2026-08-29 核实；积分制）=====
  {
    p: "zhipu", name: "GLM Coding Lite", slug: "glm-lite", price: 118, usdNote: "连续包季 8 折 ¥94.4/月 · 连续包年 7 折 ¥82.6/月", region: "domestic",
    tagline: "入门档：每周 10,000 积分",
    quotaType: "credits", quotaAmount: 10000, quotaUnit: "积分/周", quotaWindow: "weekly",
    fastQuota: "2,000 积分/5h", normalQuota: "10,000 积分/周",
    capacityIndex: 40, contextNote: "GLM-5.3 / GLM-5.3-Flash / GLM-5.2 / GLM-5-Turbo / GLM-4.7，1M 上下文",
    toolCompat: { "ZCode": "official", "Claude Code": "official", "Cline": "official", "OpenCode": "community" },
    scenarios: ["light", "fullstack"],
    pros: ["20+ 工具与 4 类 MCP 全档内置", "可配到 Claude Code / Cline 等第三方工具"],
    cons: ["5h 与周积分双重限制", "旗舰模型为逐步开放"],
    recommendedFor: ["预算敏感的入门用户", "想低成本跑通 Claude Code"],
    notRecommendedFor: ["需要旗舰模型全速访问"],
    verified: "2026-08-26T18:00:00+08:00", trust: "official_detected",
    scores: { ability: 84, quota: 58, price: 84, toolCompat: 88, stability: 86, cnExperience: 95 }, trend: 1, heat: 70,
  },
  {
    p: "zhipu", name: "GLM Coding Pro", slug: "glm-pro", price: 538, usdNote: "连续包季 8 折 ¥430.4/月 · 连续包年 7 折 ¥376.6/月", region: "domestic",
    tagline: "最受欢迎档：6× Lite 用量，每周 60,000 积分",
    quotaType: "credits", quotaAmount: 60000, quotaUnit: "积分/周", quotaWindow: "weekly",
    fastQuota: "12,000 积分/5h", normalQuota: "60,000 积分/周",
    capacityIndex: 74, contextNote: "GLM-5.3 优先体验，1M 上下文，含精选 MCP 工具",
    toolCompat: { "ZCode": "official", "Claude Code": "official", "Cline": "official", "OpenCode": "community" },
    scenarios: ["fullstack", "backend", "debug", "bigrepo"],
    pros: ["GLM-5.3 优先访问，Terminal-Bench 3.0 开源第一梯队", "额度是 Lite 的 6 倍"],
    cons: ["月费 ¥538 对个人用户偏高", "仅支持 GLM 系列模型"],
    recommendedFor: ["中大型仓库的主力开发", "需要旗舰模型全速的团队"],
    notRecommendedFor: ["轻度使用者（Lite 更划算）"],
    verified: "2026-08-26T18:00:00+08:00", trust: "official_detected",
    scores: { ability: 92, quota: 84, price: 50, toolCompat: 90, stability: 88, cnExperience: 95 }, trend: 2, heat: 88,
  },
  {
    p: "zhipu", name: "GLM Coding Max", slug: "glm-max", price: 1078, usdNote: "连续包季 8 折 ¥862.4/月 · 连续包年 7 折 ¥754.6/月", region: "domestic",
    tagline: "顶档：14× Lite 用量，每周 140,000 积分",
    quotaType: "credits", quotaAmount: 140000, quotaUnit: "积分/周", quotaWindow: "weekly",
    fastQuota: "28,000 积分/5h", normalQuota: "140,000 积分/周",
    capacityIndex: 94, contextNote: "GLM-5.3 首发接入，高峰期专属资源优先保障",
    toolCompat: { "ZCode": "official", "Claude Code": "official", "Cline": "official", "OpenCode": "community" },
    scenarios: ["agent", "bigrepo", "fullstack", "backend"],
    pros: ["额度天花板，高峰期专属资源优先", "新模型首发接入"],
    cons: ["月费四位数", "个人开发者难跑满"],
    recommendedFor: ["每天 6 小时以上 Agent 自动开发"], notRecommendedFor: ["绝大多数个人开发者"],
    verified: "2026-08-26T18:00:00+08:00", trust: "official_detected",
    scores: { ability: 94, quota: 96, price: 28, toolCompat: 90, stability: 90, cnExperience: 95 }, trend: 1, heat: 52,
  },

  // ===== MiniMax Token Plan =====
  {
    p: "minimax", name: "MiniMax Plus", slug: "minimax-plus", price: 49, region: "domestic",
    tagline: "入门档：图文音视频与代码共享额度池",
    quotaType: "tokens", quotaAmount: 600, quotaUnit: "M Tokens/月", quotaWindow: "monthly",
    capacityIndex: 50, contextNote: "M3 / M2.7 / M2.7-highspeed",
    toolCompat: { "OpenCode": "community", "官方 CLI": "official" },
    scenarios: ["light", "fullstack"],
    pros: ["¥49 门槛低", "多模态与代码共用额度池"],
    cons: ["并发与速度弱于 Max 档", "Agent 工具调用稳定性一般"],
    recommendedFor: ["中等强度的轻度使用者"], notRecommendedFor: ["Agent 重度工作流"],
    verified: "2026-08-24T15:00:00+08:00", trust: "official_detected",
    scores: { ability: 81, quota: 62, price: 84, toolCompat: 64, stability: 80, cnExperience: 90 }, trend: 0, heat: 54,
  },
  {
    p: "minimax", name: "MiniMax Max", slug: "minimax-max", price: 119, region: "domestic",
    tagline: "主力档：额度显著提升",
    quotaType: "tokens", quotaAmount: 2400, quotaUnit: "M Tokens/月", quotaWindow: "monthly",
    capacityIndex: 72, contextNote: "M3 / M2.7 / M2.7-highspeed",
    toolCompat: { "OpenCode": "community", "官方 CLI": "official" },
    scenarios: ["fullstack", "light"],
    pros: ["额度约为 Plus 的 4 倍", "多模态共享同一池子"],
    cons: ["高并发场景仍会限流"],
    recommendedFor: ["中等强度全栈开发", "需要图文音视频混合工作流"],
    notRecommendedFor: ["追求极致 Agent 稳定性"],
    verified: "2026-08-24T15:00:00+08:00", trust: "official_detected",
    scores: { ability: 81, quota: 82, price: 66, toolCompat: 64, stability: 80, cnExperience: 90 }, trend: 1, heat: 62,
  },
  {
    p: "minimax", name: "MiniMax Ultra", slug: "minimax-ultra", price: 469, region: "domestic",
    tagline: "顶档：超大额度 + 全模态共享",
    quotaType: "tokens", quotaAmount: 7100, quotaUnit: "M Tokens/月", quotaWindow: "monthly",
    capacityIndex: 93, contextNote: "M3 / M2.7 / M2.7-highspeed",
    toolCompat: { "OpenCode": "community", "官方 CLI": "official" },
    scenarios: ["fullstack", "agent"],
    pros: ["额度天花板（71 亿+ token/月）", "全模态共享一个池子"],
    cons: ["月费偏高", "Coding 能力非第一梯队"],
    recommendedFor: ["多模态 + 代码混合的重度用户"], notRecommendedFor: ["只写代码的用户（同价有更专注的选择）"],
    verified: "2026-08-24T15:00:00+08:00", trust: "official_detected",
    scores: { ability: 82, quota: 95, price: 34, toolCompat: 64, stability: 80, cnExperience: 90 }, trend: 0, heat: 40,
  },

  // ===== 阿里云百炼 Qwen Token Plan =====
  {
    p: "alibaba", name: "Qwen Token Plan 入门", slug: "qwen-lite", price: 39, region: "domestic",
    tagline: "早鸟价 ¥39（刊例 ¥60）",
    quotaType: "credits", quotaAmount: 700, quotaUnit: "Credits/5h", quotaWindow: "monthly",
    fastQuota: "700 Credits/5h", normalQuota: "2,500 Credits/周",
    capacityIndex: 44, contextNote: "Qwen3.8-Max / DeepSeek-V4-Pro / qwen3-coder / GLM",
    toolCompat: { "Qoder": "official", "官方 CLI": "official", "OpenCode": "community" },
    scenarios: ["light", "fullstack"],
    pros: ["早鸟价 35% off", "模型阵容横跨 Qwen / DeepSeek / GLM"],
    cons: ["1-2 个并发 Agent", "早鸟价结束后回到 ¥60"],
    recommendedFor: ["阿里云老用户", "想要多模型轮换的轻度用户"],
    notRecommendedFor: ["高并发团队"],
    verified: "2026-08-25T10:00:00+08:00", trust: "official_detected",
    scores: { ability: 86, quota: 54, price: 88, toolCompat: 70, stability: 88, cnExperience: 94 }, trend: 1, heat: 68,
  },
  {
    p: "alibaba", name: "Qwen Token Plan 标准", slug: "qwen-standard", price: 139, region: "domestic",
    tagline: "推荐档：3,000 Credits/5h",
    quotaType: "credits", quotaAmount: 3000, quotaUnit: "Credits/5h", quotaWindow: "monthly",
    fastQuota: "3,000 Credits/5h", normalQuota: "10,000 Credits/周",
    capacityIndex: 70, contextNote: "Qwen3.8-Max / DeepSeek-V4-Pro / qwen3-coder / GLM",
    toolCompat: { "Qoder": "official", "官方 CLI": "official", "OpenCode": "community" },
    scenarios: ["fullstack", "backend", "debug"],
    pros: ["并发提升到 3-4 个 Agent", "Credits 制比按量更好控预算"],
    cons: ["国内夜间优惠与抵扣系数变动频繁"],
    recommendedFor: ["日常主力开发的全栈工程师"], notRecommendedFor: ["只需要偶尔补全的用户"],
    verified: "2026-08-25T10:00:00+08:00", trust: "official_detected",
    scores: { ability: 88, quota: 80, price: 62, toolCompat: 74, stability: 88, cnExperience: 94 }, trend: 2, heat: 76,
  },
  {
    p: "alibaba", name: "Qwen Token Plan Pro", slug: "qwen-pro", price: 499, region: "domestic",
    tagline: "重度档：12,000 Credits/5h",
    quotaType: "credits", quotaAmount: 12000, quotaUnit: "Credits/5h", quotaWindow: "monthly",
    fastQuota: "12,000 Credits/5h", normalQuota: "40,000 Credits/周",
    capacityIndex: 92, contextNote: "Qwen3.8-Max / DeepSeek-V4-Pro / qwen3-coder / GLM",
    toolCompat: { "Qoder": "official", "官方 CLI": "official", "OpenCode": "community" },
    scenarios: ["fullstack", "agent", "bigrepo", "backend"],
    pros: ["6-8 个并发 Agent", "周额度 40,000 Credits"],
    cons: ["月费接近 Claude Max 5x"],
    recommendedFor: ["团队共享的高强度开发"], notRecommendedFor: ["个人轻度用户"],
    verified: "2026-08-25T10:00:00+08:00", trust: "official_detected",
    scores: { ability: 89, quota: 94, price: 32, toolCompat: 76, stability: 88, cnExperience: 94 }, trend: 1, heat: 44,
  },

  // ===== 火山方舟 Agent Plan =====
  {
    p: "volcengine", name: "火山方舟 Agent Plan", slug: "volc-ark-small", price: 40, usdNote: "首购前两月 ¥9.9/月", region: "domestic",
    tagline: "一个订阅轮换 8+ 模型",
    quotaType: "credits", quotaAmount: 3000, quotaUnit: "Credits/5h", quotaWindow: "monthly",
    normalQuota: "5h + 周 + 月三重窗口",
    capacityIndex: 58, contextNote: "Doubao / GLM-5.2 / Kimi-K3 / DeepSeek / MiniMax 等 8+ 模型",
    toolCompat: { "官方 CLI": "official", "OpenCode": "community" },
    scenarios: ["light", "fullstack", "backend"],
    pros: ["模型数量最多（8+ 款）+ Auto 调度", "首购前两月 ¥9.9"],
    cons: ["Kimi-K3 部分能力需 Medium 及以上", "活动价结束后回到 ¥40 刊例价"],
    recommendedFor: ["想一个订阅轮换多家模型的用户"], notRecommendedFor: ["只认单一旗舰模型的用户"],
    verified: "2026-08-22T16:00:00+08:00", trust: "official_detected",
    scores: { ability: 84, quota: 66, price: 80, toolCompat: 62, stability: 86, cnExperience: 94 }, trend: 0, heat: 60,
  },

  // ===== DeepSeek（无订阅制）=====
  {
    p: "deepseek", name: "DeepSeek 按量付费", slug: "deepseek-payg", price: 35, region: "domestic",
    tagline: "无订阅制，按 Token 计费",
    quotaType: "token", quotaAmount: null, quotaUnit: "按量", quotaWindow: "payg",
    capacityIndex: 45, contextNote: "V4 / R2",
    toolCompat: { "OpenCode": "community", "Claude Code": "community", "官方 CLI": "official" },
    scenarios: ["backend", "debug", "light"],
    pros: ["没有月费压力", "API 价格行业最低档"],
    cons: ["官方已公告计划上调定价且涨幅较大", "高峰限流常见"],
    recommendedFor: ["低频使用者", "喜欢精确控费的工程师"],
    notRecommendedFor: ["想要固定月费可预期账单的用户"],
    verified: "2026-08-23T12:00:00+08:00", trust: "community_verified",
    scores: { ability: 89, quota: 70, price: 92, toolCompat: 70, stability: 78, cnExperience: 92 }, trend: 0, heat: 72,
  },

  // ===== 小米 MiMo =====
  {
    p: "xiaomi", name: "MiMo Coding Plan", slug: "mimo-coding", price: 39, region: "domestic",
    tagline: "小米系 Coding 订阅",
    quotaType: "credits", quotaAmount: 492, quotaUnit: "亿 Credits/年", quotaWindow: "monthly",
    capacityIndex: 48, contextNote: "MiMo-V2.5-Pro 全模态",
    toolCompat: { "官方 CLI": "official" },
    scenarios: ["light", "fullstack"],
    pros: ["¥39 入门价有竞争力", "全模态模型"],
    cons: ["工具生态与第三方集成较少", "公开基准样本有限"],
    recommendedFor: ["小米生态用户", "预算敏感的轻度使用者"],
    notRecommendedFor: ["需要成熟工具链的团队"],
    verified: "2026-08-20T10:00:00+08:00", trust: "official_detected",
    scores: { ability: 79, quota: 60, price: 86, toolCompat: 54, stability: 78, cnExperience: 92 }, trend: 0, heat: 36,
  },

  // ===== Anthropic Claude =====
  {
    p: "anthropic", name: "Claude Pro", slug: "claude-pro", price: 144, usdNote: "$20/月（年付 $17）", region: "overseas",
    tagline: "Coding 上限第一梯队，5h + 周双限",
    quotaType: "requests", quotaAmount: 45, quotaUnit: "次提示/5h", quotaWindow: "daily",
    fastQuota: "约 10-45 次提示/5h", normalQuota: "约 40-80 Sonnet 小时/周",
    capacityIndex: 40, contextNote: "Claude Opus 5 / Sonnet 5 / Fable 5，500K 上下文",
    toolCompat: { "Claude Code": "official", "OpenCode": "official", "Cursor": "official", "VS Code": "community", "官方 CLI": "official" },
    scenarios: ["fullstack", "agent", "debug", "bigrepo"],
    pros: ["模型质量天花板级", "Claude Code 原生优化，生态兼容面最广"],
    cons: ["5h 与周上限双重限制，高峰期进一步收紧", "国内访问需要网络条件"],
    recommendedFor: ["追求 Coding 上限的资深开发者", "能稳定使用国际网络服务的用户"],
    notRecommendedFor: ["预算 ¥100 内", "无法稳定访问国际网络的用户"],
    verified: "2026-08-27T10:00:00+08:00", trust: "official_verified",
    scores: { ability: 95, quota: 48, price: 60, toolCompat: 94, stability: 88, cnExperience: 40 }, trend: -1, heat: 92,
  },
  {
    p: "anthropic", name: "Claude Max 5x", slug: "claude-max-5x", price: 720, usdNote: "$100/月", region: "overseas",
    tagline: "5× Pro 用量：约 50-225 次提示/5h",
    quotaType: "requests", quotaAmount: 225, quotaUnit: "次提示/5h", quotaWindow: "daily",
    fastQuota: "约 50-225 次提示/5h", normalQuota: "约 140-240 Sonnet 小时 + 15-35 Opus 小时/周",
    capacityIndex: 76, contextNote: "Claude Opus 5 / Sonnet 5，含 Fable 5（周额度的 50%）",
    toolCompat: { "Claude Code": "official", "OpenCode": "official", "官方 CLI": "official" },
    scenarios: ["agent", "bigrepo", "backend", "fullstack"],
    pros: ["全日用量的甜点档", "高峰期优先访问"],
    cons: ["月费三位数", "国内访问需要网络条件"],
    recommendedFor: ["每天长时间使用 Claude Code 的开发者"], notRecommendedFor: ["偶尔使用的用户"],
    verified: "2026-08-27T10:00:00+08:00", trust: "official_verified",
    scores: { ability: 95, quota: 84, price: 34, toolCompat: 92, stability: 88, cnExperience: 40 }, trend: 1, heat: 70,
  },
  {
    p: "anthropic", name: "Claude Max 20x", slug: "claude-max-20x", price: 1440, usdNote: "$200/月", region: "overseas",
    tagline: "20× Pro 用量：约 200-900 次提示/5h",
    quotaType: "requests", quotaAmount: 900, quotaUnit: "次提示/5h", quotaWindow: "daily",
    fastQuota: "约 200-900 次提示/5h", normalQuota: "约 240-480 Sonnet 小时 + 24-40 Opus 小时/周",
    capacityIndex: 96, contextNote: "Claude Opus 5 / Sonnet 5，新功能优先体验",
    toolCompat: { "Claude Code": "official", "OpenCode": "official", "官方 CLI": "official" },
    scenarios: ["agent", "bigrepo", "backend", "fullstack"],
    pros: ["额度天花板，新功能早期访问", "中大型仓库的重度 Agent 工作流"],
    cons: ["月费四位数", "国内访问需要网络条件"],
    recommendedFor: ["把它当生产力主力的技术负责人"], notRecommendedFor: ["绝大多数个人开发者"],
    verified: "2026-08-27T10:00:00+08:00", trust: "official_verified",
    scores: { ability: 96, quota: 97, price: 12, toolCompat: 92, stability: 90, cnExperience: 40 }, trend: 0, heat: 50,
  },
  {
    p: "anthropic", name: "Claude Team 标准席位", slug: "claude-team", price: 180, usdNote: "$25/seat/月（年付 $20）", region: "overseas",
    tagline: "团队档：集中管理 + 共享用量",
    quotaType: "requests", quotaAmount: 45, quotaUnit: "次提示/5h", quotaWindow: "daily",
    fastQuota: "约 10-45 次提示/5h", normalQuota: "团队共享用量池",
    capacityIndex: 44, contextNote: "Claude Opus 5 / Sonnet 5",
    toolCompat: { "Claude Code": "official", "OpenCode": "official", "官方 CLI": "official" },
    scenarios: ["fullstack", "agent", "debug"],
    pros: ["集中计费与管理后台", "Premium 席位可混用（$125/seat）"],
    cons: ["单人使用不如个人档划算", "国内访问需要网络条件"],
    recommendedFor: ["5 人以上的研发团队"], notRecommendedFor: ["个人开发者"],
    verified: "2026-08-27T10:00:00+08:00", trust: "official_verified",
    scores: { ability: 95, quota: 50, price: 52, toolCompat: 92, stability: 90, cnExperience: 38 }, trend: 0, heat: 42,
  },

  // ===== Cursor =====
  {
    p: "cursor", name: "Cursor Hobby", slug: "cursor-hobby", price: 0, region: "overseas",
    tagline: "免费档：有限 Agent 与 Tab 补全",
    quotaType: "requests", quotaAmount: 2000, quotaUnit: "次补全/月", quotaWindow: "monthly",
    capacityIndex: 14, contextNote: "Composer 2.5 / Grok 4.5 等",
    toolCompat: { "Cursor": "official" },
    scenarios: ["light"],
    pros: ["免费且不需要信用卡", "足以评估 Cursor 是否适合自己"],
    cons: ["额度只够尝鲜", "脱离 IDE 无法使用"],
    recommendedFor: ["体验阶段用户"], notRecommendedFor: ["正式项目开发"],
    verified: "2026-08-26T09:30:00+08:00", trust: "official_verified",
    scores: { ability: 80, quota: 24, price: 100, toolCompat: 70, stability: 84, cnExperience: 46 }, trend: 0, heat: 52,
  },
  {
    p: "cursor", name: "Cursor Pro", slug: "cursor-pro", price: 144, usdNote: "$20/月（年付 $16）", region: "overseas",
    tagline: "主力档：无限 Tab + $20 模型额度",
    quotaType: "credits", quotaAmount: 20, quotaUnit: "USD 额度/月", quotaWindow: "monthly",
    fastQuota: "$20 模型额度/月", normalQuota: "无限 Tab 补全 + 无限 Auto 模式",
    capacityIndex: 52, contextNote: "Composer 2.5 / Grok 4.6 / 第三方前沿模型",
    toolCompat: { "Cursor": "official", "VS Code": "unverified" },
    scenarios: ["frontend", "fullstack", "light"],
    pros: ["Tab 补全与 Inline Edit 手感最好", "Auto 模式不限量，不消耗额度"],
    cons: ["手动选前沿模型才扣额度，重度使用会超", "脱离 IDE 无法使用"],
    recommendedFor: ["以 IDE 为中心的前端/全栈开发"], notRecommendedFor: ["纯 CLI 工作流用户"],
    verified: "2026-08-26T09:30:00+08:00", trust: "official_verified",
    scores: { ability: 87, quota: 62, price: 62, toolCompat: 88, stability: 84, cnExperience: 46 }, trend: -1, heat: 84,
  },
  {
    p: "cursor", name: "Cursor Pro Plus", slug: "cursor-pro-plus", price: 432, usdNote: "$60/月（年付 $48）", region: "overseas",
    tagline: "3.5× Pro 额度：$70/月",
    quotaType: "credits", quotaAmount: 70, quotaUnit: "USD 额度/月", quotaWindow: "monthly",
    fastQuota: "$70 模型额度/月", normalQuota: "无限 Tab 补全 + 无限 Auto 模式",
    capacityIndex: 72, contextNote: "Composer 2.5 / Grok 4.6 / 第三方前沿模型",
    toolCompat: { "Cursor": "official", "VS Code": "unverified" },
    scenarios: ["frontend", "fullstack", "agent"],
    pros: ["额度是 Pro 的 3.5 倍", "功能与 Pro 完全一致，无阉割"],
    cons: ["月费已是 Pro 的三倍", "脱离 IDE 无法使用"],
    recommendedFor: ["每天 4 小时以上在 Cursor 里跑多文件重构"], notRecommendedFor: ["轻度使用者"],
    verified: "2026-08-26T09:30:00+08:00", trust: "official_verified",
    scores: { ability: 87, quota: 80, price: 38, toolCompat: 88, stability: 84, cnExperience: 46 }, trend: 1, heat: 66,
  },
  {
    p: "cursor", name: "Cursor Ultra", slug: "cursor-ultra", price: 1440, usdNote: "$200/月（年付 $160）", region: "overseas",
    tagline: "20× Pro 额度：$400/月",
    quotaType: "credits", quotaAmount: 400, quotaUnit: "USD 额度/月", quotaWindow: "monthly",
    fastQuota: "$400 模型额度/月", normalQuota: "无限 Tab 补全 + 无限 Auto 模式",
    capacityIndex: 95, contextNote: "Composer 2.5 / Grok 4.6 / 第三方前沿模型",
    toolCompat: { "Cursor": "official", "VS Code": "unverified" },
    scenarios: ["frontend", "fullstack", "agent", "bigrepo"],
    pros: ["额度天花板 + 新功能优先", "Max Mode 大上下文可放开用"],
    cons: ["月费四位数，属基础设施级支出", "脱离 IDE 无法使用"],
    recommendedFor: ["全天候跑 Background Agent 的 AI-native 开发者"], notRecommendedFor: ["绝大多数开发者"],
    verified: "2026-08-26T09:30:00+08:00", trust: "official_verified",
    scores: { ability: 88, quota: 96, price: 14, toolCompat: 88, stability: 84, cnExperience: 46 }, trend: 0, heat: 38,
  },

  // ===== GitHub Copilot =====
  {
    p: "github", name: "Copilot Free", slug: "copilot-free", price: 0, region: "overseas",
    tagline: "免费档：2,000 次补全/月",
    quotaType: "requests", quotaAmount: 2000, quotaUnit: "次补全/月", quotaWindow: "monthly",
    capacityIndex: 18, contextNote: "可选多模型路由",
    toolCompat: { "VS Code": "official" },
    scenarios: ["light"],
    pros: ["有 GitHub 账号即可免费用", "VS Code 原生集成"],
    cons: ["额度只够尝鲜", "Agent 能力弱"],
    recommendedFor: ["体验阶段用户"], notRecommendedFor: ["正式项目开发"],
    verified: "2026-08-21T11:00:00+08:00", trust: "official_verified",
    scores: { ability: 78, quota: 26, price: 100, toolCompat: 74, stability: 86, cnExperience: 52 }, trend: 0, heat: 56,
  },
  {
    p: "github", name: "Copilot Pro", slug: "copilot-pro", price: 72, usdNote: "$10/月", region: "overseas",
    tagline: "$15 AI 额度 + $5 flex",
    quotaType: "credits", quotaAmount: 15, quotaUnit: "USD 额度/月", quotaWindow: "monthly",
    fastQuota: "$15 模型额度 + $5 flex/月", normalQuota: "无限基础补全",
    capacityIndex: 34, contextNote: "可选 Claude / GPT / Gemini 路由",
    toolCompat: { "VS Code": "official", "Cursor": "official" },
    scenarios: ["frontend", "light", "fullstack"],
    pros: ["$10 门槛最低的国际方案", "VS Code 无缝集成"],
    cons: ["额度偏少，Premium 模型很快用完", "Agent 能力弱于专用 Coding 方案"],
    recommendedFor: ["以补全为主 + 少量 Agent 的日常开发"], notRecommendedFor: ["重 Agent 工作流用户"],
    verified: "2026-08-21T11:00:00+08:00", trust: "official_verified",
    scores: { ability: 82, quota: 44, price: 90, toolCompat: 80, stability: 86, cnExperience: 52 }, trend: 1, heat: 78,
  },
  {
    p: "github", name: "Copilot Pro+", slug: "copilot-pro-plus", price: 281, usdNote: "$39/月", region: "overseas",
    tagline: "$70 AI 额度 + $31 flex",
    quotaType: "credits", quotaAmount: 70, quotaUnit: "USD 额度/月", quotaWindow: "monthly",
    fastQuota: "$70 模型额度 + $31 flex/月", normalQuota: "无限基础补全",
    capacityIndex: 62, contextNote: "可选 Claude / GPT / Gemini 路由",
    toolCompat: { "VS Code": "official", "Cursor": "official" },
    scenarios: ["frontend", "fullstack", "agent"],
    pros: ["额度是 Pro 的 4.7 倍", "VS Code 生态最成熟"],
    cons: ["Agent 能力仍弱于 Claude Code / Cursor"],
    recommendedFor: ["重度使用 VS Code 且需要更多 Premium 额度"], notRecommendedFor: ["纯 Agent 自动化场景"],
    verified: "2026-08-21T11:00:00+08:00", trust: "official_verified",
    scores: { ability: 83, quota: 72, price: 56, toolCompat: 82, stability: 86, cnExperience: 52 }, trend: 1, heat: 64,
  },
  {
    p: "github", name: "Copilot Max", slug: "copilot-max", price: 720, usdNote: "$100/月", region: "overseas",
    tagline: "$200 AI 额度 + $100 flex",
    quotaType: "credits", quotaAmount: 200, quotaUnit: "USD 额度/月", quotaWindow: "monthly",
    fastQuota: "$200 模型额度 + $100 flex/月", normalQuota: "无限基础补全",
    capacityIndex: 88, contextNote: "可选 Claude / GPT / Gemini 路由",
    toolCompat: { "VS Code": "official", "Cursor": "official" },
    scenarios: ["frontend", "fullstack", "agent", "bigrepo"],
    pros: ["额度天花板", "VS Code + GitHub 生态深度整合"],
    cons: ["月费三位数但 Agent 上限仍不如 Claude"],
    recommendedFor: ["GitHub 重度用户 + 大量 Premium 模型调用"], notRecommendedFor: ["追求 Agent 上限的用户"],
    verified: "2026-08-21T11:00:00+08:00", trust: "official_verified",
    scores: { ability: 84, quota: 90, price: 30, toolCompat: 84, stability: 86, cnExperience: 52 }, trend: 0, heat: 40,
  },

  // ===== OpenAI / Google / OpenCode =====
  {
    p: "openai", name: "ChatGPT Plus（含 Codex）", slug: "codex-plus", price: 144, usdNote: "$20/月", region: "overseas",
    tagline: "约 15-90 条 GPT-5.6 Sol 提示/5h + 周上限",
    quotaType: "requests", quotaAmount: 90, quotaUnit: "条 Sol 提示/5h", quotaWindow: "daily",
    fastQuota: "约 15-90 条 GPT-5.6 Sol 提示/5h", normalQuota: "约 50-280 条 Luna 提示/5h，另有独立周上限",
    capacityIndex: 62, contextNote: "GPT-5.6 Sol / Terra / Luna，credit 按量计费（2026-04 起）",
    toolCompat: { "Codex": "official", "Cursor": "official", "VS Code": "community", "官方 CLI": "official" },
    scenarios: ["agent", "fullstack"],
    pros: ["云端并行异步任务体验独特", "已订阅 ChatGPT 的话等于白送，credit 可加购"],
    cons: ["国内直连不稳", "credit 消耗随模型与任务量浮动，重度使用常超月费"],
    recommendedFor: ["已经在订阅 ChatGPT 的开发者"], notRecommendedFor: ["纯本地 CLI 工作流的用户"],
    verified: "2026-08-29T15:00:00+08:00", trust: "official_verified",
    scores: { ability: 90, quota: 74, price: 60, toolCompat: 86, stability: 82, cnExperience: 34 }, trend: 1, heat: 80,
  },
  {
    p: "openai", name: "ChatGPT Pro 5x（含 Codex）", slug: "codex-pro-5x", price: 720, usdNote: "$100/月", region: "overseas",
    tagline: "5× Plus 用量，约 75-450 条 Sol 提示/5h",
    quotaType: "requests", quotaAmount: 450, quotaUnit: "条 Sol 提示/5h", quotaWindow: "daily",
    fastQuota: "约 75-450 条 GPT-5.6 Sol 提示/5h", normalQuota: "约 250-1,400 条 Luna 提示/5h，另有独立周上限",
    capacityIndex: 76, contextNote: "GPT-5.6 全系 + Codex-Spark 研究预览，credit 按量计费",
    toolCompat: { "Codex": "official", "Cursor": "official", "VS Code": "community", "官方 CLI": "official" },
    scenarios: ["agent", "fullstack", "bigrepo"],
    pros: ["5× Plus 额度，对标 Claude Max 5x 的甜点档", "高峰期优先处理，credit 可加购"],
    cons: ["国内直连不稳", "官方口径 Codex 实际成本约 $100-200/开发者/月"],
    recommendedFor: ["每天高强度使用 Codex 的开发者"], notRecommendedFor: ["偶尔用一下的轻度用户"],
    verified: "2026-08-29T15:00:00+08:00", trust: "official_verified",
    scores: { ability: 91, quota: 88, price: 34, toolCompat: 86, stability: 82, cnExperience: 34 }, trend: 1, heat: 66,
  },
  {
    p: "openai", name: "ChatGPT Pro 20x（含 Codex）", slug: "codex-pro-20x", price: 1440, usdNote: "$200/月", region: "overseas",
    tagline: "20× Plus 用量，约 300-1,800 条 Sol 提示/5h",
    quotaType: "requests", quotaAmount: 1800, quotaUnit: "条 Sol 提示/5h", quotaWindow: "daily",
    fastQuota: "约 300-1,800 条 GPT-5.6 Sol 提示/5h", normalQuota: "约 1,000-5,600 条 Luna 提示/5h，另有独立周上限",
    capacityIndex: 96, contextNote: "GPT-5.6 全系 + Codex-Spark 研究预览，credit 按量计费",
    toolCompat: { "Codex": "official", "Cursor": "official", "VS Code": "community", "官方 CLI": "official" },
    scenarios: ["agent", "bigrepo", "fullstack"],
    pros: ["个人档额度天花板，7×24 自动化任务可行", "credit 消耗为 5x 档 4 倍价格换 4 倍容量，重度更划算"],
    cons: ["月费四位数", "国内直连不稳"],
    recommendedFor: ["把它当生产力主力的技术负责人"], notRecommendedFor: ["绝大多数个人开发者"],
    verified: "2026-08-29T15:00:00+08:00", trust: "official_verified",
    scores: { ability: 92, quota: 97, price: 12, toolCompat: 86, stability: 84, cnExperience: 34 }, trend: 0, heat: 46,
  },
  {
    p: "google", name: "Gemini AI Pro", slug: "gemini-ai-pro", price: 144, usdNote: "$19.99/月", region: "overseas",
    tagline: "超大上下文路线的 Coding 方案",
    quotaType: "requests", quotaAmount: 1500, quotaUnit: "条 Gemini Pro/日", quotaWindow: "daily",
    capacityIndex: 74, contextNote: "Gemini 3.1 Pro / 3.6 Flash，百万级上下文",
    toolCompat: { "官方 CLI": "official", "OpenCode": "community", "Cursor": "official", "VS Code": "community" },
    scenarios: ["bigrepo", "light", "debug"],
    pros: ["百万 token 上下文最实用", "Flash 可混用省量"],
    cons: ["Coding 决策精度低于 Claude/GPT"],
    recommendedFor: ["超大规模仓库的检索式修改"], notRecommendedFor: ["把模型精度放在第一位的人"],
    verified: "2026-08-19T10:00:00+08:00", trust: "official_verified",
    scores: { ability: 88, quota: 86, price: 62, toolCompat: 74, stability: 80, cnExperience: 38 }, trend: 0, heat: 58,
  },
  {
    p: "__oc__", name: "OpenCode Go", slug: "opencode-go", price: 72, usdNote: "$10/月（首月 $5）", region: "overseas",
    tagline: "18 款开源模型聚合，6 倍用量价值",
    quotaType: "credits", quotaAmount: 60, quotaUnit: "USD 额度/月", quotaWindow: "monthly",
    fastQuota: "$12/5h", normalQuota: "$30/周 · $60/月",
    capacityIndex: 60, contextNote: "Grok 4.5 / GLM-5.2 / Kimi K3 / Qwen3.8 Max / DeepSeek V4 等 18 款",
    toolCompat: { "OpenCode": "official", "Claude Code": "community" },
    scenarios: ["light", "fullstack"],
    pros: ["$10 享 $60 额度（6 倍）", "OpenAI / Anthropic 兼容 API"],
    cons: ["社区网关，稳定性与条款风险自负", "0 天数据保留"],
    recommendedFor: ["多工具流学习者", "想低成本轮换开源模型的用户"],
    notRecommendedFor: ["商业项目主力方案"],
    verified: "2026-08-18T09:00:00+08:00", trust: "community_verified",
    scores: { ability: 84, quota: 68, price: 88, toolCompat: 76, stability: 60, cnExperience: 44 }, trend: 1, heat: 46,
  },

  // ===== 腾讯云 CodeBuddy（积分制，与 WorkBuddy 积分互通）=====
  {
    p: "tencent", name: "CodeBuddy 体验版", slug: "codebuddy-free", price: 0, region: "domestic",
    tagline: "免费档：500 基础积分/月，补全不限次",
    quotaType: "credits", quotaAmount: 500, quotaUnit: "积分/月", quotaWindow: "monthly",
    capacityIndex: 15, contextNote: "混元 / DeepSeek，内置 Figma 转代码",
    toolCompat: { "CodeBuddy": "official", "VS Code": "official", "JetBrains": "official" },
    scenarios: ["light"],
    pros: ["基础代码补全不限次", "与 WorkBuddy 积分互通"],
    cons: ["500 积分只够轻度体验", "Agent 功能几乎用不了"],
    recommendedFor: ["先体验腾讯系 AI 编程"], notRecommendedFor: ["正式项目开发"],
    verified: "2026-08-28T10:00:00+08:00", trust: "official_verified",
    scores: { ability: 78, quota: 22, price: 100, toolCompat: 72, stability: 88, cnExperience: 94 }, trend: 0, heat: 50,
  },
  {
    p: "tencent", name: "CodeBuddy 标准版", slug: "codebuddy-standard", price: 99, usdNote: "连续包月 ¥70/月 · 年付约 ¥56/月", region: "domestic",
    tagline: "每月 4,000 积分，连续包月 7 折",
    quotaType: "credits", quotaAmount: 4000, quotaUnit: "积分/月", quotaWindow: "monthly",
    capacityIndex: 52, contextNote: "混元 / DeepSeek / 多模型切换",
    toolCompat: { "CodeBuddy": "official", "VS Code": "official", "JetBrains": "official", "官方 CLI": "official" },
    scenarios: ["light", "fullstack", "frontend"],
    pros: ["连续包月 ¥70，折扣力度大", "IDE 插件 + CLI 三形态，腾讯生态集成"],
    cons: ["4,000 积分对重度 Agent 不够", "Craft 智能体消耗较快"],
    recommendedFor: ["日常开发的个人开发者", "已在用腾讯生态的团队"],
    notRecommendedFor: ["重度 Agent 自动化场景"],
    verified: "2026-08-28T10:00:00+08:00", trust: "official_verified",
    scores: { ability: 82, quota: 58, price: 78, toolCompat: 76, stability: 88, cnExperience: 94 }, trend: 1, heat: 66,
  },
  {
    p: "tencent", name: "CodeBuddy 高级版", slug: "codebuddy-pro", price: 199, usdNote: "连续包月 ¥140/月", region: "domestic",
    tagline: "每月 9,000 积分",
    quotaType: "credits", quotaAmount: 9000, quotaUnit: "积分/月", quotaWindow: "monthly",
    capacityIndex: 74, contextNote: "混元 / DeepSeek / 多模型切换",
    toolCompat: { "CodeBuddy": "official", "VS Code": "official", "JetBrains": "official", "官方 CLI": "official" },
    scenarios: ["fullstack", "agent", "frontend", "backend"],
    pros: ["积分是标准版的 2.25 倍", "Sub Agent 与 Craft 智能体可放开用"],
    cons: ["月费比同档国产方案偏高"],
    recommendedFor: ["中重度使用的全栈开发者"], notRecommendedFor: ["轻度使用者"],
    verified: "2026-08-28T10:00:00+08:00", trust: "official_verified",
    scores: { ability: 83, quota: 78, price: 58, toolCompat: 78, stability: 88, cnExperience: 94 }, trend: 1, heat: 62,
  },
  {
    p: "tencent", name: "CodeBuddy 旗舰版", slug: "codebuddy-max", price: 999, usdNote: "连续包月 ¥700/月", region: "domestic",
    tagline: "每月 50,000 积分",
    quotaType: "credits", quotaAmount: 50000, quotaUnit: "积分/月", quotaWindow: "monthly",
    capacityIndex: 95, contextNote: "混元 / DeepSeek / 多模型切换",
    toolCompat: { "CodeBuddy": "official", "VS Code": "official", "JetBrains": "official", "官方 CLI": "official" },
    scenarios: ["agent", "bigrepo", "fullstack", "backend"],
    pros: ["积分天花板（50,000/月）", "适合大仓库与多 Agent 并行"],
    cons: ["月费四位数", "个人开发者难跑满"],
    recommendedFor: ["高强度 Agent 开发的团队"], notRecommendedFor: ["个人轻度用户"],
    verified: "2026-08-28T10:00:00+08:00", trust: "official_verified",
    scores: { ability: 84, quota: 96, price: 18, toolCompat: 78, stability: 88, cnExperience: 94 }, trend: 0, heat: 38,
  },

  // ===== 字节 Trae（TraeCode + TraeWork 双形态）=====
  {
    p: "trae", name: "Trae Pro", slug: "trae-pro", price: 99, region: "domestic",
    tagline: "4,000 通用积分/月，Code + Work 双形态",
    quotaType: "credits", quotaAmount: 4000, quotaUnit: "积分/月", quotaWindow: "monthly",
    capacityIndex: 56, contextNote: "Doubao-Seed / DeepSeek / Kimi / GLM / MiniMax / Qwen 多模型",
    toolCompat: { "Trae": "official", "VS Code": "community" },
    scenarios: ["light", "fullstack", "frontend"],
    pros: ["多模型自由切换", "国内版功能开放度高，SOLO 自主模式可用"],
    cons: ["4,000 积分重度使用偏紧", "高峰期可能排队"],
    recommendedFor: ["想要多模型轮换的日常开发"], notRecommendedFor: ["追求单一旗舰模型上限"],
    verified: "2026-08-28T10:00:00+08:00", trust: "official_verified",
    scores: { ability: 84, quota: 56, price: 76, toolCompat: 70, stability: 84, cnExperience: 95 }, trend: 1, heat: 72,
  },
  {
    p: "trae", name: "Trae Pro+", slug: "trae-pro-plus", price: 239, region: "domestic",
    tagline: "12,000 通用积分/月",
    quotaType: "credits", quotaAmount: 12000, quotaUnit: "积分/月", quotaWindow: "monthly",
    capacityIndex: 76, contextNote: "Doubao-Seed / DeepSeek / Kimi / GLM / MiniMax / Qwen 多模型",
    toolCompat: { "Trae": "official", "VS Code": "community" },
    scenarios: ["fullstack", "agent", "frontend"],
    pros: ["积分是 Pro 的 3 倍", "云端任务可并行提交"],
    cons: ["积分有效期仅 31 天", "深度推理能力弱于 Claude/GPT 系"],
    recommendedFor: ["中重度使用 Trae 生态的开发者"], notRecommendedFor: ["只用 IDE 补全的用户"],
    verified: "2026-08-28T10:00:00+08:00", trust: "official_verified",
    scores: { ability: 85, quota: 80, price: 52, toolCompat: 70, stability: 84, cnExperience: 95 }, trend: 1, heat: 58,
  },
  {
    p: "trae", name: "Trae Ultra", slug: "trae-ultra", price: 699, region: "domestic",
    tagline: "40,000 通用积分/月",
    quotaType: "credits", quotaAmount: 40000, quotaUnit: "积分/月", quotaWindow: "monthly",
    capacityIndex: 94, contextNote: "Doubao-Seed / DeepSeek / Kimi / GLM / MiniMax / Qwen 多模型",
    toolCompat: { "Trae": "official", "VS Code": "community" },
    scenarios: ["agent", "bigrepo", "fullstack"],
    pros: ["积分天花板", "企业微信/钉钉/飞书生态打通"],
    cons: ["月费接近 Claude Max 5x", "模型精度非第一梯队"],
    recommendedFor: ["深度绑定字节生态的团队"], notRecommendedFor: ["追求模型能力上限的用户"],
    verified: "2026-08-28T10:00:00+08:00", trust: "official_verified",
    scores: { ability: 85, quota: 95, price: 26, toolCompat: 70, stability: 84, cnExperience: 95 }, trend: 0, heat: 40,
  },

  // ===== 百度文心快码 Comate =====
  {
    p: "baidu", name: "文心快码 个人专业版", slug: "comate-pro", price: 59, usdNote: "原价 ¥100/月，限时优惠", region: "domestic",
    tagline: "含 ¥55 模型额度 + Auto-Free 150k tokens/h",
    quotaType: "credits", quotaAmount: 55, quotaUnit: "元模型额度/月", quotaWindow: "monthly",
    fastQuota: "Auto-Free 150k tokens/h",
    capacityIndex: 50, contextNote: "文心 5.0 / DeepSeek V4 / Kimi / MiniMax M3 / GLM 多款 SOTA",
    toolCompat: { "Comate": "official", "VS Code": "official", "JetBrains": "official" },
    scenarios: ["light", "fullstack", "frontend"],
    pros: ["限时 ¥59（原价 ¥100）", "多款 SOTA 模型可免费试用"],
    cons: ["模型额度仅 ¥55/月", "Zulu 多智能体消耗较快"],
    recommendedFor: ["百度生态用户", "预算敏感的日常开发者"],
    notRecommendedFor: ["重度 Agent 工作流"],
    verified: "2026-08-28T10:00:00+08:00", trust: "official_detected",
    scores: { ability: 80, quota: 52, price: 86, toolCompat: 74, stability: 86, cnExperience: 93 }, trend: 0, heat: 54,
  },
  {
    p: "baidu", name: "文心快码 个人旗舰版", slug: "comate-max", price: 199, usdNote: "原价 ¥299/月，限时优惠", region: "domestic",
    tagline: "含 ¥199 模型额度 + Auto-Free 限时不限量",
    quotaType: "credits", quotaAmount: 199, quotaUnit: "元模型额度/月", quotaWindow: "monthly",
    fastQuota: "Auto-Free 限时不限量（至 2026-12-31）",
    capacityIndex: 78, contextNote: "文心 5.0 / DeepSeek V4 / Kimi / MiniMax M3 / GLM 多款 SOTA",
    toolCompat: { "Comate": "official", "VS Code": "official", "JetBrains": "official" },
    scenarios: ["fullstack", "agent", "backend", "frontend"],
    pros: ["Auto-Free 限时不限量（年底前）", "SPEC 模式白盒化交付"],
    cons: ["不限量为限时活动，2027 年起恢复限额"],
    recommendedFor: ["想大量试用 SOTA 模型的用户"], notRecommendedFor: ["需要长期稳定预期的团队"],
    verified: "2026-08-28T10:00:00+08:00", trust: "official_detected",
    scores: { ability: 81, quota: 82, price: 56, toolCompat: 74, stability: 86, cnExperience: 93 }, trend: 1, heat: 48,
  },

  // ===== 阿里云 Qoder CN（原通义灵码，与百炼 Token Plan 是不同产品）=====
  {
    p: "alibaba", name: "Qoder CN Pro", slug: "qoder-pro", price: 59, region: "domestic",
    tagline: "2,000 Credits/月，插件 + 独立 IDE 双形态",
    quotaType: "credits", quotaAmount: 2000, quotaUnit: "Credits/月", quotaWindow: "monthly",
    capacityIndex: 48, contextNote: "Qwen 系列，Java/Go 后端支持最好",
    toolCompat: { "Qoder": "official", "VS Code": "official", "JetBrains": "official", "官方 CLI": "official" },
    scenarios: ["light", "backend", "fullstack"],
    pros: ["¥59 入门，Credits 跨 Desktop/IDE/CLI 通用", "Spring Boot 等后端项目补全精准"],
    cons: ["2,000 Credits 重度使用偏紧", "前端能力弱于后端"],
    recommendedFor: ["Java/Go 后端开发者", "阿里云生态用户"],
    notRecommendedFor: ["以前端为主的开发"],
    verified: "2026-08-28T10:00:00+08:00", trust: "official_detected",
    scores: { ability: 82, quota: 50, price: 84, toolCompat: 78, stability: 90, cnExperience: 94 }, trend: 0, heat: 58,
  },
  {
    p: "alibaba", name: "Qoder CN Pro+", slug: "qoder-pro-plus", price: 169, region: "domestic",
    tagline: "6,000 Credits/月，Quest 多 Agent 模式",
    quotaType: "credits", quotaAmount: 6000, quotaUnit: "Credits/月", quotaWindow: "monthly",
    capacityIndex: 72, contextNote: "Qwen 系列，Quest 2.0 + Expert 专家团",
    toolCompat: { "Qoder": "official", "VS Code": "official", "JetBrains": "official", "官方 CLI": "official" },
    scenarios: ["backend", "fullstack", "agent"],
    pros: ["Credits 是 Pro 的 3 倍", "Quest 多 Agent 模式可用"],
    cons: ["团队功能需另购（¥99/席位起）"],
    recommendedFor: ["中重度后端开发", "需要多 Agent 协作的场景"],
    notRecommendedFor: ["轻度使用者"],
    verified: "2026-08-28T10:00:00+08:00", trust: "official_detected",
    scores: { ability: 83, quota: 76, price: 58, toolCompat: 78, stability: 90, cnExperience: 94 }, trend: 1, heat: 52,
  },

  // ===== Windsurf（Cognition 旗下，原 Windsurf IDE）=====
  {
    p: "windsurf", name: "Windsurf Pro", slug: "windsurf-pro", price: 144, usdNote: "$20/月", region: "overseas",
    tagline: "Cascade 智能代理引擎，配额制",
    quotaType: "requests", quotaAmount: 500, quotaUnit: "次提示/月", quotaWindow: "monthly",
    capacityIndex: 54, contextNote: "多前沿模型路由，128K 上下文",
    toolCompat: { "Windsurf": "official", "VS Code": "community" },
    scenarios: ["frontend", "fullstack", "light"],
    pros: ["Cascade 流式协作体验好", "中小型后端重构与脚本场景顺手"],
    cons: ["2026 年改为配额制，额度不如以往宽松", "国内访问需要网络条件"],
    recommendedFor: ["想要 Cursor 替代品的开发者"], notRecommendedFor: ["无法稳定访问国际网络的用户"],
    verified: "2026-08-28T10:00:00+08:00", trust: "official_verified",
    scores: { ability: 84, quota: 58, price: 62, toolCompat: 72, stability: 80, cnExperience: 38 }, trend: -1, heat: 56,
  },
  {
    p: "windsurf", name: "Windsurf Max", slug: "windsurf-max", price: 1440, usdNote: "$200/月", region: "overseas",
    tagline: "额度大幅提升的重度档",
    quotaType: "requests", quotaAmount: 5000, quotaUnit: "次提示/月", quotaWindow: "monthly",
    capacityIndex: 92, contextNote: "多前沿模型路由，128K 上下文",
    toolCompat: { "Windsurf": "official", "VS Code": "community" },
    scenarios: ["agent", "bigrepo", "fullstack"],
    pros: ["额度天花板", "重度 Agent 使用不必频繁看额度"],
    cons: ["月费四位数", "国内访问需要网络条件"],
    recommendedFor: ["全天候使用 Windsurf 的重度用户"], notRecommendedFor: ["绝大多数开发者"],
    verified: "2026-08-28T10:00:00+08:00", trust: "official_verified",
    scores: { ability: 85, quota: 92, price: 14, toolCompat: 72, stability: 80, cnExperience: 38 }, trend: 0, heat: 26,
  },

  // ===== Devin（Cognition 云端自主 Agent，按 ACU 计费）=====
  {
    p: "cognition", name: "Devin Core", slug: "devin-core", price: 144, usdNote: "$20/月 + $2.25/ACU 用量", region: "overseas",
    tagline: "云端自主 Agent，基础席位 + 按 ACU 计费",
    quotaType: "requests", quotaAmount: null, quotaUnit: "按 ACU 计费", quotaWindow: "payg",
    capacityIndex: 40, contextNote: "自主软件工程师，1 ACU ≈ 15 分钟工作",
    toolCompat: { "Devin": "official" },
    scenarios: ["agent"],
    pros: ["可托管派发工单级任务", "按 ACU 计费，不用时为 0"],
    cons: ["重度使用账单可能远超月费", "复杂任务成功率仍在提升"],
    recommendedFor: ["想把明确范围的任务托管出去的团队"], notRecommendedFor: ["需要交互式编程的场景"],
    verified: "2026-08-28T10:00:00+08:00", trust: "official_verified",
    scores: { ability: 82, quota: 44, price: 48, toolCompat: 50, stability: 76, cnExperience: 34 }, trend: 0, heat: 44,
  },

  // ===== Replit（云端 IDE + Agent）=====
  {
    p: "replit", name: "Replit Core", slug: "replit-core", price: 180, usdNote: "$25/月（年付约 $20）", region: "overseas",
    tagline: "$25 额度/月，最多 2 个并行 Agent",
    quotaType: "credits", quotaAmount: 25, quotaUnit: "USD 额度/月", quotaWindow: "monthly",
    capacityIndex: 46, contextNote: "云端 IDE + Agent，零配置全流程",
    toolCompat: { "Replit": "official" },
    scenarios: ["light", "frontend"],
    pros: ["零配置，浏览器里就能跑完整应用", "适合教学与快速原型"],
    cons: ["按 effort 计费，额度消耗不可精确预测", "国内访问需要网络条件"],
    recommendedFor: ["非工程背景的原型验证", "教学与协作场景"],
    notRecommendedFor: ["专业工程团队的日常开发"],
    verified: "2026-08-28T10:00:00+08:00", trust: "official_verified",
    scores: { ability: 76, quota: 48, price: 56, toolCompat: 52, stability: 78, cnExperience: 36 }, trend: 0, heat: 42,
  },
  {
    p: "replit", name: "Replit Pro", slug: "replit-pro", price: 720, usdNote: "$100/月（年付约 $95）", region: "overseas",
    tagline: "$100 额度/月，最多 10 个并行 Agent",
    quotaType: "credits", quotaAmount: 100, quotaUnit: "USD 额度/月", quotaWindow: "monthly",
    capacityIndex: 78, contextNote: "云端 IDE + Agent，最多 15 名协作者",
    toolCompat: { "Replit": "official" },
    scenarios: ["frontend", "fullstack", "agent"],
    pros: ["并行 Agent 数提升到 10", "协作人数上限 15"],
    cons: ["费用偏高", "仍受 effort 计费影响"],
    recommendedFor: ["需要多人协作的原型团队"], notRecommendedFor: ["个人日常开发"],
    verified: "2026-08-28T10:00:00+08:00", trust: "official_verified",
    scores: { ability: 77, quota: 78, price: 30, toolCompat: 52, stability: 78, cnExperience: 36 }, trend: 0, heat: 28,
  },

  // ===== Zed（原生高性能编辑器）=====
  {
    p: "zed", name: "Zed Pro", slug: "zed-pro", price: 72, usdNote: "$10/月（含 $5 模型额度）", region: "overseas",
    tagline: "编辑预测为主，含 $5 模型额度",
    quotaType: "credits", quotaAmount: 5, quotaUnit: "USD 额度/月", quotaWindow: "monthly",
    capacityIndex: 30, contextNote: "可接 OpenAI / Anthropic / Google / Ollama 等",
    toolCompat: { "Zed": "official" },
    scenarios: ["light", "frontend"],
    pros: ["编辑器性能顶尖，支持 ACP 托管其他 Agent", "可 BYOK，接自己的 API"],
    cons: ["$5 额度很少，本质是买编辑器不是买 token", "超额按 API 价 +10% 计费"],
    recommendedFor: ["看重编辑器性能、自备 API 的开发者"], notRecommendedFor: ["想要大包额度套餐的用户"],
    verified: "2026-08-28T10:00:00+08:00", trust: "official_verified",
    scores: { ability: 74, quota: 26, price: 72, toolCompat: 68, stability: 88, cnExperience: 40 }, trend: 0, heat: 34,
  },

  // ===== Cline（开源 BYOK）=====
  {
    p: "cline", name: "Cline（自带 API Key）", slug: "cline-byok", price: 0, region: "overseas",
    tagline: "开源免费，费用取决于自备的模型 API",
    quotaType: "token", quotaAmount: null, quotaUnit: "按自备 API 计费", quotaWindow: "payg",
    capacityIndex: 60, contextNote: "模型自选，取决于你接的 API",
    toolCompat: { "Cline": "official", "VS Code": "official" },
    scenarios: ["agent", "fullstack", "backend", "debug"],
    pros: ["软件本身完全免费开源", "模型可自选，无厂商锁定"],
    cons: ["费用全走 API，重度使用可能超过订阅制", "需要自己配置 API Key"],
    recommendedFor: ["已有 API 额度、想完全掌控成本的工程师"],
    notRecommendedFor: ["不想折腾配置、想要固定月费的用户"],
    verified: "2026-08-28T10:00:00+08:00", trust: "official_verified",
    scores: { ability: 84, quota: 70, price: 80, toolCompat: 80, stability: 82, cnExperience: 58 }, trend: 1, heat: 52,
  },

];

// PlanModel 关系
const pm = {
  "kimi-allegretto": [["kimi-k3", 1, true], ["kimi-k2-5", 1, false]],
  "kimi-presto": [["kimi-k2-5", 1, true], ["kimi-k3", 2, false]],
  "glm-pro": [["glm-4.7", 1, true], ["glm-flash", 0.5, false]],
  "glm-flash-free": [["glm-flash", 1, true]],
  "minimax-coding": [["minimax-m3", 1, true]],
  "deepseek-payg": [["deepseek-v4", 1, true], ["deepseek-r2", 2, false]],
  "marscode-pro": [["doubao-seed-code", 1, true]],
  "claude-pro": [["claude-sonnet-5", 1, true], ["claude-opus-5", 8, false]],
  "claude-max-5x": [["claude-opus-5", 1, true], ["claude-sonnet-5", 1, false]],
  "codex-plus": [["gpt-5.2-codex", 1, true], ["gpt-5-codex-mini", 0.4, false]],
  "cursor-pro": [["cursor-composer-1", 1, true], ["claude-sonnet-5", 5, false]],
  "copilot-pro": [["claude-sonnet-5", 4, false], ["gemini-3-flash", 1, true], ["gpt-5.2-codex", 4, false]],
  "copilot-free": [["gpt-5-codex-mini", 1, true]],
  "gemini-ai-pro": [["gemini-3-pro", 1, true], ["gemini-3-flash", 0.5, false]],
  "opencode-zen": [["deepseek-v4", 1, true], ["glm-4.7", 1, false], ["claude-sonnet-5", 6, false]],
};

// ---------- Changes: [type, planSlug|null, modelSlug|null, title, summary, importance, from, to, sourceType, dateISO, impactText]
const N = null;
const changes = [
  ["new_model", N, "kimi-k3", "新增 K3 模型", "Coding Plan 已支持 K3，Agent 能力与长上下文能力进一步提升。", "major", 89, 92, "official", "2026-08-25T09:10:00+08:00", "推荐指数 89 → 92 ↑"],
  ["capability", "kimi-allegretto", N, "Allegretto 开放 K3 全速访问", "原先限速模式取消，Claude Code 接入延迟下降约 30%（编辑部实测）。", "major", 92, 93, "editorial", "2026-08-25T20:00:00+08:00", "推荐指数 92 → 93 ↑"],
  ["policy", "claude-pro", N, "周额度政策进一步收紧", "5h 上限下调 15%，周末恢复。社区普遍反映重度用户受影响明显。", "major", 90, 88, "official", "2026-08-15T08:00:00+08:00", "推荐指数 90 → 88 ↓"],
  ["new_model", N, "deepseek-v4", "DeepSeek V4 正式发布", "160K 上下文，代码基准追平上一代旗舰 96%，API 价格不变。", "major", 86, 89, "benchmark", "2026-06-30T10:00:00+08:00", "评分 86 → 89 ↑"],
  ["new_model", N, "gpt-5.2-codex", "GPT-5.2-Codex 上线 Plus", "Plus 档解锁新 Codex 模型，云端并行任务升至 8 个。", "normal", N, N, "official", "2026-07-22T10:00:00+08:00", N],
  ["delist", "cursor-pro", N, "Cursor Business Lite 下架", "少于 10 席的团队计划并入 Standard。", "minor", N, N, "official", "2026-07-02T10:00:00+08:00", N],
  ["capability", N, "claude-opus-5", "Opus 5 长上下文一致性大幅提升", "500K 上下文召回测试通过率从 71% 提升至 89%。", "major", N, N, "benchmark", "2026-05-20T10:00:00+08:00", N],
  ["launch", "copilot-free", N, "GitHub Copilot Free 上线", "所有 GitHub 用户每月 50 次 premium 额度 + 无限基础补全。", "normal", N, N, "official", "2026-06-12T10:00:00+08:00", N],
  ["price", "deepseek-payg", N, "API 输出价格再降 12%", "V4 输出 ¥20/M tokens，按量方案月支出预期进一步降低。", "minor", 78, 78, "official", "2026-07-15T10:00:00+08:00", N],
  ["capability", N, "glm-4.7", "GLM-4.7 Debug 能力升级", "SWE-bench Verified 提升 2.3 个百分点。", "normal", 89, 90, "benchmark", "2026-07-20T10:00:00+08:00", "评分 89 → 90 ↑"],
  ["capability", N, "claude-sonnet-5", "Sonnet 5 前端小版本更新", "UI 代码还原度改进，Tailwind 组件贴合度提升。", "minor", N, N, "editorial", "2026-08-10T10:00:00+08:00", N],

  // ===== 2026-08 已核实变化（来源：各厂商官方定价页）=====
  [new_model, N, "glm-5-3", "GLM-5.3 发布并全量进入 GLM Coding Plan", "2026-08-14 发布、08-19 API 上线。Terminal-Bench 3.0 由 4.6 提升至 28.3；1M 上下文 / 128K 最大输出。", "major", 52, 59, "benchmark", "2026-08-19T10:00:00+08:00", "AA Intelligence 52.6 → 59.5 ↑"],
  [new_model, N, "kimi-k3", "Kimi K3 发布：2.8T 参数、1M 上下文", "2026-07-17 发布。需 Moderato（¥99）及以上档位解锁，完整 1M 上下文仅 Allegro（¥699）档提供。", "major", 45, 60, "official", "2026-07-17T10:00:00+08:00", "AA Intelligence 45.1 → 59.7 ↑"],
  [new_model, N, "claude-opus-5", "Claude Opus 5 上线，$5/$25 per MTok", "2026-07-24 上线，带 effort 调节档位，是当前对 token 账单影响最大的杠杆之一。", "major", 55, 63, "official", "2026-07-24T10:00:00+08:00", "AA Intelligence 55.3 → 63.1 ↑"],
  [policy, "claude-pro", N, "Claude Fable 5 改为按 API 额度计费", "自 2026-07-20 起 Fable 5 不再计入订阅额度，改按标准 API 费率（$10/$50）走用量额度；Max 与 Team Premium 保留周额度的 50%。", "major", 78, 73, "official", "2026-07-20T10:00:00+08:00", "推荐指数 78 → 73 ↓"],
  [price, "claude-pro", N, "Claude Sonnet 5 将于 9/1 起提价 50%", "Sonnet 5 由 $2/$10 调整为 $3/$15 per 1M tokens，2026-09-01 生效。走 API 的用户成本上升明显。", "major", 73, 70, "official", "2026-08-25T10:00:00+08:00", "推荐指数 73 → 70 ↓"],
  [policy, "claude-max-5x", N, "Claude 周额度 +50% 促销于 8/19 到期", "自 2026-05 起多次延期的周额度 +50% 促销于 2026-08-19 到期，周额度恢复基准值。", "major", 80, 76, "official", "2026-08-19T10:00:00+08:00", "推荐指数 80 → 76 ↓"],
  [launch, "cursor-hobby", N, "Cursor 推出 Start 计划（印度）", "₹649/月（含税），覆盖 Cursor Models 额度池与 Cloud Agents；不含 Other Models 额度池、Bugbot 与 Auto。", "normal", N, N, "official", "2026-08-12T10:00:00+08:00", N],
  [new_model, "cursor-pro", "grok-4-6", "Grok 4.6 上线并进入 Cursor Models 池", "2026-08-12 起一周内享 50% 上线折扣。与 Grok 4.5、Composer 2.5 同属 Cursor Models 额度池。", "normal", 55, 61, "official", "2026-08-12T10:00:00+08:00", "AA Intelligence 55.8 → 60.9 ↑"],
  [price, "deepseek-payg", N, "DeepSeek 官方公告计划上调定价", "官方文档提示「近期计划上调整体定价，涨幅较大」但未给具体日期。", "major", 82, 76, "official", "2026-08-20T10:00:00+08:00", "推荐指数 82 → 76 ↓"],
  [launch, "qwen-lite", N, "阿里云百炼 Qwen Token Plan 改用 Credits 制", "入门档 700 Credits/5h、2,500 Credits/周，含 Qwen3.8-Max、DeepSeek-V4-Pro、qwen3-coder 与 GLM。", "normal", N, N, "official", "2026-08-10T10:00:00+08:00", N],
  [policy, "volc-ark-small", N, "火山方舟 Agent Plan 活动价 ¥9.9 起", "Small / Medium 档活动期 ¥9.9/月（限前两月），第三月起回到 ¥40 刊例价。", "normal", 77, 77, "official", "2026-08-01T10:00:00+08:00", N],

];

async function main() {
  await db.reviewItem.deleteMany();
  await db.sourceMonitor.deleteMany();
  await db.changeLog.deleteMany();
  await db.pricePoint.deleteMany();
  await db.planModel.deleteMany();
  await db.planScore.deleteMany();
  await db.modelScore.deleteMany();
  await db.plan.deleteMany();
  await db.model.deleteMany();
  await db.provider.deleteMany();

  const provMap = {};
  for (const pv of providers) provMap[pv.slug] = await db.provider.create({ data: pv });
  const ocProvider = await db.provider.create({
    data: { name: "OpenCode Community", slug: "opencode", country: "overseas", logoColor: "#0891B2", website: "https://opencode.ai" },
  });

  const modelMap = {};
  for (const m of models) {
    const [ps, name, slug, ctxK, inP, outP, rel, sc, strengths, weaknesses, recSc, trend] = m;
    const created = await db.model.create({
      data: {
        providerId: provMap[ps].id, name, slug, contextK: ctxK,
        inputPrice: inP, outputPrice: outP, releaseDate: rel,
        strengths: J(strengths), weaknesses: J(weaknesses), recommendedScenarios: J(recSc),
        score: {
          create: {
            overall: sc[0], coding: sc[1], agent: sc[2], frontend: sc[3], backend: sc[4],
            debug: sc[5], longContext: sc[6], speed: sc[7], cost: sc[8], trend,
          },
        },
      },
    });
    modelMap[slug] = created;
  }

  const planMap = {};
  for (const pl of plans) {
    // 统一取 provider 对象：officialUrl 与 status 都依赖它的 website
    const provider = pl.p === "__oc__" ? ocProvider : provMap[pl.p];
    const providerId = provider.id;
    // 与后台发布规则保持一致：只有存在官方来源 URL 才允许 published。
    // 否则套餐会卡在 draft，而前台 /plans 只查 published，导致页面长期空白。
    // 优先 officialSource（套餐价格页，比官网首页更精确），缺失时才用 website
    const officialUrl = provider.officialSource || provider.website || null;
    const s = pl.scores;
    // 与 src/lib/config.ts 的 PLAN_WEIGHTS / calcPlanOverall 保持一致
    const overall = Math.round(s.ability * 0.30 + s.quota * 0.25 + s.price * 0.20 + s.toolCompat * 0.10 + s.stability * 0.10 + s.cnExperience * 0.05);
    const created = await db.plan.create({
      data: {
        providerId, name: pl.name, slug: pl.slug, tagline: pl.tagline,
        priceCny: pl.price, currency: "CNY", priceNote: pl.usdNote || "",
        billingCycle: pl.price === 0 ? "free" : "monthly", region: pl.region,
        quotaType: pl.quotaType, quotaAmount: pl.quotaAmount, quotaUnit: pl.quotaUnit,
        quotaWindow: pl.quotaWindow, fastQuota: pl.fastQuota || null, normalQuota: pl.normalQuota || null,
        capacityIndex: pl.capacityIndex, contextNote: pl.contextNote || null,
        tools: J(Object.keys(pl.toolCompat)),
        toolCompat: J(pl.toolCompat),
        scenarios: J(pl.scenarios),
        pros: J(pl.pros), cons: J(pl.cons),
        recommendedFor: J(pl.recommendedFor), notRecommendedFor: J(pl.notRecommendedFor),
        officialUrl,
        lastVerifiedAt: new Date(pl.verified), trustLevel: pl.trust,
        status: officialUrl ? "published" : "draft",
        score: {
          create: {
            ability: s.ability, quota: s.quota, price: s.price, toolCompat: s.toolCompat,
            stability: s.stability, cnExperience: s.cnExperience,
            overall, trend: pl.trend, heat: pl.heat,
          },
        },
      },
    });
    planMap[pl.slug] = created;
  }

  for (const [planSlug, list] of Object.entries(pm)) {
    for (const [modelSlug, mult, rec] of list) {
      if (!planMap[planSlug] || !modelMap[modelSlug]) continue;
      await db.planModel.create({ data: { planId: planMap[planSlug].id, modelId: modelMap[modelSlug].id, multiplier: mult, recommended: rec } });
    }
  }

  // providerId -> provider，供 ChangeLog 回填可点击来源使用
  const providerById = {};
  for (const pv of Object.values(provMap)) providerById[pv.id] = pv;
  providerById[ocProvider.id] = ocProvider;

  for (const ch of changes) {
    const [type, planSlug, modelSlug, title, summary, importance, from, to, src, dateISO, impactText] = ch;
    const plan = planSlug ? planMap[planSlug] : null;
    const model = modelSlug ? modelMap[modelSlug] : null;
    const provider = (plan && providerById[plan.providerId]) || (model && providerById[model.providerId]) || null;
    // /changes 页面只展示「已核验 + 非编辑类 + 有可点击来源」的记录，
    // 缺 sourceUrl / sourceTitle / checkedAt 会导致整页为空。
    const sourceUrl = provider ? provider.officialSource || provider.website || null : null;
    const sourceTitle = provider ? `${provider.name} 官方页面` : null;
    await db.changeLog.create({
      data: {
        entityType: planSlug ? "plan" : modelSlug ? "model" : "provider",
        entitySlug: planSlug || modelSlug || null,
        planId: plan ? plan.id : null,
        modelId: model ? model.id : null,
        changeType: type, title, summary, importance,
        impactFrom: typeof from === "number" ? from : null,
        impactTo: typeof to === "number" ? to : null,
        impactText, sourceType: src,
        sourceUrl, sourceTitle, checkedAt: new Date(dateISO),
        detectedAt: new Date(dateISO), verified: true,
      },
    });
  }

  // 价格历史：近 26 周（含最近两周逐日），含 4 个调价阶梯
  const now = Date.now();
  const stepPlan = { "glm-pro": [79, 59], "cursor-pro": [131, 146], "marscode-pro": [89, 69], "kimi-allegretto": [169, 199] };
  const points = [];
  for (let i = 24; i >= 1; i--) points.push(new Date(now - i * 7 * 864e5));
  for (let i = 13; i >= 0; i--) points.push(new Date(now - i * 864e5));
  for (const pl of Object.values(planMap)) {
    const steps = stepPlan[pl.slug];
    const seen = new Set();
    for (const d of points) {
      const key = d.toISOString().slice(0, 10);
      if (seen.has(key)) continue;
      seen.add(key);
      const price = steps ? (d.getTime() < now - 21 * 864e5 ? steps[0] : steps[1]) : pl.priceCny;
      await db.pricePoint.create({ data: { planId: pl.id, date: d, priceCny: price } });
    }
  }

  // 监控源：只收录实测可抓取的页面（2026-08-29 用 AIPlanRadarBot UA 逐个验证）。
  // 未收录：OpenAI 403 反爬、MiniMax 500、Gemini fetch 失败、Windsurf/Devin 429 限流。
  // 「SPA」标记 = 价格由 JS 渲染，只能抓到骨架，hash 比对仅能发现「页面更新过」，
  // 抓不到具体价格数字；这类源会报警但需人工到官网确认。
  const monitorSources = [
    { label: "Kimi 官方定价页", url: "https://platform.moonshot.cn/docs/pricing/chat", providerSlug: "moonshot" },
    { label: "Anthropic 定价页", url: "https://www.anthropic.com/pricing", providerSlug: "anthropic" },
    { label: "Cursor 定价文档", url: "https://cursor.com/docs/account/pricing", providerSlug: "cursor" },
    { label: "GitHub Copilot 介绍页", url: "https://github.com/features/copilot", providerSlug: "github" },
    { label: "腾讯云 CodeBuddy 定价", url: "https://codebuddy.cn/docs/workbuddy/Pricing", providerSlug: "tencent" },
    { label: "DeepSeek 定价文档", url: "https://api-docs.deepseek.com/quick_start/pricing", providerSlug: "deepseek" },
    { label: "阿里云百炼模型列表", url: "https://help.aliyun.com/zh/model-studio/models", providerSlug: "alibaba" },
    { label: "小米 MiMo", url: "https://mimo.xiaomi.com", providerSlug: "xiaomi" },
    { label: "OpenCode 官网", url: "https://opencode.ai", providerSlug: "opencode" },
    { label: "Replit 定价页", url: "https://replit.com/pricing", providerSlug: "replit" },
    { label: "Zed 定价页", url: "https://zed.dev/pricing", providerSlug: "zed" },
    { label: "Cline 官网", url: "https://cline.bot", providerSlug: "cline" },
    { label: "智谱 GLM 订阅页（SPA）", url: "https://bigmodel.cn/glm-coding", providerSlug: "zhipu" },
    { label: "字节 Trae 定价页（SPA）", url: "https://www.trae.com.cn/pricing", providerSlug: "trae" },
    { label: "百度文心快码（SPA）", url: "https://comate.baidu.com", providerSlug: "baidu" },
    { label: "火山方舟（SPA）", url: "https://www.volcengine.com/product/ark", providerSlug: "volcengine" },
    { label: "腾讯混元官网", url: "https://hunyuan.tencent.com", providerSlug: "tencent" },
    { label: "腾讯云混元文档", url: "https://cloud.tencent.com/document/product/1729", providerSlug: "tencent" },
    // 媒体 RSS 源（kind:"rss"）：条目采集 + 关键词预筛 + LLM 筛选（scripts/analyze-rss.mjs）后入库
    { label: "量子位", url: "https://www.qbitai.com/feed", kind: "rss" },
    { label: "InfoQ 中文", url: "https://www.infoq.cn/feed", kind: "rss" },
    { label: "少数派", url: "https://sspai.com/feed", kind: "rss" },
    { label: "TechCrunch AI", url: "https://techcrunch.com/category/artificial-intelligence/feed/", kind: "rss" },
    { label: "VentureBeat AI", url: "https://venturebeat.com/category/ai/feed/", kind: "rss" },
    { label: "The Verge", url: "https://www.theverge.com/rss/index.xml", kind: "rss" },
    { label: "Hacker News(AI)", url: "https://hnrss.org/newest?q=AI+model&count=20", kind: "rss" },
  ];
  for (const s of monitorSources) await db.sourceMonitor.create({ data: s });

  const publishedCount = await db.plan.count({ where: { status: "published" } });
  console.log(
    `Seed done: providers=${providers.length} plans=${plans.length} models=${models.length} changes=${changes.length}\n` +
      `前台可见套餐（published）= ${publishedCount} / ${plans.length}` +
      (publishedCount < plans.length
        ? `；${plans.length - publishedCount} 个因所属 Provider 缺 website 而保持 draft，前台 /plans 不会展示`
        : ""),
  );
}

main().finally(() => db.$disconnect());
