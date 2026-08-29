/**
 * 将 prisma/seed.mjs 中的套餐数据增量同步到生产库。
 * 与 seed 的区别：不 deleteMany，因此不会清空 Artificial Analysis 同步的 600+ 模型。
 * 用法：node -r dotenv/config scripts/upsert-plans.mjs [--dry]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRY = process.argv.includes("--dry");
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

// ---------- 从 seed.mjs 提取数据字面量，保证两边同源 ----------
const seedPath = path.join(__dirname, '..', 'prisma', 'seed.mjs');
const src = fs.readFileSync(seedPath, 'utf8');
function extractArray(name) {
  const re = new RegExp('const ' + name + ' = (\\[[\\s\\S]*?\\r?\\n\\];)');
  const m = src.match(re);
  if (!m) throw new Error('未找到数组: ' + name);
  return eval(m[1].replace(/;\s*$/, ''));
}
const providers = extractArray('providers');
const plans = extractArray('plans');

// ---------- 套餐 -> 模型关联（使用 AA 同步后的真实 model slug）----------
const PLAN_MODELS = {
  'kimi-andante': [['kimi-k2-7-code', 1, true]],
  'kimi-moderato': [['kimi-k3', 1, true]],
  'kimi-allegretto': [['kimi-k3', 1, true]],
  'kimi-allegro': [['kimi-k3', 1, true]],
  'glm-lite': [['glm-5-3', 1, true], ['glm-5-2', 0.5, false]],
  'glm-pro': [['glm-5-3', 1, true], ['glm-5-2', 0.5, false]],
  'glm-max': [['glm-5-3', 1, true], ['glm-5-2', 0.5, false]],
  'minimax-plus': [['minimax-m3', 1, true]],
  'minimax-max': [['minimax-m3', 1, true]],
  'minimax-ultra': [['minimax-m3', 1, true]],
  'qwen-lite': [['qwen3-8-max', 1, true], ['deepseek-v4-pro', 1, false]],
  'qwen-standard': [['qwen3-8-max', 1, true], ['deepseek-v4-pro', 1, false]],
  'qwen-pro': [['qwen3-8-max', 1, true], ['deepseek-v4-pro', 1, false]],
  'volc-ark-small': [['doubao-seed-code', 1, true]],
  'deepseek-payg': [['deepseek-v4-pro', 1, true], ['deepseek-v4-flash', 0.3, false]],
  'mimo-coding': [['mimo-v2-5-pro', 1, true]],
  'claude-pro': [['claude-sonnet-5', 1, true], ['claude-opus-5', 4, false]],
  'claude-max-5x': [['claude-opus-5', 1, true], ['claude-sonnet-5', 0.4, false]],
  'claude-max-20x': [['claude-opus-5', 1, true], ['claude-sonnet-5', 0.4, false]],
  'claude-team': [['claude-sonnet-5', 1, true], ['claude-opus-5', 4, false]],
  'cursor-hobby': [['grok-4-5', 1, true]],
  'cursor-pro': [['grok-4-6', 1, true], ['claude-opus-5', 3, false]],
  'cursor-pro-plus': [['grok-4-6', 1, true], ['claude-opus-5', 3, false]],
  'cursor-ultra': [['grok-4-6', 1, true], ['claude-opus-5', 3, false]],
  'copilot-free': [['gpt-5-6-luna', 1, true]],
  'copilot-pro': [['gpt-5-6-luna', 1, true], ['gpt-5-6-terra', 4, false]],
  'copilot-pro-plus': [['gpt-5-6-terra', 1, true], ['gpt-5-6-sol', 5, false]],
  'copilot-max': [['gpt-5-6-sol', 1, true], ['gpt-5-6-terra', 0.4, false]],
  'codex-plus': [['gpt-5-6-sol', 1, true], ['gpt-5-6-luna', 0.2, false]],
  'gemini-ai-pro': [['gemini-3-7-flash', 1, true]],
  'opencode-go': [['deepseek-v4-pro', 1, true], ['glm-5-3', 1, false], ['kimi-k3', 3, false]],
  // 第二批：国内平台
  'codebuddy-free': [['hy3', 1, true]],
  'codebuddy-standard': [['hy3', 1, true]],
  'codebuddy-pro': [['hy3', 1, true]],
  'codebuddy-max': [['hy3', 1, true]],
  'trae-pro': [['doubao-seed-code', 1, true]],
  'trae-pro-plus': [['doubao-seed-code', 1, true]],
  'trae-ultra': [['doubao-seed-code', 1, true]],
  'comate-pro': [['ernie-5-0-thinking-preview', 1, true]],
  'comate-max': [['ernie-5-0-thinking-preview', 1, true]],
  'qoder-pro': [['qwen3-8-max', 1, true]],
  'qoder-pro-plus': [['qwen3-8-max', 1, true]],
  // 第二批：国际平台（Windsurf 路由多模型；Devin/Replit/Zed/Cline 无专属模型，不建关联）
  'windsurf-pro': [['claude-sonnet-5', 1, true]],
  'windsurf-max': [['claude-sonnet-5', 1, true]],
};

const WEIGHTS = { ability: 0.3, quota: 0.25, price: 0.2, toolCompat: 0.1, stability: 0.1, cnExperience: 0.05 };
const J = JSON.stringify;
function overall(s) {
  return Math.round(
    s.ability * WEIGHTS.ability + s.quota * WEIGHTS.quota + s.price * WEIGHTS.price +
    s.toolCompat * WEIGHTS.toolCompat + s.stability * WEIGHTS.stability + s.cnExperience * WEIGHTS.cnExperience,
  );
}

(async () => {
  console.log(DRY ? '=== DRY RUN（不写库）===' : '=== 写入模式 ===');
  console.log('providers:', providers.length, '| plans:', plans.length);

  // 1) Provider upsert（已存在则只补 website/officialSource，不改 name 以免与 AA 同步打架）
  const provBySlug = {};
  for (const pv of providers) {
    const existing = await db.provider.findUnique({ where: { slug: pv.slug } });
    if (existing) {
      provBySlug[pv.slug] = existing;
      if (!DRY) {
        await db.provider.update({
          where: { slug: pv.slug },
          data: {
            website: existing.website || pv.website || null,
            // officialSource 以 seed 为准（它是套餐价格来源页），缺失时才回落到库内旧值
            officialSource: pv.officialSource || existing.officialSource || null,
          },
        });
      }
      continue;
    }
    if (DRY) { provBySlug[pv.slug] = { id: -1, ...pv }; continue; }
    provBySlug[pv.slug] = await db.provider.create({
      data: {
        name: pv.name, slug: pv.slug, country: pv.country, logoColor: pv.logoColor,
        website: pv.website || null, officialSource: pv.officialSource || null,
      },
    });
  }
  // OpenCode 社区 provider（seed 里硬编码在 main 中）
  let oc = await db.provider.findUnique({ where: { slug: 'opencode' } });
  if (!oc && !DRY) {
    oc = await db.provider.create({
      data: { name: 'OpenCode Community', slug: 'opencode', country: 'overseas', logoColor: '#0891B2', website: 'https://opencode.ai' },
    });
  }
  if (oc) provBySlug['__oc__'] = oc;

  // 2) Plan upsert
  const keepSlugs = new Set(plans.map((p) => p.slug));
  const existingPlans = await db.plan.findMany({ select: { id: true, slug: true } });
  const toDelete = existingPlans.filter((p) => !keepSlugs.has(p.slug));
  console.log('\n将删除的旧套餐 (' + toDelete.length + '):', toDelete.map((p) => p.slug).join(', ') || '无');

  let created = 0, updated = 0, skipped = 0;
  for (const pl of plans) {
    const provider = provBySlug[pl.p];
    if (!provider) { console.log('  SKIP（无 provider）', pl.slug); skipped++; continue; }
    // 优先 officialSource（套餐价格页，比官网首页更精确），缺失时才用 website
    const officialUrl = provider.officialSource || provider.website || null;
    const s = pl.scores;
    const data = {
      providerId: provider.id,
      name: pl.name, slug: pl.slug, tagline: pl.tagline,
      priceCny: pl.price, currency: 'CNY', priceNote: pl.usdNote || '',
      billingCycle: pl.price === 0 ? 'free' : 'monthly', region: pl.region,
      quotaType: pl.quotaType, quotaAmount: pl.quotaAmount ?? null, quotaUnit: pl.quotaUnit || null,
      quotaWindow: pl.quotaWindow || null,
      fastQuota: pl.fastQuota || null, normalQuota: pl.normalQuota || null,
      capacityIndex: pl.capacityIndex, contextNote: pl.contextNote || null,
      tools: J(Object.keys(pl.toolCompat)),
      toolCompat: J(pl.toolCompat),
      scenarios: J(pl.scenarios),
      pros: J(pl.pros), cons: J(pl.cons),
      recommendedFor: J(pl.recommendedFor), notRecommendedFor: J(pl.notRecommendedFor),
      description: '',
      officialUrl,
      lastVerifiedAt: new Date(pl.verified),
      trustLevel: pl.trust,
      status: officialUrl ? 'published' : 'draft',
    };
    const scoreData = { ...s, overall: overall(s), trend: pl.trend, heat: pl.heat };

    const prev = await db.plan.findUnique({ where: { slug: pl.slug } });
    if (DRY) { prev ? updated++ : created++; continue; }
    if (prev) {
      await db.plan.update({ where: { slug: pl.slug }, data });
      await db.planScore.upsert({ where: { planId: prev.id }, create: { planId: prev.id, ...scoreData }, update: scoreData });
      updated++;
    } else {
      const np = await db.plan.create({ data: { ...data, score: { create: scoreData } } });
      created++;
      void np;
    }
  }
  console.log('\n新增: ' + created + ' | 更新: ' + updated + ' | 跳过: ' + skipped);

  // 3) 删除旧套餐
  if (!DRY) {
    for (const p of toDelete) {
      await db.planModel.deleteMany({ where: { planId: p.id } });
      await db.planScore.deleteMany({ where: { planId: p.id } });
      await db.pricePoint.deleteMany({ where: { planId: p.id } });
      await db.plan.delete({ where: { id: p.id } }).catch(() => {});
    }
    console.log('已删除旧套餐: ' + toDelete.length);
  }

  // 4) PlanModel 关联
  // 预取全部套餐与模型做内存查找，避免逐条 findUnique（50+ 套餐时会产生数百次查询，容易把 Supabase pooler 连接打满）
  const allPlans = await db.plan.findMany({ select: { id: true, slug: true } });
  const allModels = await db.model.findMany({ select: { id: true, slug: true } });
  const planIdBySlug = new Map(allPlans.map((p) => [p.slug, p.id]));
  const modelIdBySlug = new Map(allModels.map((m) => [m.slug, m.id]));

  let linked = 0, linkSkip = 0;
  const planIds = [];
  for (const planSlug of Object.keys(PLAN_MODELS)) {
    const id = planIdBySlug.get(planSlug);
    if (id == null) { console.log('  关联跳过（套餐不存在）', planSlug); linkSkip++; continue; }
    planIds.push(id);
  }
  if (!DRY && planIds.length) {
    // 一次性清掉这批套餐的旧关联，避免逐条 deleteMany
    await db.planModel.deleteMany({ where: { planId: { in: planIds } } });
  }

  for (const [planSlug, list] of Object.entries(PLAN_MODELS)) {
    const planId = planIdBySlug.get(planSlug);
    if (planId == null) continue;
    for (const [modelSlug, mult, rec] of list) {
      const modelId = modelIdBySlug.get(modelSlug);
      if (modelId == null) { console.log('  关联跳过（模型不存在）', planSlug, '<-', modelSlug); linkSkip++; continue; }
      if (DRY) { linked++; continue; }
      try {
        await db.planModel.upsert({
          where: { planId_modelId: { planId, modelId } },
          create: { planId, modelId, multiplier: mult, recommended: rec },
          update: { multiplier: mult, recommended: rec },
        });
        linked++;
      } catch (e) {
        console.log('  关联失败 ' + planSlug + ' <- ' + modelSlug + ': ' + String(e.message || e).slice(0, 160));
        linkSkip++;
      }
    }
  }
  console.log('套餐-模型关联: ' + linked + ' 条建立，跳过 ' + linkSkip + ' 条');

  if (!DRY) {
    const pub = await db.plan.count({ where: { status: 'published' } });
    const draft = await db.plan.count({ where: { status: 'draft' } });
    const models = await db.model.count();
    console.log('\n最终：published=' + pub + ' draft=' + draft + '（model 表仍为 ' + models + ' 条，未被清空）');
  }
  await db.$disconnect();
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
