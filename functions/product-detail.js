export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const productId = url.searchParams.get('id');

  // 读取静态 HTML
  const staticUrl = new URL('/product-detail.html', url.origin);
  const staticRes = await env.ASSETS.fetch(staticUrl);
  let html = await staticRes.text();

  if (productId) {
    try {
      const supabaseUrl = 'https://gefqlrmozxbgfhxgngtg.supabase.co';
      const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZnFscm1venhiZ2ZoeGduZ3RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyOTI0MDQsImV4cCI6MjEwMTg2ODQwNH0.oH0fI1xpKn6arQlpvznrXXMMWsD1ZxNazRP4LZeZ68Y';

      const res = await fetch(`${supabaseUrl}/rest/v1/products?id=eq.${productId}&select=name_zh,name_en,price,images,image_url,is_active,description,stock`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` }
      });
      const products = await res.json();

      if (products && products.length > 0) {
        const p = products[0];
        const price = p.price || 0;
        const name = (p.name_zh || 'RoyalSpl Florist Product').replace(/</g, '&lt;');
        let desc = (p.description || '').replace(/</g, '&lt;').substring(0, 300);
        let image = 'https://www.royalspl.shop/assets/og-share.jpg';
        if (p.images && Array.isArray(p.images) && p.images.length > 0) {
          image = p.images[0];
        } else if (p.image_url) {
          image = p.image_url;
        }
        const avail = p.stock === '預訂' || p.is_preorder ? 'https://schema.org/PreOrder' : 'https://schema.org/InStock';

        // 替换静态 JSON-LD 里的占位符
        html = html.replace('"name": "RoyalSpl Florist 花藝產品"', `"name": "${name}"`);
        html = html.replace('"image": "https://www.royalspl.shop/assets/og-share.jpg"', `"image": "${image}"`);
        html = html.replace('"description": "RoyalSpl Florist 精心設計的花藝產品，使用新鮮花材，香港配送。"', `"description": "${desc}"`);
        // 在 offers.priceCurrency 后面插入 price
        html = html.replace('"priceCurrency": "HKD"', `"priceCurrency": "HKD",\n        "price": "${price}"`);
        // 替换 availability
        html = html.replace('"availability": "https://schema.org/InStock"', `"availability": "${avail}"`);
      }
    } catch(e) {
      console.log('product-detail SSR error:', e);
    }
  }

  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300' }
  });
}
