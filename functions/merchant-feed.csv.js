export async function onRequest(context) {
  const { env } = context;

  const supabaseUrl = 'https://gefqlrmozxbgfhxgngtg.supabase.co';
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZnFscm1venhiZ2ZoeGduZ3RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyOTI0MDQsImV4cCI6MjEwMTg2ODQwNH0.oH0fI1xpKn6arQlpvznrXXMMWsD1ZxNazRP4LZeZ68Y';

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/products?is_active=eq.true&select=id,name_zh,name_en,price,sale_price,images,image_url,description,stock,is_preorder,sku,categories,tags,delivery_days`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` }
    });
    const products = await res.json();

    const header = 'id,title,description,link,image_link,price,sale_price,availability,availability_date,condition,brand,google_product_category,custom_label_0,shipping_label';
    const rows = [header];

    for (const p of products) {
      let image = '';
      if (p.images && Array.isArray(p.images) && p.images.length > 0) {
        image = p.images[0];
      } else if (p.image_url) {
        image = p.image_url;
      }
      if (!image) continue;

      const catStr = ((p.categories || []).join(',') + ',' + (p.tags || []).join(','));
      const isDried = /乾花|永生花|Dried|Preserved|Everlasting|家居與空間/.test(catStr);
      const isFresh = /鮮花|Fresh|Same-Day/.test(catStr);

      if (!isDried && !isFresh) continue;

      const feedId = p.sku || `PROD-${p.id}`;
      const title = (p.name_zh || p.name_en || '').substring(0, 150);
      const desc = (p.description || '').substring(0, 5000);
      const link = `https://www.royalspl.shop/product-detail?id=${p.id}`;
      const price = `${Number(p.price || 0).toFixed(2)} HKD`;
      const salePrice = p.sale_price ? `${Number(p.sale_price).toFixed(2)} HKD` : '';

      const isPreorder = (p.stock === '預訂' || p.is_preorder);
      const avail = isPreorder ? 'preorder' : 'in stock';

      // availability_date 仅对 preorder/backorder 必填；in stock 留空。
      // 格式须为 ISO 8601 带时间与时区（CSV：YYYY-MM-DDThh:mm+0800），纯日期会被 Google 判为缺失。
      let availDate = '';
      if (isPreorder) {
        const days = p.delivery_days || 1;
        const hk = new Date(Date.now() + 8 * 60 * 60 * 1000);
        hk.setUTCDate(hk.getUTCDate() + days);
        const y = hk.getUTCFullYear();
        const mo = String(hk.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(hk.getUTCDate()).padStart(2, '0');
        availDate = `${y}-${mo}-${dd}T13:00+0800`;
      }
      
      const gpc = '1937';
      const label = isDried ? '乾花' : '鮮花';
      // shipping_label：干花全球配送，鲜花香港本地配送
      const shipLabel = isDried ? 'global_shipping' : 'hk_local';

      const csvField = (v) => `"${String(v).replace(/"/g, '""')}"`;
      rows.push([
        csvField(feedId),
        csvField(title),
        csvField(desc),
        csvField(link),
        csvField(image),
        csvField(price),
        csvField(salePrice),
        csvField(avail),
        csvField(availDate),
        csvField('new'),
        csvField('RoyalSpl Florist'),
        csvField(gpc),
        csvField(label),
        csvField(shipLabel),
      ].join(','));
    }

    const csv = rows.join('\n');
    return new Response(csv, {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'cache-control': 'public, max-age=3600'
      }
    });
  } catch(e) {
    return new Response(`Error: ${e.message}`, { status: 500 });
  }
}
