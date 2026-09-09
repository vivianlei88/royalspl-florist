// 一鍵批量翻譯：商品、部落格、常見問題、私隱政策
export async function onRequest(context) {
    if (context.request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    const { type, ids } = await context.request.json();
    
    const SUPABASE_URL = 'https://gefqlrmozxbgfhxgngtg.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZnFscm1venhiZ2ZoeGduZ3RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyOTI0MDQsImV4cCI6MjEwMTg2ODQwNH0.oH0fI1xpKn6arQlpvznrXXMMWsD1ZxNazRP4LZeZ68Y';

    async function translateText(text) {
        if (!text || text.trim() === '') return '';
        try {
            const aiResponse = await context.env.AI.run('@cf/mistral/mistral-7b-instruct-v0.1', {
                messages: [{
                    role: 'user',
                    content: '把以下繁體中文翻譯成自然流暢的英文，用於香港花店電商網站。只輸出翻譯結果，不要解釋：\n\n' + text
                }],
                max_tokens: 2000,
                temperature: 0.3
            });
            return (aiResponse.response || text).trim();
        } catch (e) {
            console.error('Translation error:', e);
            return text; // 翻譯失敗返回原文
        }
    }

    let results = { translated: 0, failed: 0, items: [] };

    try {
        if (type === 'products') {
            // 獲取所有商品
            let url = SUPABASE_URL + '/rest/v1/products?select=id,name_zh,name_en,description,description_en,is_active';
            if (ids && ids.length > 0) {
                url += '&id=in.(' + ids.join(',') + ')';
            }
            const resp = await fetch(url, {
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
            });
            const products = await resp.json();

            for (const p of products) {
                try {
                    const nameEn = p.name_en ? p.name_en : await translateText(p.name_zh);
                    const descEn = p.description_en ? p.description_en : await translateText(p.description);
                    
                    await fetch(SUPABASE_URL + '/rest/v1/products?id=eq.' + p.id, {
                        method: 'PATCH',
                        headers: {
                            'apikey': SUPABASE_KEY,
                            'Authorization': 'Bearer ' + SUPABASE_KEY,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=minimal'
                        },
                        body: JSON.stringify({ name_en: nameEn, description_en: descEn })
                    });
                    results.translated++;
                    results.items.push({ id: p.id, name: p.name_zh, status: 'ok' });
                } catch (e) {
                    results.failed++;
                    results.items.push({ id: p.id, name: p.name_zh, status: 'failed', error: e.message });
                }
            }
        }
        else if (type === 'blog') {
            // 翻譯部落格文章
            let url = SUPABASE_URL + '/rest/v1/blog_posts?select=id,title,title_en,content,content_en';
            if (ids && ids.length > 0) {
                url += '&id=in.(' + ids.join(',') + ')';
            }
            const resp = await fetch(url, {
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
            });
            const posts = await resp.json();

            for (const post of posts) {
                try {
                    const titleEn = post.title_en ? post.title_en : await translateText(post.title);
                    const contentEn = post.content_en ? post.content_en : await translateText(post.content);
                    
                    await fetch(SUPABASE_URL + '/rest/v1/blog_posts?id=eq.' + post.id, {
                        method: 'PATCH',
                        headers: {
                            'apikey': SUPABASE_KEY,
                            'Authorization': 'Bearer ' + SUPABASE_KEY,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=minimal'
                        },
                        body: JSON.stringify({ title_en: titleEn, content_en: contentEn })
                    });
                    results.translated++;
                    results.items.push({ id: post.id, title: post.title, status: 'ok' });
                } catch (e) {
                    results.failed++;
                    results.items.push({ id: post.id, title: post.title, status: 'failed' });
                }
            }
        }

        return new Response(JSON.stringify(results), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message, translated: results.translated, failed: results.failed }), { status: 500 });
    }
}
