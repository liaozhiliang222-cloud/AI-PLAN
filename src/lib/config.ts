/* 全站配置：权重、价格区间、标签体系等均在此集中管理，页面不写死 */

export const SITE = {
  name: "AI Plan Radar",
  url: "https://aiplan.surveykit.cc",
  slogan: "选模型、比套餐、看行情。",
  desc: "实时追踪国内外 AI Coding 套餐、模型、价格与额度变化，帮用户找到更适合自己的 AI 开发方案。",
};

// Plan 评分权重（Admin 与 seed 计算共用）
export const PLAN_WEIGHTS = { ability: 0.3, quota: 0.25, price: 0.2, toolCompat: 0.1, stability: 0.1, cnExperience: 0.05 };

// Model 评分权重（Admin 与 seed 计算共用）
export const MODEL_WEIGHTS = {
  coding: 0.3, agent: 0.25, frontend: 0.1, backend: 0.1, debug: 0.1, longContext: 0.05, speed: 0.05, cost: 0.05,
} as const;

export type PlanScoreInput = Record<keyof typeof PLAN_WEIGHTS, number>;
export type ModelScoreInput = Record<keyof typeof MODEL_WEIGHTS, number>;

/** 计算 Plan 综合分（权重见 PLAN_WEIGHTS） */
export function calcPlanOverall(sc: PlanScoreInput): number {
  return Math.round(
    sc.ability * PLAN_WEIGHTS.ability +
      sc.quota * PLAN_WEIGHTS.quota +
      sc.price * PLAN_WEIGHTS.price +
      sc.toolCompat * PLAN_WEIGHTS.toolCompat +
      sc.stability * PLAN_WEIGHTS.stability +
      sc.cnExperience * PLAN_WEIGHTS.cnExperience,
  );
}

/** 计算 Model 综合分（权重见 MODEL_WEIGHTS） */
export function calcModelOverall(sc: ModelScoreInput): number {
  return Math.round(
    sc.coding * MODEL_WEIGHTS.coding +
      sc.agent * MODEL_WEIGHTS.agent +
      sc.frontend * MODEL_WEIGHTS.frontend +
      sc.backend * MODEL_WEIGHTS.backend +
      sc.debug * MODEL_WEIGHTS.debug +
      sc.longContext * MODEL_WEIGHTS.longContext +
      sc.speed * MODEL_WEIGHTS.speed +
      sc.cost * MODEL_WEIGHTS.cost,
  );
}

/** 性价比展示值：价格越低越高（展示层换算，评分以 price 维度为准） */
export function valuePct(priceCny: number): number {
  return Math.max(30, Math.round(100 - (priceCny / 1600) * 70));
}

export const PLAN_SCORE_LABELS: Record<string, string> = {
  ability: "模型能力", quota: "额度", price: "价格", toolCompat: "工具兼容", stability: "稳定性", cnExperience: "国内体验",
};

// 预算筛选区间
export const PRICE_BANDS = [
  { key: "all", label: "全部" },
  { key: "free", label: "免费", max: 0 },
  { key: "b50", label: "¥50 内", max: 50 },
  { key: "b100", label: "¥100 内", max: 100 },
  { key: "b200", label: "¥200 内", max: 200 },
  { key: "b500", label: "¥500 内", max: 500 },
  { key: "b500p", label: "¥500+", min: 500 },
];

export const REGIONS = [
  { key: "all", label: "全部" },
  { key: "domestic", label: "国内" },
  { key: "overseas", label: "海外" },
];

export const SCENARIOS = [
  { key: "frontend", label: "前端" },
  { key: "fullstack", label: "全栈" },
  { key: "backend", label: "后端" },
  { key: "agent", label: "Agent" },
  { key: "debug", label: "Debug" },
  { key: "bigrepo", label: "大型 Repo" },
  { key: "light", label: "轻度 Coding" },
];

export const TOOL_FILTERS = ["全部", "Claude Code", "Codex", "Cursor", "OpenCode", "VS Code", "官方 CLI"];

export const SORTS = [
  { key: "overall", label: "综合推荐" },
  { key: "value", label: "性价比" },
  { key: "coding", label: "Coding" },
  { key: "agent", label: "Agent" },
  { key: "quota", label: "额度" },
  { key: "price", label: "价格" },
  { key: "heat", label: "热度" },
];

// 排序 key -> 取值函数所需的 score 字段（coding/agent 映射到 ability 维度细分暂用 planScore.ability + 模型分）
export const CHANGE_TYPES: Record<string, string> = {
  new_model: "新模型", price: "价格变化", quota: "额度变化",
  launch: "套餐上线", delist: "套餐下架", policy: "规则调整", capability: "能力升级",
};
// 注：changeType "update" 是监控采集的内部待解析状态（LLM 解析前的原始信号），
// 不进 CHANGE_TYPES（资讯页不显示该分类），解析后升级为上述类型或被删除。

/** 变化类型联合（与 CHANGE_TYPES 的 key 保持一致，作为全站唯一来源） */
export type ChangeTypeKey = keyof typeof CHANGE_TYPES;

export function isChangeTypeKey(v: unknown): v is ChangeTypeKey {
  return typeof v === "string" && v in CHANGE_TYPES;
}

export const IMPORTANCE = {
  major: { label: "重大", cls: "bg-red-50 text-red-700 border-red-200" },
  normal: { label: "一般", cls: "bg-orange-50 text-orange-700 border-orange-200" },
  minor: { label: "轻微", cls: "bg-gray-50 text-gray-600 border-gray-200" },
} as const;

export const TRUST_STARS: Record<string, number> = {
  official_verified: 5,
  official_detected: 4,
  community_verified: 3,
  unverified: 2,
};

export const TOOL_STATUS: Record<string, { label: string; tone: string }> = {
  official: { label: "官方支持", tone: "bg-blue-50 text-blue-700 border-blue-200" },
  community: { label: "社区验证", tone: "bg-teal-50 text-teal-700 border-teal-200" },
  maybe: { label: "可能支持", tone: "bg-gray-50 text-gray-600 border-gray-200" },
  no: { label: "不支持", tone: "bg-red-50 text-red-600 border-red-200" },
  unverified: { label: "暂未验证", tone: "bg-gray-50 text-gray-400 border-gray-200" },
};

export const SOURCE_TYPE: Record<string, string> = {
  official: "官方", benchmark: "Benchmark", community: "社区", editorial: "编辑部实测", media: "媒体",
};

// 模型榜分类 -> 字段
export const MODEL_CATEGORIES = [
  { key: "overall", label: "综合" },
  { key: "coding", label: "Coding" },
  { key: "agent", label: "Agent" },
  { key: "frontend", label: "前端" },
  { key: "backend", label: "后端" },
  { key: "debug", label: "Debug" },
  { key: "longContext", label: "长上下文" },
  { key: "speed", label: "速度" },
  { key: "cost", label: "性价比" },
] as const;

// 使用强度阈值（capacityIndex 0-100）
export const USAGE_DEMAND = { light: 25, medium: 55, heavy: 85 };
