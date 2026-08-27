"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ArrowLeft, RefreshCw } from "lucide-react";

export interface QuizOption {
  key: string;
  label: string;
  desc?: string;
}

const STEPS: { title: string; multi?: boolean; max?: number; options: QuizOption[] }[] = [
  {
    title: "每月 AI Coding 预算是多少？",
    options: [
      { key: "free", label: "尽量免费" },
      { key: "50", label: "¥50 内" },
      { key: "100", label: "¥100 内" },
      { key: "200", label: "¥200 内" },
      { key: "500", label: "¥500 内" },
      { key: "500p", label: "¥500+" },
    ],
  },
  {
    title: "主要使用场景？（可多选）",
    multi: true,
    options: [
      { key: "frontend", label: "前端 UI" },
      { key: "fullstack", label: "全栈开发" },
      { key: "backend", label: "后端开发" },
      { key: "debug", label: "Debug" },
      { key: "agent", label: "Agent 自动开发" },
      { key: "bigrepo", label: "大型项目 / Repo" },
      { key: "data", label: "数据分析" },
      { key: "light", label: "轻量 Coding" },
    ],
  },
  {
    title: "使用强度？",
    options: [
      { key: "light", label: "轻度", desc: "每周几次" },
      { key: "medium", label: "中度", desc: "每天都会使用" },
      { key: "heavy", label: "重度", desc: "每天长时间使用 Agent" },
    ],
  },
  {
    title: "最看重什么？（最多选 2 个）",
    multi: true,
    max: 2,
    options: [
      { key: "performance", label: "模型性能" },
      { key: "quota", label: "额度够用" },
      { key: "cost", label: "价格便宜" },
      { key: "cnspeed", label: "国内速度" },
      { key: "context", label: "长上下文" },
      { key: "stability", label: "稳定性" },
    ],
  },
  {
    title: "常用的 Coding 工具？",
    options: [
      { key: "Claude Code", label: "Claude Code" },
      { key: "Codex", label: "Codex" },
      { key: "Cursor", label: "Cursor" },
      { key: "OpenCode", label: "OpenCode" },
      { key: "VS Code", label: "VS Code" },
      { key: "官方 CLI", label: "官方工具" },
      { key: "无所谓", label: "无所谓" },
    ],
  },
];

type Answers = (string | string[])[];

export function QuizClient() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>(STEPS.map(() => []));
  const router = useRouter();

  const current = STEPS[step];
  const value = answers[step];
  const answered = Array.isArray(value) ? value.length > 0 : !!value;

  function pick(key: string) {
    if (current.multi) {
      const arr = [...(value as string[])];
      const idx = arr.indexOf(key);
      if (idx >= 0) arr.splice(idx, 1);
      else if (!current.max || arr.length < current.max) arr.push(key);
      setAnswers((a) => a.map((v, i) => (i === step ? arr : v)));
    } else {
      setAnswers((a) => a.map((v, i) => (i === step ? [key] : v)));
      // 单选自动进入下一步
      setTimeout(() => go(step + 1, [key]), 150);
    }
  }

  function finish() {
    const [budget = "", scenarios = [], usage = "", prefs = [], tool = ""] = answers as [string, string[], string, string[], string];
    const params = new URLSearchParams();
    params.set("budget", budget);
    if (scenarios.length) params.set("scenes", scenarios.join(","));
    params.set("usage", usage);
    if (prefs.length) params.set("prefs", prefs.join(","));
    params.set("tool", tool || "无所谓");
    router.push(`/recommend/result?${params.toString()}`);
  }

  function go(next: number, override?: string[]) {
    if (next >= STEPS.length) {
      // 校验完整性后提交
      const filled = override ? answers.map((v, i) => (i === step ? override : v)) : answers;
      const okToSubmit = filled.every((v) => (Array.isArray(v) ? v.length > 0 : v?.length));
      if (!okToSubmit) return;
      const [budget = "", scenarios = [], usage = "", prefs = [], tool = ""] = filled as [string, string[], string, string[], string];
      const params = new URLSearchParams();
      params.set("budget", budget);
      if (scenarios.length) params.set("scenes", scenarios.join(","));
      params.set("usage", usage);
      if (prefs.length) params.set("prefs", prefs.join(","));
      params.set("tool", tool || "无所谓");
      router.push(`/recommend/result?${params.toString()}`);
      return;
    }
    setStep(next);
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <span className="num text-sm font-semibold text-blue-600">{step + 1} / {STEPS.length}</span>
        <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 rounded-full transition-all duration-300" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
        <button
          onClick={() => { setAnswers(STEPS.map(() => [])); setStep(0); }}
          className="text-gray-400 hover:text-gray-600 p-1"
          aria-label="重新开始"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      <h1 className="text-lg md:text-xl font-bold text-gray-900 mb-4">{current.title}</h1>

      <div className={`grid gap-2 ${step === 4 ? "grid-cols-2 sm:grid-cols-3" : step === 1 ? "grid-cols-2 sm:grid-cols-3" : "sm:grid-cols-2 grid-cols-1"}`}>
        {current.options.map((o) => {
          const active = current.multi ? (value as string[]).includes(o.key) : value[0] === o.key;
          return (
            <button
              key={o.key}
              onClick={() => pick(o.key)}
              className={`card p-3.5 text-left transition-colors ${active ? "!border-blue-500 bg-blue-50/60 ring-1 ring-blue-500" : "hover:border-gray-300"}`}
            >
              <span className="block text-sm font-medium text-gray-900">{o.label}</span>
              {o.desc && <span className="block text-xs text-gray-400 mt-0.5">{o.desc}</span>}
            </button>
          );
        })}
      </div>
      {current.max && (
        <p className="mt-2 text-xs text-gray-400">最多可选 {current.max} 项（已选 {(value as string[]).length}）</p>
      )}

      <div className="mt-6 flex items-center justify-between">
        <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="btn btn-secondary px-4 py-2 text-sm disabled:invisible">
          <ArrowLeft size={14} /> 上一步
        </button>
        {step < STEPS.length - 1 ? (
          <button onClick={() => answered && go(step + 1)} disabled={!answered} className="btn btn-primary px-5 py-2 text-sm">
            下一步 <ArrowRight size={14} />
          </button>
        ) : (
          <button onClick={finish} disabled={!answered} className="btn btn-primary px-5 py-2 text-sm">
            查看推荐结果 <ArrowRight size={14} />
          </button>
        )}
      </div>

      <p className="mt-8 text-[11px] text-gray-400 text-center leading-relaxed">
        推荐由规则引擎 + 权重模型生成：模型能力匹配 35% · 预算匹配 25% · 额度匹配 20% · 工具兼容 10% · 地区与稳定性 10%，并按你的偏好动态调整。
      </p>
      <p className="mt-1 text-[11px] text-gray-400 text-center">
        不想回答？直接看<Link href="/plans" className="text-blue-600">排行榜</Link>或 <Link href="/changes" className="text-blue-600">今日行情</Link>。
      </p>
    </div>
  );
}
