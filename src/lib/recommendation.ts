/* 推荐引擎：规则 + 权重模型，不依赖 LLM。
   输入 quiz 答案，输出 Top 推荐 / 第二选择 / 性能优先 选项与解释。 */

import type { PlanT } from "./serialize";
import { USAGE_DEMAND } from "./config";

export interface QuizAnswers {
  budget: "free" | "50" | "100" | "200" | "500" | "500p";
  scenarios: string[]; // frontend fullstack backend agent debug bigrepo data light
  usage: "light" | "medium" | "heavy";
  prefs: string[]; // performance quota cost cnspeed context stability（最多2）
  tool: string; // '' 表示无所谓
}

export interface RecItem {
  plan: PlanT;
  matchScore: number;
  reasons: string[];
  tradeoffs: string[];
}

export interface RecResult {
  top: RecItem;
  second: RecItem;
  perf: RecItem;
  notChosen?: { planName: string; reason: string };
  profile: { budgetLabel: string; usageLabel: string; prefLabels: string[] };
}

const BUDGET_MAX: Record<QuizAnswers["budget"], number> = {
  free: 0, "50": 50, "100": 100, "200": 200, "500": 500, "500p": Infinity,
};
export const BUDGET_LABELS: Record<QuizAnswers["budget"], string> = {
  free: "尽量免费", "50": "¥50 内", "100": "¥100 内", "200": "¥200 内", "500": "¥500 内", "500p": "¥500 以上",
};

const SCENARIO_LABELS: Record<string, string> = {
  frontend: "前端 UI", fullstack: "全栈开发", backend: "后端开发", debug: "Debug",
  agent: "Agent 自动开发", bigrepo: "大型项目 / Repo", data: "数据分析", light: "轻量 Coding",
};
export const PREF_LABELS: Record<string, string> = {
  performance: "模型性能", quota: "额度够用", cost: "价格便宜",
  cnspeed: "国内速度", context: "长上下文", stability: "稳定性",
};
const USAGE_LABELS = { light: "轻度（每周几次）", medium: "中度（每天使用）", heavy: "重度（每天长时间 Agent）" };

// 基础权重
const BASE_W = { ability: 0.35, budget: 0.25, quota: 0.2, tool: 0.1, region: 0.1 };

function scenarioOverlap(plan: PlanT, scenarios: string[]): number {
  if (!scenarios.length) return 0;
  const hit = plan.scenarios.filter((s) => scenarios.includes(s)).length;
  return hit / scenarios.length;
}

/** 对单个套餐打分，返回各维度 0-1 得分与理由素材 */
function scorePlan(plan: PlanT, a: QuizAnswers) {
  const w = { ...BASE_W };
  const s = plan.score;
  const reasons: string[] = [];
  const tradeoffs: string[] = [];

  // 偏好动态调整权重
  if (a.prefs.includes("performance")) { w.ability += 0.18; w.quota -= 0.04; w.region -= 0.05; }
  if (a.prefs.includes("quota")) { w.quota += 0.1; w.budget -= 0.05; }
  if (a.prefs.includes("cost")) { w.budget += 0.12; w.ability -= 0.07; }
  if (a.prefs.includes("cnspeed")) { w.region += 0.12; w.tool -= 0.07; }
  if (a.prefs.includes("stability")) { w.region += 0.05; w.ability -= 0.05; }

  const totalW = Object.values(w).reduce((x, y) => x + Math.max(0, y), 0);

  // 模型能力维度：PlanScore.ability + 场景命中加成（未命中轻微降权，不做重罚）
  // 性能优先的用户：场景加成压缩，避免“场景贴金”掩盖模型能力差距
  let ability = (s?.ability ?? 60) / 100;
  const overlap = scenarioOverlap(plan, a.scenarios);
  if (a.scenarios.length) {
    const amp = a.prefs.includes("performance") ? 0.015 : 0.05;
    ability += overlap >= 0.5 ? amp : overlap > 0 ? amp * 0.4 : -amp;
  }

  // 预算维度：达标即基本满分；仅当用户明确偏好“价格便宜”时在预算带内倾向低价
  const max = BUDGET_MAX[a.budget];
  let budget: number;
  const fits = max === Infinity ? true : plan.priceCny <= max;
  if (max === Infinity) {
    budget = Math.max(0.5, 0.85 - Math.max(0, plan.priceCny - 500) / 3000);
  } else if (max === 0) {
    budget = plan.priceCny === 0 ? 1 : 0;
  } else if (fits) {
    budget = a.prefs.includes("cost") ? 0.85 + 0.15 * (1 - plan.priceCny / max) : 1 - Math.max(0, plan.priceCny / max - 0.8) * 0.35;
  } else {
    budget = Math.max(0, 1 - (plan.priceCny - max) / max);
  }

  // 额度维度：capacityIndex vs 使用强度需求
  const demand = USAGE_DEMAND[a.usage];
  let quota = Math.min(1, plan.capacityIndex / demand);
  if (quota >= 1) quota = 0.95 + Math.min(0.05, (plan.capacityIndex - demand) / 300);
  else tradeoffs.push(`${a.usage === "heavy" ? "重度" : a.usage === "medium" ? "中度" : "轻度"}使用下额度可能紧张`);

  // 工具兼容
  let tool = 0.7; // 无所谓给中性分
  if (a.tool && a.tool !== "无所谓") {
    const st = plan.toolCompat[a.tool];
    if (st === "official" || st === "community") { tool = 1; reasons.push(`支持你使用的 ${a.tool}`); }
    else if (st === "maybe") { tool = 0.5; tradeoffs.push(`${a.tool} 属于“可能支持”，需自行验证`); }
    else if (!st || st === "no") { tool = 0.05; tradeoffs.push(`不兼容 ${a.tool}`); }
    else { tool = 0.25; tradeoffs.push(`${a.tool} 兼容情况暂未验证`); }
  }

  // 地区与稳定性
  const domestic = plan.region === "domestic";
  let region = domestic ? (s?.cnExperience ?? 80) / 100 : Math.max(0, ((s?.cnExperience ?? 40) / 100));
  if (!domestic && !a.prefs.includes("performance") && a.usage !== "heavy") {
    region *= 0.55;
  }

  const raw =
    Math.max(0, w.ability) * ability +
    Math.max(0, w.budget) * budget +
    Math.max(0, w.quota) * quota +
    Math.max(0, w.tool) * tool +
    Math.max(0, w.region) * region;
  const match = raw / totalW;

  // 理由生成
  if (budget >= 0.9 && a.budget !== "free") reasons.push(`价格 ¥${plan.priceCny}/月，在你「${BUDGET_LABELS[a.budget]}」预算内`);
  else if (plan.priceCny === 0 && a.budget === "free") reasons.push("完全免费，符合零预算要求");
  if ((s?.quota ?? 0) >= 70 && a.usage !== "light") reasons.push("额度在同类中较宽裕");
  if (overlap >= 0.5) reasons.push(`覆盖你选择的场景（${plan.scenarios.map((k) => SCENARIO_LABELS[k] || k).slice(0, 3).join("、")}）`);
  if (domestic && (a.prefs.includes("cnspeed") || !a.prefs.includes("performance"))) reasons.push("国内直连稳定，无需网络条件");

  return { match, abilityScore: s?.ability ?? 60, codingCeiling: s?.ability ?? 0, reasons, tradeoffs };
}

interface Scored {
  plan: PlanT;
  match: number;
  abilityScore: number;
  codingCeiling: number;
  reasons: string[];
  tradeoffs: string[];
}

export function recommend(allPlans: PlanT[], answers: QuizAnswers): RecResult | null {
  const scored = allPlans
    .map((p) => ({ plan: p, ...scorePlan(p, answers) }))
    .sort((x, y) => y.match - x.match);

  // 少于 2 个套餐无法给出“第二选择/性能优先”，返回 null 由调用方兜底
  if (scored.length < 2) return null;

  const top = scored[0];
  // 第二选择：与 top 提供商不同或价差明显
  let second = scored.find((c) => c.plan.slug !== top.plan.slug);
  for (const c of scored.slice(1)) {
    if (c.plan.provider.slug !== top.plan.provider.slug) { second = c; break; }
  }
  if (!second) second = top;
  // 性能优先：剩余中 ability 最高者
  let perf = scored[0];
  for (const c of scored.slice(1)) {
    if (c.plan.slug === top.plan.slug || c.plan.slug === second.plan.slug) continue;
    if ((c.plan.score?.ability ?? 0) > (perf.plan.score?.ability ?? 0)) perf = c;
  }
  if (perf.plan.slug === top.plan.slug || perf.plan.slug === second.plan.slug) {
    const alt = scored.find((c) => c.plan.slug !== top.plan.slug && c.plan.slug !== second.plan.slug);
    if (alt) perf = alt;
  }

  const pack = (c: Scored): RecItem => ({
    plan: c.plan,
    matchScore: Math.round(Math.min(97, 62 + c.match * 35)),
    reasons: c.reasons,
    tradeoffs: c.tradeoffs,
  });

  // 为什么没有推荐 X：找能力强但被排除的知名方案
  let notChosen: RecResult["notChosen"] | undefined;
  const claudeLike = scored.find(
    (c) => c.plan.provider.name.toLowerCase().includes("anthropic") || c.plan.name.startsWith("Claude"),
  );
  const maxBudget = BUDGET_MAX[answers.budget];
  if (claudeLike && claudeLike.plan.priceCny > maxBudget) {
    notChosen = {
      planName: claudeLike.plan.name.replace(/ (Pro|Max.*)$/, ""),
      reason: `${claudeLike.plan.name.replace(/ (Pro|Max.*)$/, "")} Coding 能力更强，但按你的预算和使用强度，综合成本明显更高。`,
    };
  }

  const usageLabel = USAGE_LABELS[answers.usage];
  return {
    top: pack(top),
    second: pack(second),
    perf: pack(perf),
    notChosen,
    profile: {
      budgetLabel: BUDGET_LABELS[answers.budget],
      usageLabel,
      prefLabels: answers.prefs.map((p) => PREF_LABELS[p] || p),
    },
  };
}

export function buildReasonText(r: RecResult): string {
  const parts: string[] = [];
  parts.push(`你属于${r.profile.usageLabel}用户，预算为「${r.profile.budgetLabel}」。`);
  const scen = r.profile.prefLabels.length ? `你更加重视：${r.profile.prefLabels.join(" + ")}。` : "";
  if (scen) parts.push(scen);
  const main = r.top.reasons.slice(0, 2).join("；") || "综合匹配度最高";
  parts.push(`${r.top.plan.provider.name} ${r.top.plan.name} 在你的需求组合下综合匹配度最高：${main}。`);
  return parts.join("\n");
}
