/* 条件筛选 + 条件匹配排序。
   只用可核验的客观字段：价格、区域、工具官方兼容、场景标签、额度容量指数（capacityIndex）。
   不生成任何质量/能力评分——「匹配度」仅表示命中了几条你勾选的硬/软条件。 */
import type { PublicPlanT } from "./serialize";
import { USAGE_DEMAND, SCENARIOS } from "./config";
import { intensityStars, intensityVerdict } from "./format";

export type IntensityKey = keyof typeof USAGE_DEMAND; // light | medium | heavy

export interface QuizAnswers {
  scenario: string; // 场景 key，或 "all"
  intensity: IntensityKey;
  budget: "free" | "100" | "200" | "500" | "500p";
  region: "all" | "domestic" | "overseas";
  tool: string;
}

export interface RecItem {
  plan: PublicPlanT;
  /** 命中的条件说明（展示给用户看为什么被选中） */
  matchedConditions: string[];
  /** 需要注意的点（额度不够、缺少官方来源等） */
  notices: string[];
  scenarioMatch: boolean;
  intensity: { stars: string; verdict: { text: string; tone: "ok" | "warn" | "bad" }; demand: number };
  /** 条件匹配度：命中条件的加权计数，仅用于排序，不是质量评分 */
  fitScore: number;
}

export interface RecResult {
  candidates: RecItem[];
  top: RecItem;
  second: RecItem;
  perf: RecItem;
  profile: {
    scenarioLabel: string;
    intensityLabel: string;
    budgetLabel: string;
    regionLabel: string;
    toolLabel: string;
  };
}

const BUDGET_MAX: Record<QuizAnswers["budget"], number> = {
  free: 0, "100": 100, "200": 200, "500": 500, "500p": Infinity,
};
export const BUDGET_LABELS: Record<QuizAnswers["budget"], string> = {
  free: "只看免费", "100": "¥100 内", "200": "¥200 内", "500": "¥500 内", "500p": "不限预算",
};
export const INTENSITY_LABELS: Record<IntensityKey, string> = {
  light: "偶尔使用（每周几次）",
  medium: "日常使用（每天 2-4 小时）",
  heavy: "重度使用（每天 6 小时以上）",
};
const SCENARIO_LABELS: Record<string, string> = Object.fromEntries(
  SCENARIOS.map((s) => [s.key, s.label]),
);

/** 硬条件：不满足直接排除，不做降级放行 */
function passesHardFilters(plan: PublicPlanT, answers: QuizAnswers): boolean {
  const max = BUDGET_MAX[answers.budget];
  if (max !== Infinity && plan.priceCny > max) return false;
  if (answers.region !== "all" && plan.region !== answers.region) return false;
  if (answers.tool && answers.tool !== "无所谓" && plan.toolCompat[answers.tool] !== "official") return false;
  return true;
}

export function recommend(allPlans: PublicPlanT[], answers: QuizAnswers): RecResult | null {
  const demand = USAGE_DEMAND[answers.intensity] ?? USAGE_DEMAND.medium;

  const scored = allPlans
    .filter((plan) => passesHardFilters(plan, answers))
    .map((plan): RecItem => {
      const matchedConditions: string[] = [`价格符合${BUDGET_LABELS[answers.budget]}`];
      const notices: string[] = [];
      let fitScore = 0;

      // 区域
      if (answers.region !== "all") {
        matchedConditions.push(`区域为${answers.region === "domestic" ? "国内" : "海外"}`);
        fitScore += 1;
      }
      // 工具
      if (answers.tool && answers.tool !== "无所谓") {
        matchedConditions.push(`官方支持 ${answers.tool}`);
        fitScore += 1;
      }

      // 场景（软条件）：套餐标注了该场景则加分，未标注不排除
      const scenarioMatch = answers.scenario !== "all" && plan.scenarios.includes(answers.scenario);
      if (scenarioMatch) {
        matchedConditions.push(`覆盖「${SCENARIO_LABELS[answers.scenario] ?? answers.scenario}」场景`);
        fitScore += 2;
      }

      // 使用强度（软条件）：额度容量 vs 需求，不足时给出警告但不排除
      const verdict = intensityVerdict(plan.capacityIndex, demand);
      if (verdict.tone === "ok") {
        matchedConditions.push(`额度容量达到「${INTENSITY_LABELS[answers.intensity]}」需求`);
        fitScore += 2;
      } else if (verdict.tone === "warn") {
        notices.push(`额度相对「${INTENSITY_LABELS[answers.intensity]}」偏紧，高强度使用可能需要加购`);
        fitScore += 1;
      } else {
        notices.push(`额度可能不足以支撑「${INTENSITY_LABELS[answers.intensity]}」，建议选更高档或按量付费`);
        fitScore -= 1;
      }

      if (!plan.officialUrl) notices.push("缺少具体套餐官方来源，需自行复核");

      return {
        plan,
        matchedConditions,
        notices,
        scenarioMatch,
        intensity: {
          stars: intensityStars(plan.capacityIndex, demand),
          verdict,
          demand,
        },
        fitScore,
      };
    });

  if (!scored.length) return null;

  // 排序：先按条件匹配度降序，再按价格升序，最后按名称稳定排序
  scored.sort(
    (a, b) =>
      b.fitScore - a.fitScore ||
      a.plan.priceCny - b.plan.priceCny ||
      `${a.plan.provider.name}${a.plan.name}`.localeCompare(`${b.plan.provider.name}${b.plan.name}`, "zh-CN"),
  );

  const candidates = scored.slice(0, 5);
  const top = candidates[0];
  const second = candidates[1] ?? top;
  const perf = candidates[2] ?? second;

  return {
    candidates,
    top,
    second,
    perf,
    profile: {
      scenarioLabel: answers.scenario === "all" ? "不限场景" : SCENARIO_LABELS[answers.scenario] ?? answers.scenario,
      intensityLabel: INTENSITY_LABELS[answers.intensity] ?? answers.intensity,
      budgetLabel: BUDGET_LABELS[answers.budget],
      regionLabel: answers.region === "all" ? "不限区域" : answers.region === "domestic" ? "国内" : "海外",
      toolLabel: answers.tool || "无所谓",
    },
  };
}

export function buildReasonText(r: RecResult): string {
  return `按「${r.profile.scenarioLabel}」「${r.profile.intensityLabel}」「${r.profile.budgetLabel}」「${r.profile.regionLabel}」「${r.profile.toolLabel}」筛选，先排除不满足硬条件的套餐，再按命中条件数与价格排序。`;
}
