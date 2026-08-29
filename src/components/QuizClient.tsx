"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/** [key, 主标题, 副标题说明] */
type Option = [string, string, string];

const STEPS: { key: string; title: string; hint: string; options: Option[] }[] = [
  {
    key: "scenario",
    title: "你主要用它做什么？",
    hint: "用于匹配套餐标注的适用场景；未标注的套餐不会被排除，只是排序靠后。",
    options: [
      ["frontend", "前端开发", "组件、页面、UI 还原"],
      ["fullstack", "全栈开发", "前后端都写"],
      ["backend", "后端开发", "接口、服务、数据层"],
      ["agent", "Agent 自动化", "多步任务、自动改代码"],
      ["debug", "Debug 排错", "定位与修复问题"],
      ["bigrepo", "大型 Repo", "超大仓库、跨文件重构"],
      ["light", "轻度 Coding", "补全、小改动"],
      ["all", "不限场景", "各场景都会用到"],
    ],
  },
  {
    key: "intensity",
    title: "你的使用强度大概是多少？",
    hint: "用于判断套餐额度容量是否够用；不够用的会标注提醒，但不会被直接排除。",
    options: [
      ["light", "偶尔使用", "每周几次，零散需求"],
      ["medium", "日常使用", "每天 2-4 小时"],
      ["heavy", "重度使用", "每天 6 小时以上"],
    ],
  },
  {
    key: "budget",
    title: "每月预算大概多少？",
    hint: "硬条件，超出预算的套餐会被排除。",
    options: [
      ["free", "只看免费", "¥0"],
      ["100", "¥100 以内", "入门付费档"],
      ["200", "¥200 以内", "主流个人档"],
      ["500", "¥500 以内", "进阶 / 小团队"],
      ["500p", "不限预算", "看效果优先"],
    ],
  },
  {
    key: "region",
    title: "对区域有要求吗？",
    hint: "硬条件。国内套餐直连更稳，海外套餐通常不受国内网络影响但需自行评估。",
    options: [
      ["all", "不限区域", "国内海外都可以"],
      ["domestic", "只看国内", "直连、可开票、合规友好"],
      ["overseas", "只看海外", "接受国际网络与支付方式"],
    ],
  },
  {
    key: "tool",
    title: "必须官方支持哪个工具？",
    hint: "硬条件。只保留标记为「官方支持」的套餐，社区验证的不算。",
    options: [
      ["无所谓", "无所谓", "不限工具"],
      ["Claude Code", "Claude Code", "终端 Agent 工作流"],
      ["Codex", "Codex", "OpenAI 官方 CLI"],
      ["Cursor", "Cursor", "AI 原生 IDE"],
      ["OpenCode", "OpenCode", "开源终端方案"],
      ["VS Code", "VS Code", "编辑器插件"],
      ["官方 CLI", "官方 CLI", "厂商自带命令行"],
    ],
  },
];

export function QuizClient() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const router = useRouter();
  const current = STEPS[step];
  const total = STEPS.length;

  function pick(value: string) {
    const next = { ...answers, [current.key]: value };
    setAnswers(next);
    if (step === total - 1) {
      const p = new URLSearchParams(next);
      router.push(`/recommend/result?${p}`);
    } else {
      setStep(step + 1);
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <span className="num text-sm font-semibold text-blue-600">
          {step + 1} / {total}
        </span>
        <div className="flex-1 h-1 bg-gray-200 rounded-full">
          <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${((step + 1) / total) * 100}%` }} />
        </div>
      </div>

      <h1 className="text-lg md:text-xl font-bold mb-1.5">{current.title}</h1>
      <p className="text-xs text-gray-400 mb-4">{current.hint}</p>

      <div className="grid gap-2 sm:grid-cols-2">
        {current.options.map(([key, label, sub]) => (
          <button
            key={key}
            onClick={() => pick(key)}
            className={`card p-3.5 text-left hover:border-blue-400 transition-colors ${
              answers[current.key] === key ? "border-blue-500 bg-blue-50" : ""
            }`}
          >
            <span className="block text-sm font-medium">{label}</span>
            {sub && <span className="block text-[11px] text-gray-400 mt-0.5">{sub}</span>}
          </button>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          className="btn btn-secondary px-4 py-2 disabled:invisible"
        >
          <ArrowLeft size={14} />上一步
        </button>
        {step > 0 && (
          <span className="text-[11px] text-gray-400">
            上一步选的是「{STEPS[step - 1].options.find((o) => o[0] === answers[STEPS[step - 1].key])?.[1] ?? "—"}」
          </span>
        )}
      </div>

      <p className="mt-8 text-[11px] text-gray-400 text-center">
        预算、区域与指定工具是硬条件；场景与使用强度用于排序和额度提醒。全程只用官方可核验字段，不生成能力评分。
      </p>
      <p className="mt-1 text-[11px] text-gray-400 text-center">
        不想筛选？<Link href="/plans" className="text-blue-600">直接浏览套餐参数</Link>
      </p>
    </div>
  );
}
