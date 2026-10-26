// Dynamic sitemap.xml - real-time query Supabase for all active products and blog posts

const SUPABASE_URL = 'https://gefqlrmozxbgfhxgngtg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZnFscm1venhiZ2ZoeGduZ3RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyOTI0MDQsImV4cCI6MjEwMTg2ODQwNH0.oH0fI1xpKn6arQlpvznrXXMMWsD1ZxNazRP4LZeZ68Y';

async function fetchFromSupabase(table, select) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${select}&is_active=eq.true&order=id.desc`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  if (!resp.ok) return [];
  return resp.json();
}

export async function onRequest() {
  const today = new Date().toISOString().split('T')[0];
  
  // Fetch all active products
  const products = await fetchFromSupabase('products', 'id,updated_at');
  
  // Fetch all active blog posts
  const blogs = await fetchFromSupabase('blog_posts', 'id,updated_at');
  
  let urls = [];
  
  // Static pages
  const staticPages = [
    ['/', '1.0'],
    ['/products.html', '0.8'],
    ['/categories.html', '0.8'],
    ['/blog.html', '0.8'],
    ['/contact.html', '0.6'],
    ['/faq.html', '0.6'],
    ['/privacy.html', '0.3'],
    ['/en/', '1.0'],
    ['/en/products.html', '0.8'],
    ['/en/categories.html', '0.8'],
    ['/en/blog.html', '0.8'],
    ['/en/contact.html', '0.6'],
    ['/en/faq.html', '0.6'],
    ['/en/privacy.html', '0.3'],
  ];
  
  for (const [path, priority] of staticPages) {
    urls.push({
      loc: `https://www.royalspl.shop${path}`,
      lastmod: today,
      changefreq: 'weekly',
      priority: priority
    });
  }
  
  // Product pages (zh + en)
  for (const p of products) {
    const lm = p.updated_at ? p.updated_at.split('T')[0] : today;
    urls.push({
      loc: `https://www.royalspl.shop/product-detail.html?id=${p.id}`,
      lastmod: lm,
      changefreq: 'weekly',
      priority: '0.7'
    });
    urls.push({
      loc: `https://www.royalspl.shop/en/product-detail.html?id=${p.id}`,
      lastmod: lm,
      changefreq: 'weekly',
      priority: '0.7'
    });
  }
  
  // Blog pages (zh + en)
  for (const b of blogs) {
    const lm = b.updated_at ? b.updated_at.split('T')[0] : today;
    urls.push({
      loc: `https://www.royalspl.shop/blog-detail.html?id=${b.id}`,
      lastmod: lm,
      changefreq: 'monthly',
      priority: '0.6'
    });
    urls.push({
      loc: `https://www.royalspl.shop/en/blog-detail.html?id=${b.id}`,
      lastmod: lm,
      changefreq: 'monthly',
      priority: '0.6'
    });
  }
  
  // Build XML
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;
  for (const u of urls) {
    xml += `  <url>
    <loc>${u.loc}</loc>
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
