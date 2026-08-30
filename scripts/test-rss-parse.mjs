/* 一次性本测：验证 RSS 解析 + 关键词预筛的产出（只读，不写库） */
const KW = [
  "openai", "anthropic", "claude", "gemini", "deepseek", "kimi", "moonshot", "qwen", "通义", "阿里",
  "glm", "智谱", "zhipu", "混元", "hunyuan", "minimax", "豆包", "doubao", "trae", "cursor",
  "copilot", "windsurf", "devin", "cline", "replit", "grok", "xiaomi", "mi-mo", "mimo",
  "文心", "ernie", "comate", "qoder", "codebuddy", "volcengine", "llama", "mistral",
  "定价", "价格", "订阅", "套餐", "额度", "积分", "提价", "降价", "收费",
  "pricing", "subscription", "plan", "credit", "quota", "rate limit",
  "发布", "上线", "模型", "release", "launch", "announc",
];
function xmlText(s) {
  if (!s) return "";
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ").trim();
}
function parseFeedItems(xml) {
  const out = [];
  for (const b of xml.matchAll(/<(item|entry)[\s\S]*?<\/\1>/gi)) {
    const blk = b[0];
    const pick = (re) => { const m = blk.match(re); return m ? xmlText(m[1]) : undefined; };
    const title = pick(/<title[^>]*>([\s\S]*?)<\/title>/i) ?? "";
    const link = pick(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i) ?? pick(/<link[^>]*>([\s\S]*?)<\/link>/i) ?? "";
    const description = pick(/<description[^>]*>([\s\S]*?)<\/description>/i) ?? pick(/<summary[^>]*>([\s\S]*?)<\/summary>/i) ?? pick(/<content[^>]*>([\s\S]*?)<\/content>/i) ?? "";
    const guid = pick(/<guid[^>]*>([\s\S]*?)<\/guid>/i) ?? pick(/<id[^>]*>([\s\S]*?)<\/id>/i) ?? (link || title);
    if (!guid || !title) continue;
    out.push({ guid: guid.slice(0, 50), title, link, description });
  }
  return out;
}
const FEEDS = [
  ["量子位", "https://www.qbitai.com/feed"],
  ["InfoQ中文", "https://www.infoq.cn/feed"],
  ["36氪", "https://36kr.com/feed"],
  ["少数派", "https://sspai.com/feed"],
  ["TechCrunchAI", "https://techcrunch.com/category/artificial-intelligence/feed/"],
  ["VentureBeatAI", "https://venturebeat.com/category/ai/feed/"],
  ["TheVerge", "https://www.theverge.com/rss/index.xml"],
  ["HN(AI)", "https://hnrss.org/newest?q=AI+model&count=20"],
];
for (const [label, url] of FEEDS) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "AIPlanRadarBot/0.1 (+monitor)" }, signal: AbortSignal.timeout(20000) });
    const xml = await res.text();
    const items = parseFeedItems(xml);
    const hits = items.filter((it) => KW.some((k) => (it.title + " " + it.description).toLowerCase().includes(k)));
    console.log(`${label}: ${items.length} 条，预筛命中 ${hits.length}`);
    for (const h of hits.slice(0, 3)) console.log("   · " + h.title.slice(0, 60));
  } catch (e) {
    console.log(`${label}: FAIL ${String(e.message || e).slice(0, 60)}`);
  }
}
