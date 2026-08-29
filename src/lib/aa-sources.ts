export const AA_ORIGIN = "https://artificialanalysis.ai";

export const AA_PUBLIC_SOURCES = [
  {
    key: "models",
    title: "模型基准榜",
    description: "Intelligence、Coding 与 Agentic 等模型指标，请以 AA 官方实时页面为准。",
    href: `${AA_ORIGIN}/leaderboards/models`,
  },
  {
    key: "agentic",
    title: "Agentic Index",
    description: "查看工具使用、规划、自主执行与复杂任务的 AA Agentic 官方指标。",
    href: `${AA_ORIGIN}/models/capabilities/agentic/`,
  },
  {
    key: "coding-agents",
    title: "Coding Agent 榜",
    description: "比较模型与 Agent 工具链组合的端到端编码表现。",
    href: `${AA_ORIGIN}/agents/coding-agents`,
  },
  {
    key: "methodology",
    title: "评测方法论",
    description: "了解指标定义、测试集、版本与测量方式。",
    href: `${AA_ORIGIN}/methodology`,
  },
] as const;

export function isArtificialAnalysisUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    return new URL(value).origin === AA_ORIGIN;
  } catch {
    return false;
  }
}
