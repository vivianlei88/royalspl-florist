// 内部维护工具：扫描 R2 中未被数据库 / 静态代码引用的旧图，核对清单后再删除。
// 鉴权：必须携带 x-admin-key 请求头（与 execute-sql.js 同一套后台密钥）。
// 安全闸门：
//   - GET  默认只读 inspect，不删除任何对象。
//   - POST 删除前会再次拉取数据库在用集合做二次比对；命中在用 / 不在桶内的对象一律跳过。
//   - POST 需 body.confirm === true 才真正删除，否则只返回 dry-run 待删清单。

const SUPABASE_URL = 'https://gefqlrmozxbgfhxgngtg.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZnFscm1venhiZ2ZoeGduZ3RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyOTI0MDQsImV4cCI6MjEwMTg2ODQwNH0.oH0fI1xpKn6arQlpvznrXXMMWsD1ZxNazRP4LZeZ68Y';
const ADMIN_KEY = 'royalspl2024';
const R2_URL_PREFIX = 'https://pub-aed48a8286cf45d29bfc6eeefeb882fd.r2.dev/';

// 受保护前缀：业务存档，即使未被数据库引用也一律不自动删除。
const PROTECTED_PREFIXES = ['email-attachments/'];

// 静态代码里硬编码、必须保留的 R2 对象 key（数据库不存，需单独兜底）。
const STATIC_KEEP = [
  'royalspl-florist/1795545421673-l481ni.webp', // 首页首屏预加载横幅
  'royalspl-florist/1788410704473-vyasp2.jpg',  // 结账页转数快（FPS）配图
];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-admin-key',
};

function unauthorized() {
  return Response.json({ error: 'unauthorized' }, { status: 403, headers: CORS });
}

function extractKeys(text) {
  const set = new Set();
  if (!text) return set;
  const re = /https:\/\/pub-aed48a8286cf45d29bfc6eeefeb882fd\.r2\.dev\/([^"'\\\s)]+)/g;
  let m;
  while ((m = re.exec(text))) set.add(m[1]);
  return set;
}

async function fetchTable(table, cols) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${cols}`, {
    headers: { apikey: ANON_KEY, Authorization: 'Bearer ' + ANON_KEY },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} ${table}`);
  return resp.json();
}

// 采集数据库 + 静态代码中仍在引用的全部 R2 key。
async function collectInUse() {
  const keep = new Set(STATIC_KEEP);
  const tables = [
    ['products', 'images,image_url'],
    ['collection_cards', 'image_url'],
    ['homepage_settings', 'hero_image,hero_images'],
    ['addons', 'image_url'],
    ['blog_posts', 'image_url,content,content_en'],
    ['categories', 'image_url'],
    ['orders', 'product_images,items,fps_screenshot'],
  ];
  for (const [table, cols] of tables) {
    try {
      const rows = await fetchTable(table, cols);
      for (const row of rows) {
        for (const k of extractKeys(JSON.stringify(row || {}))) keep.add(k);
      }
    } catch (err) {
      console.log('skip table', table, err.message);
    }
  }
  return keep;
}

async function listBucket(env) {
  const all = [];
  let cursor;
  do {
    const res = await env.IMAGES.list({ cursor, limit: 1000 });
    for (const o of res.objects || []) {
      all.push({ key: o.key, size: o.size || 0, lastModified: o.uploaded || null });
    }
    cursor = res.cursor;
    if (!res.truncated) break;
  } while (cursor);
  return all;
}

function diff(bucket, inUse) {
  const orphans = bucket.filter((o) => !inUse.has(o.key));
  const matched = bucket.filter((o) => inUse.has(o.key));
  return { orphans, matched };
}

export async function onRequestGet(context) {
  const req = context.request;
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.headers.get('x-admin-key') !== ADMIN_KEY) return unauthorized();

  const action = new URL(req.url).searchParams.get('action') || 'inspect';
  if (action !== 'inspect') return Response.json({ error: 'unknown action' }, { status: 400, headers: CORS });

  const [inUse, bucket] = await Promise.all([collectInUse(), listBucket(context.env)]);
  const { orphans, matched } = diff(bucket, inUse);
  const orphanBytes = orphans.reduce((s, o) => s + o.size, 0);
  const bucketBytes = bucket.reduce((s, o) => s + o.size, 0);

  const prefixBreakdown = {};
  for (const o of orphans) {
    const p = o.key.includes('/') ? o.key.split('/')[0] : '(root)';
    prefixBreakdown[p] = (prefixBreakdown[p] || 0) + 1;
  }

  return Response.json({
    bucketCount: bucket.length,
    bucketBytes,
    inUseCount: inUse.size,
    matchedInBucket: matched.length,
    orphanCount: orphans.length,
    orphanBytes,
    prefixBreakdown,
    orphans: orphans.sort((a, b) => b.size - a.size),
  }, { headers: CORS });
}

export async function onRequestPost(context) {
  const req = context.request;
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.headers.get('x-admin-key') !== ADMIN_KEY) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const confirm = body.confirm === true;

  const [inUse, bucket] = await Promise.all([collectInUse(), listBucket(context.env)]);
  const bucketKeys = new Set(bucket.map((o) => o.key));
  const { orphans } = diff(bucket, inUse);

  let targets;
  if (Array.isArray(body.keys) && body.keys.length > 0) {
    targets = body.keys;
  } else {
    targets = orphans.map((o) => o.key);
  }

  const protectedKeys = [];
  const missing = [];
  const toDelete = [];
  for (const key of targets) {
    if (inUse.has(key)) { protectedKeys.push(key); continue; }
    if (PROTECTED_PREFIXES.some((p) => key.startsWith(p))) { protectedKeys.push(key); continue; }
    if (!bucketKeys.has(key)) { missing.push(key); continue; }
    toDelete.push(key);
  }

  if (!confirm) {
    return Response.json({
      dryRun: true,
      wouldDelete: toDelete,
      protected: protectedKeys,
      missing,
      count: toDelete.length,
    }, { headers: CORS });
  }

  const sizeMap = new Map(bucket.map((o) => [o.key, o.size || 0]));
  const deleted = [];
  let freedBytes = 0;
  for (const key of toDelete) {
    await context.env.IMAGES.delete(key);
    freedBytes += sizeMap.get(key) || 0;
    deleted.push(key);
  }

  return Response.json({
    deleted,
    protected: protectedKeys,
    missing,
    freedBytes,
  }, { headers: CORS });
}
