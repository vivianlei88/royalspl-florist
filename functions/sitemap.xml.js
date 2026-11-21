// Dynamic sitemap.xml - real-time query Supabase for active products, active categories and published blog posts.
// New products / categories / blog pages appear here automatically; no manual sitemap edit required.

const SUPABASE_URL = 'https://gefqlrmozxbgfhxgngtg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZnFscm1venhiZ2ZoeGduZ3RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyOTI0MDQsImV4cCI6MjEwMTg2ODQwNH0.oH0fI1xpKn6arQlpvznrXXMMWsD1ZxNazRP4LZeZ68Y';

async function fetchTable(table, select, filterCol, orderCol = 'id', orderDir = 'desc') {
  const resp = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?select=${select}&${filterCol}=eq.true&order=${orderCol}.${orderDir}`,
    {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`
      }
    }
  );
  if (!resp.ok) return [];
  return resp.json();
}

const xmlEscape = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function onRequest() {
  const today = new Date().toISOString().split('T')[0];

  // Active products
  const products = await fetchTable('products', 'id,updated_at', 'is_active', 'id', 'desc');

  // Active categories (sorted by sort_order)
  const categories = await fetchTable('categories', 'id,name_zh,updated_at', 'is_active', 'sort_order', 'asc');

  // Published blog posts (table flag column is is_published, not is_active)
  const blogs = await fetchTable('blog_posts', 'id,title_en,updated_at', 'is_published', 'id', 'desc');

  let urls = [];

  // Static pages
  const staticPages = [
    ['/', '1.0'],
    ['/products', '0.8'],
    ['/categories', '0.8'],
    ['/blog', '0.8'],
    ['/contact', '0.6'],
    ['/faq', '0.6'],
    ['/privacy', '0.3'],
    ['/en/', '1.0'],
    ['/en/products', '0.8'],
    ['/en/categories', '0.8'],
    ['/en/blog', '0.8'],
    ['/en/contact', '0.6'],
    ['/en/faq', '0.6'],
    ['/en/privacy', '0.3'],
  ];

  for (const [path, priority] of staticPages) {
    urls.push({
      loc: `https://www.royalspl.shop${path}`,
      lastmod: today,
      changefreq: 'weekly',
      priority: priority
    });
  }

  // Category filter pages (zh + en). The products page matches by name_zh; both locales pass the encoded Chinese name.
  for (const c of categories) {
    if (!c.name_zh) continue;
    const lm = c.updated_at ? c.updated_at.split('T')[0] : today;
    const cat = encodeURIComponent(c.name_zh);
    urls.push({
      loc: `https://www.royalspl.shop/products?category=${cat}`,
      lastmod: lm,
      changefreq: 'weekly',
      priority: '0.6'
    });
    urls.push({
      loc: `https://www.royalspl.shop/en/products?category=${cat}`,
      lastmod: lm,
      changefreq: 'weekly',
      priority: '0.6'
    });
  }

  // Product pages (zh + en)
  for (const p of products) {
    const lm = p.updated_at ? p.updated_at.split('T')[0] : today;
    urls.push({
      loc: `https://www.royalspl.shop/product-detail?id=${p.id}`,
      lastmod: lm,
      changefreq: 'weekly',
      priority: '0.7'
    });
    urls.push({
      loc: `https://www.royalspl.shop/en/product-detail?id=${p.id}`,
      lastmod: lm,
      changefreq: 'weekly',
      priority: '0.7'
    });
  }

  // Blog pages: zh for every published post; en only when an English title exists.
  for (const b of blogs) {
    const lm = b.updated_at ? b.updated_at.split('T')[0] : today;
    urls.push({
      loc: `https://www.royalspl.shop/blog-detail?id=${b.id}`,
      lastmod: lm,
      changefreq: 'monthly',
      priority: '0.6'
    });
    if ((b.title_en || '').trim()) {
      urls.push({
        loc: `https://www.royalspl.shop/en/blog-detail?id=${b.id}`,
        lastmod: lm,
        changefreq: 'monthly',
        priority: '0.6'
      });
    }
  }

  // Build XML
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;
  for (const u of urls) {
    xml += `  <url>
    <loc>${xmlEscape(u.loc)}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>
`;
  }
  xml += `</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
