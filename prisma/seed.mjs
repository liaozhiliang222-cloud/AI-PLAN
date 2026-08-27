/* AI Plan Radar Demo Seed —— MVP 示例数据（2026-08），价格/评分为演示值，后台可编辑 */
import pkg from "@prisma/client";
const { PrismaClient } = pkg;

const db = new PrismaClient();
const J = JSON.stringify;

// ---------- Providers ----------
const providers = [
  { name: "Moonshot AI", slug: "moonshot", country: "domestic", logoColor: "#0F172A", website: "https://www.moonshot.cn", officialSource: "https://platform.moonshot.cn/docs/pricing/chat" },
  { name: "智谱 AI", slug: "zhipu", country: "domestic", logoColor: "#2563EB", website: "https://bigmodel.cn", officialSource: "https://open.bigmodel.cn/pricing" },
  { name: "MiniMax", slug: "minimax", country: "domestic", logoColor: "#DB2777", website: "https://www.minimaxi.com" },
  { name: "DeepSeek", slug: "deepseek", country: "domestic", logoColor: "#4D6BFE", website: "https://www.deepseek.com" },
  { name: "火山方舟", slug: "volcengine", country: "domestic", logoColor: "#EA580C", website: "https://www.volcengine.com/product/ark" },
  { name: "Anthropic", slug: "anthropic", country: "overseas", logoColor: "#C2410C", website: "https://www.anthropic.com", officialSource: "https://www.anthropic.com/pricing" },
  { name: "OpenAI", slug: "openai", country: "overseas", logoColor: "#111827", website: "https://openai.com" },
  { name: "Cursor", slug: "cursor", country: "overseas", logoColor: "#334155", website: "https://cursor.com/pricing" },
  { name: "GitHub", slug: "github", country: "overseas", logoColor: "#6B21A8", website: "https://github.com/features/copilot" },
  { name: "Google", slug: "google", country: "overseas", logoColor: "#2563EB", website: "https://ai.google.dev" },
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
const plans = [
  {
    p: "moonshot", name: "Kimi Allegretto", slug: "kimi-allegretto", price: 199, region: "domestic",
    tagline: "主力 Coding 套餐：K3 全速 + 宽裕额度",
    quotaType: "credits", quotaAmount: 6000, quotaUnit: "Credits/月", quotaWindow: "monthly",
    fastQuota: "1500 Credits/5h 高速", normalQuota: "夜间低速池基本不限", capacityIndex: 82,
    contextNote: "K3 支持 256K 上下文",
    toolCompat: { "Claude Code": "community", "OpenCode": "official", "VS Code": "unverified", "官方 CLI": "official" },
    scenarios: ["fullstack", "agent", "bigrepo", "debug"],
    pros: ["K3 支持，Agent 与长上下文领先同价位", "Claude Code 可接", "国内直连快"],
    cons: ["高峰时段高速额度有限"],
    recommendedFor: ["每天使用 AI Coding", "中重度 Agent 开发", "长上下文项目", "需要国内稳定访问"],
    notRecommendedFor: ["每周只偶尔 Coding", "单纯追求最强模型性能"],
    verified: "2026-08-27T11:20:00+08:00", trust: "official_verified",
    scores: { ability: 92, quota: 90, price: 86, toolCompat: 78, stability: 88, cnExperience: 96 }, trend: 3, heat: 96,
  },
  {
    p: "moonshot", name: "Kimi Presto", slug: "kimi-presto", price: 49, region: "domestic",
    tagline: "入门套餐：轻度到中度 Coding 够用",
    quotaType: "credits", quotaAmount: 1400, quotaUnit: "Credits/月", quotaWindow: "monthly",
    capacityIndex: 52,
    toolCompat: { "OpenCode": "official", "官方 CLI": "official" },
    scenarios: ["light", "frontend"],
    pros: ["¥49 门槛低", "夜间低速可用 K3"],
    cons: ["无高速通道", "重度用户一周见底"],
    recommendedFor: ["学生与业余项目", "想先体验 Kimi 生态"],
    notRecommendedFor: ["日均 4 小时以上高强度使用"],
    verified: "2026-08-26T09:00:00+08:00", trust: "official_verified",
    scores: { ability: 86, quota: 62, price: 82, toolCompat: 68, stability: 84, cnExperience: 95 }, trend: 1, heat: 72,
  },
  {
    p: "zhipu", name: "GLM Pro", slug: "glm-pro", price: 59, region: "domestic",
    tagline: "¥59 用上 GLM-4.7，同价位性价比突出",
    quotaType: "tokens", quotaAmount: 120, quotaUnit: "M Tokens/月", quotaWindow: "monthly",
    capacityIndex: 64, contextNote: "GLM-4.7 128K",
    toolCompat: { "Claude Code": "official", "OpenCode": "community", "VS Code": "community", "官方 CLI": "official" },
    scenarios: ["fullstack", "backend", "debug", "light"],
    pros: ["同价位模型能力几乎最强", "Claude Code 官方接入文档完善", "价格低"],
    cons: ["上下文窗口小于竞品"],
    recommendedFor: ["预算敏感的全栈/后端开发者", "想低成本跑通 Claude Code"],
    notRecommendedFor: ["需要 200K+ 上下文的仓库分析场景"],
    verified: "2026-08-26T18:00:00+08:00", trust: "official_verified",
    scores: { ability: 90, quota: 76, price: 94, toolCompat: 84, stability: 88, cnExperience: 97 }, trend: 2, heat: 91,
  },
  {
    p: "zhipu", name: "GLM Flash 免费", slug: "glm-flash-free", price: 0, region: "domestic",
    tagline: "永久免费的 GLM-Flash 月度额度",
    quotaType: "tokens", quotaAmount: 30, quotaUnit: "M Tokens/月", quotaWindow: "monthly",
    capacityIndex: 22, contextNote: "GLM-Flash 128K",
    toolCompat: { "OpenCode": "community", "官方 CLI": "official" },
    scenarios: ["light"],
    pros: ["零成本试用完整工作流"],
    cons: ["模型能力有限，不适合正经交付"],
    recommendedFor: ["零预算学习者"], notRecommendedFor: ["任何交付型项目"],
    verified: "2026-08-20T10:00:00+08:00", trust: "official_verified",
    scores: { ability: 74, quota: 40, price: 100, toolCompat: 66, stability: 80, cnExperience: 97 }, trend: 0, heat: 55,
  },
  {
    p: "minimax", name: "MiniMax Coding", slug: "minimax-coding", price: 99, region: "domestic",
    tagline: "M3 驱动，额度非常宽松的中端套餐",
    quotaType: "points", quotaAmount: 8000, quotaUnit: "Points/月", quotaWindow: "monthly",
    capacityIndex: 68, contextNote: "M3 180K",
    toolCompat: { "OpenCode": "community", "官方 CLI": "official" },
    scenarios: ["fullstack", "light"],
    pros: ["Points 夜间双倍计价优惠", "可同时开 3 个并行会话"],
    cons: ["Agent 工具调用稳定性一般"],
    recommendedFor: ["中等强度全栈开发", "预算 ¥100 内想要宽额度"],
    notRecommendedFor: ["Agent 重度工作流"],
    verified: "2026-08-24T15:00:00+08:00", trust: "official_verified",
    scores: { ability: 81, quota: 84, price: 78, toolCompat: 62, stability: 80, cnExperience: 90 }, trend: -1, heat: 58,
  },
  {
    p: "deepseek", name: "DeepSeek 按量付费", slug: "deepseek-payg", price: 35, region: "domestic",
    tagline: "按 Token 计费，社区估算月支出 ¥35 起",
    quotaType: "token", quotaAmount: null, quotaUnit: "按量", quotaWindow: "payg",
    capacityIndex: 45, contextNote: "V4 160K / R2 120K",
    toolCompat: { "OpenCode": "community", "Claude Code": "community", "官方 CLI": "official" },
    scenarios: ["backend", "debug", "light"],
    pros: ["没有月费压力", "API 价格行业最低档"],
    cons: ["接 Claude Code 需要自建中转（社区方案）", "高峰限流常见"],
    recommendedFor: ["低频使用者", "喜欢精确控费的工程师"],
    notRecommendedFor: ["想要固定月费可预期账单的用户"],
    verified: "2026-08-23T12:00:00+08:00", trust: "community_verified",
    scores: { ability: 89, quota: 70, price: 92, toolCompat: 70, stability: 78, cnExperience: 92 }, trend: 1, heat: 70,
  },
  {
    p: "volcengine", name: "豆包 MarsCode Pro", slug: "marscode-pro", price: 69, region: "domestic",
    tagline: "火山方舟企业级 Coding 套餐",
    quotaType: "requests", quotaAmount: 3000, quotaUnit: "次/月", quotaWindow: "monthly",
    capacityIndex: 50, contextNote: "Seed Code 128K",
    toolCompat: { "VS Code": "official", "官方 CLI": "official" },
    scenarios: ["backend", "fullstack"],
    pros: ["发票与企业采购流程完善", "接入豆包全家桶"],
    cons: ["社区工具兼容少"],
    recommendedFor: ["有企业合规要求的团队"], notRecommendedFor: ["个人独立开发者（同类更优选择多）"],
    verified: "2026-08-22T16:00:00+08:00", trust: "official_detected",
    scores: { ability: 76, quota: 66, price: 80, toolCompat: 58, stability: 86, cnExperience: 94 }, trend: 0, heat: 44,
  },
  {
    p: "anthropic", name: "Claude Pro", slug: "claude-pro", price: 149, usdNote: "$20/月", region: "overseas",
    tagline: "Sonnet 5 主力，Coding 上限属第一梯队",
    quotaType: "requests", quotaAmount: 225, quotaUnit: "条 Sonnet 请求/5h", quotaWindow: "daily",
    fastQuota: "225 条/5h（另有独立周上限）", capacityIndex: 58, contextNote: "Sonnet 5 400K",
    toolCompat: { "Claude Code": "official", "OpenCode": "official", "Cursor": "official", "VS Code": "community", "官方 CLI": "official" },
    scenarios: ["fullstack", "agent", "debug", "bigrepo"],
    pros: ["模型质量天花板级", "Claude Code 原生优化", "生态兼容面最广"],
    cons: ["2026-07 起周额度收紧", "国内访问需要网络条件"],
    recommendedFor: ["追求 Coding 上限的资深开发者", "能稳定使用国际网络服务的用户"],
    notRecommendedFor: ["预算 ¥100 内", "无法稳定访问国际网络的用户"],
    verified: "2026-08-27T10:00:00+08:00", trust: "official_verified",
    scores: { ability: 95, quota: 66, price: 62, toolCompat: 94, stability: 88, cnExperience: 40 }, trend: -2, heat: 93,
  },
  {
    p: "anthropic", name: "Claude Max 5x", slug: "claude-max-5x", price: 1499, usdNote: "$200/月", region: "overseas",
    tagline: "Pro 用量 5 倍 + Opus 5 访问权",
    quotaType: "requests", quotaAmount: 1100, quotaUnit: "条请求/5h", quotaWindow: "daily",
    capacityIndex: 95, contextNote: "Opus 5 500K",
    toolCompat: { "Claude Code": "official", "OpenCode": "official", "官方 CLI": "official" },
    scenarios: ["agent", "bigrepo", "backend", "fullstack"],
    pros: ["Agent 重度工作流天花板", "Opus 5 全速访问"],
    cons: ["月费四位数，门槛高"],
    recommendedFor: ["每天 6 小时以上 Agent 自动开发", "把它当生产力主力的技术负责人"],
    notRecommendedFor: ["绝大多数个人开发者"],
    verified: "2026-08-27T10:00:00+08:00", trust: "official_verified",
    scores: { ability: 96, quota: 96, price: 38, toolCompat: 92, stability: 88, cnExperience: 40 }, trend: 0, heat: 64,
  },
  {
    p: "openai", name: "Codex Plus", slug: "codex-plus", price: 149, usdNote: "$20/月（随 ChatGPT Plus 附带）", region: "overseas",
    tagline: "ChatGPT Plus 附带的 Codex Agent 用量",
    quotaType: "requests", quotaAmount: 300, quotaUnit: "本地任务次/日", quotaWindow: "daily",
    capacityIndex: 62, contextNote: "GPT-5.2-Codex 400K",
    toolCompat: { "Codex": "official", "Cursor": "official", "VS Code": "community", "官方 CLI": "official" },
    scenarios: ["agent", "fullstack"],
    pros: ["GPT-5.2-Codex 编排能力强", "云端并行异步任务体验独特"],
    cons: ["国内直连不稳", "Codex CLI 以外的生态一般"],
    recommendedFor: ["已经在订阅 ChatGPT 的开发者", "喜欢云端异步 Agent 任务的人"],
    notRecommendedFor: ["纯本地 CLI 工作流的用户（同价 Claude 更稳）"],
    verified: "2026-08-25T14:00:00+08:00", trust: "official_verified",
    scores: { ability: 93, quota: 74, price: 64, toolCompat: 86, stability: 82, cnExperience: 34 }, trend: 1, heat: 85,
  },
  {
    p: "cursor", name: "Cursor Pro", slug: "cursor-pro", price: 146, usdNote: "$20/月", region: "overseas",
    tagline: "AI IDE 一体化，补全体验标杆",
    quotaType: "requests", quotaAmount: 500, quotaUnit: "次 Fast/月", quotaWindow: "monthly",
    capacityIndex: 56, contextNote: "Composer 1 + 多模型路由",
    toolCompat: { "Cursor": "official", "VS Code": "unverified" },
    scenarios: ["frontend", "fullstack", "light"],
    pros: ["Tab 补全与 Inline Edit 手感最好", "Composer 模型极快"],
    cons: ["超出额度后降速明显", "脱离 IDE 无法使用"],
    recommendedFor: ["以 IDE 为中心的前端/全栈开发"],
    notRecommendedFor: ["纯 CLI 工作流用户", "需要裸 API 自动化管线的团队"],
    verified: "2026-08-26T09:30:00+08:00", trust: "official_verified",
    scores: { ability: 87, quota: 68, price: 66, toolCompat: 88, stability: 84, cnExperience: 46 }, trend: -3, heat: 80,
  },
  {
    p: "github", name: "GitHub Copilot Pro", slug: "copilot-pro", price: 75, usdNote: "$10/月", region: "overseas",
    tagline: "VS Code 原生补全 + Premium 多模型路由",
    quotaType: "requests", quotaAmount: 300, quotaUnit: "premium 次/月", quotaWindow: "monthly",
    capacityIndex: 54, contextNote: "可选 Claude / GPT / Gemini 路由",
    toolCompat: { "VS Code": "official", "Cursor": "official" },
    scenarios: ["frontend", "light", "fullstack"],
    pros: ["¥75 性价比不错", "VS Code 无缝集成", "Premium Requests 可调用高端模型"],
    cons: ["Agent 能力弱于专用 Coding 方案"],
    recommendedFor: ["以补全为主 + 少量 Agent 的日常开发"],
    notRecommendedFor: ["重 Agent 工作流用户"],
    verified: "2026-08-21T11:00:00+08:00", trust: "official_detected",
    scores: { ability: 82, quota: 64, price: 88, toolCompat: 80, stability: 86, cnExperience: 52 }, trend: 1, heat: 76,
  },
  {
    p: "github", name: "Copilot Free", slug: "copilot-free", price: 0, usdNote: "$0", region: "overseas",
    tagline: "每月 50 次 premium 免费额度",
    quotaType: "requests", quotaAmount: 50, quotaUnit: "次/月", quotaWindow: "monthly",
    capacityIndex: 18,
    toolCompat: { "VS Code": "official" },
    scenarios: ["light"],
    pros: ["有 GitHub 账号即可免费用"],
    cons: ["额度只够尝鲜"],
    recommendedFor: ["体验阶段用户"], notRecommendedFor: ["正式项目开发"],
    verified: "2026-08-21T11:00:00+08:00", trust: "official_detected",
    scores: { ability: 80, quota: 28, price: 100, toolCompat: 66, stability: 84, cnExperience: 50 }, trend: 0, heat: 50,
  },
  {
    p: "google", name: "Gemini AI Pro", slug: "gemini-ai-pro", price: 149, usdNote: "$19.99/月", region: "overseas",
    tagline: "超大上下文路线的 Coding 方案",
    quotaType: "requests", quotaAmount: 1500, quotaUnit: "条 Gemini Pro/日", quotaWindow: "daily",
    capacityIndex: 74, contextNote: "Gemini 3 系列 1M 上下文",
    toolCompat: { "官方 CLI": "official", "OpenCode": "community", "Cursor": "official", "VS Code": "community" },
    scenarios: ["bigrepo", "light", "debug"],
    pros: ["百万 token 上下文最实用", "Flash 可混用省量"],
    cons: ["Coding 决策精度低于 Claude/GPT"],
    recommendedFor: ["超大规模仓库的检索式修改", "已有 Google 订阅的用户"],
    notRecommendedFor: ["把模型精度放在第一位的人"],
    verified: "2026-08-19T10:00:00+08:00", trust: "official_verified",
    scores: { ability: 88, quota: 86, price: 64, toolCompat: 74, stability: 80, cnExperience: 38 }, trend: 2, heat: 66,
  },
  {
    p: "__oc__", name: "OpenCode Zen", slug: "opencode-zen", price: 38, usdNote: "", region: "overseas",
    tagline: "社区网关聚合主流模型，按量计费",
    quotaType: "token", quotaAmount: null, quotaUnit: "按量", quotaWindow: "payg",
    capacityIndex: 47, contextNote: "随所选模型而定",
    toolCompat: { "OpenCode": "official", "Claude Code": "community" },
    scenarios: ["light", "fullstack"],
    pros: ["一个订阅多家模型", "CLI 优先设计顺手"],
    cons: ["非官方渠道，稳定性与条款风险自负"],
    recommendedFor: ["多工具流学习者"], notRecommendedFor: ["商业项目主力方案"],
    verified: "2026-08-18T09:00:00+08:00", trust: "community_verified",
    scores: { ability: 78, quota: 60, price: 90, toolCompat: 72, stability: 60, cnExperience: 44 }, trend: 0, heat: 40,
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
  ["price", "glm-pro", N, "GLM Pro 降价至 ¥59", "标准版由 ¥79 下调至 ¥59，并上调 20% 月度 Token 包容量。", "major", 88, 90, "official", "2026-08-18T10:00:00+08:00", "推荐指数 88 → 90 ↑"],
  ["policy", "claude-pro", N, "周额度政策进一步收紧", "5h 上限下调 15%，周末恢复。社区普遍反映重度用户受影响明显。", "major", 90, 88, "official", "2026-08-15T08:00:00+08:00", "推荐指数 90 → 88 ↓"],
  ["new_model", N, "deepseek-v4", "DeepSeek V4 正式发布", "160K 上下文，代码基准追平上一代旗舰 96%，API 价格不变。", "major", 86, 89, "benchmark", "2026-06-30T10:00:00+08:00", "评分 86 → 89 ↑"],
  ["new_model", N, "gpt-5.2-codex", "GPT-5.2-Codex 上线 Plus", "Plus 档解锁新 Codex 模型，云端并行任务升至 8 个。", "normal", N, N, "official", "2026-07-22T10:00:00+08:00", N],
  ["quota", "kimi-allegretto", N, "调整周额度", "高速 Credits 由每周 260 提升至 320。", "normal", N, N, "official", "2026-08-08T10:00:00+08:00", N],
  ["price", "cursor-pro", N, "Fast Requests 超额定价调整", "超出包内额度后按 $0.04/次（原 $0.02），重度 IDE 用户成本上升。", "normal", 88, 86, "official", "2026-07-10T10:00:00+08:00", "推荐指数 88 → 86 ↓"],
  ["delist", "cursor-pro", N, "Cursor Business Lite 下架", "少于 10 席的团队计划并入 Standard。", "minor", N, N, "official", "2026-07-02T10:00:00+08:00", N],
  ["capability", N, "claude-opus-5", "Opus 5 长上下文一致性大幅提升", "500K 上下文召回测试通过率从 71% 提升至 89%。", "major", N, N, "benchmark", "2026-05-20T10:00:00+08:00", N],
  ["launch", "copilot-free", N, "GitHub Copilot Free 上线", "所有 GitHub 用户每月 50 次 premium 额度 + 无限基础补全。", "normal", N, N, "official", "2026-06-12T10:00:00+08:00", N],
  ["price", "deepseek-payg", N, "API 输出价格再降 12%", "V4 输出 ¥20/M tokens，按量方案月支出预期进一步降低。", "minor", 78, 78, "official", "2026-07-15T10:00:00+08:00", N],
  ["capability", "minimax-coding", N, "M3 工具调用成功率提升", "编辑部评测 Agent 任务成功率从 74 分提升至 81 分。", "normal", 80, 82, "editorial", "2026-06-20T10:00:00+08:00", "评分 80 → 82 ↑"],
  ["price", "marscode-pro", N, "Pro 档调价至 ¥69", "原价 ¥89，面向个人开发者降价。", "normal", N, N, "official", "2026-06-08T10:00:00+08:00", N],
  ["quota", "gemini-ai-pro", N, "每日 Pro 请求数翻倍", "Daily limit 由 750 提升至 1500。", "normal", 86, 88, "official", "2026-07-28T10:00:00+08:00", "评分 86 → 88 ↑"],
  ["policy", "opencode-zen", N, "Zen 新增 Claude Sonnet 5 直连", "倍率 6x，条款注明为转发渠道，非官方合作。", "normal", N, N, "community", "2026-08-05T10:00:00+08:00", N],
  ["capability", N, "glm-4.7", "GLM-4.7 Debug 能力升级", "SWE-bench Verified 提升 2.3 个百分点。", "normal", 89, 90, "benchmark", "2026-07-20T10:00:00+08:00", "评分 89 → 90 ↑"],
  ["capability", N, "claude-sonnet-5", "Sonnet 5 前端小版本更新", "UI 代码还原度改进，Tailwind 组件贴合度提升。", "minor", N, N, "editorial", "2026-08-10T10:00:00+08:00", N],
  ["policy", "kimi-presto", N, "Presto 支持夜间低速 K3", "每晚 0:00–8:00 以 2x 倍率消耗 Credits 使用 K3。", "minor", 83, 84, "official", "2026-08-12T10:00:00+08:00", "评分 83 → 84 ↑"],
  ["price", "opencode-zen", N, "DeepSeek V4 接入倍率 1x", "Zen 网关 V4 倍率维持 1x，是接入该模型的低成本方式之一。", "minor", N, N, "community", "2026-07-25T10:00:00+08:00", N],
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
    const providerId = pl.p === "__oc__" ? ocProvider.id : provMap[pl.p].id;
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
        officialUrl: providerId === ocProvider.id ? ocProvider.website : provMap[pl.p]?.website || null,
        lastVerifiedAt: new Date(pl.verified), trustLevel: pl.trust, status: "published",
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

  for (const ch of changes) {
    const [type, planSlug, modelSlug, title, summary, importance, from, to, src, dateISO, impactText] = ch;
    await db.changeLog.create({
      data: {
        entityType: planSlug ? "plan" : modelSlug ? "model" : "provider",
        entitySlug: planSlug || modelSlug || null,
        planId: planSlug && planMap[planSlug] ? planMap[planSlug].id : null,
        modelId: modelSlug && modelMap[modelSlug] ? modelMap[modelSlug].id : null,
        changeType: type, title, summary, importance,
        impactFrom: typeof from === "number" ? from : null,
        impactTo: typeof to === "number" ? to : null,
        impactText, sourceType: src, detectedAt: new Date(dateISO), verified: true,
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

  await db.sourceMonitor.create({ data: { label: "Kimi 官方定价页", url: "https://platform.moonshot.cn/docs/pricing/chat", providerSlug: "moonshot" } });
  await db.sourceMonitor.create({ data: { label: "智谱 GLM 定价页", url: "https://open.bigmodel.cn/pricing", providerSlug: "zhipu" } });
  await db.sourceMonitor.create({ data: { label: "Anthropic 定价页", url: "https://www.anthropic.com/pricing#api", providerSlug: "anthropic" } });

  console.log(`Seed done: providers=${providers.length} plans=${plans.length} models=${models.length} changes=${changes.length}`);
}

main().finally(() => db.$disconnect());
