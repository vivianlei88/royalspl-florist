export async function onRequestPost(context) {
    try {
        const { message, history, productInfo, userEmail, userOrders, imageBase64 } = await context.request.json();
        
        const API_KEY = context.env.DOUBAO_SEED_2_0_MINI_API_KEY;
        const MODEL_ID = 'doubao-seed-2-0-mini-260428';
        const BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3';
        const SUPABASE_URL = context.env.SUPABASE_URL || 'https://gefqlrmozxbgfhxgngtg.supabase.co';
        const SERVICE_KEY = context.env.SUPABASE_SERVICE_ROLE_KEY || context.env.SUPABASE_Secret_keys;
        
        if (!API_KEY) {
            return Response.json({ error: 'AI 服务未配置' }, { status: 500 });
        }
        
        const headers = {
            'apikey': SERVICE_KEY,
            'Authorization': 'Bearer ' + SERVICE_KEY
        };
        
        let systemPrompt = '';
        let language = 'auto';
        try {
            const resp = await fetch(SUPABASE_URL + '/rest/v1/ai_chat_settings?select=system_prompt,language,is_active&limit=1', { headers });
            const settings = await resp.json();
            if (settings && settings.length > 0) {
                systemPrompt = settings[0].system_prompt || '';
                language = settings[0].language || 'auto';
                if (settings[0].is_active === false) {
                    return Response.json({ reply: '抱歉，AI 客服目前未啟用，請點擊「轉人工客服」聯繫我們。' });
                }
            }
        } catch(e) { console.error('读取设置失败:', e); }
        
        if (!systemPrompt) {
            systemPrompt = '你是 RoyalSpl Florist 香港花店的專業 AI 客服。\n品牌：RoyalSpl Florist，香港本地高端花店。\n主要產品：韓式花束、日式花藝、法式田園風、花店手打感花束。\n你是香港花店專家，熟悉各種花材、花語、配送政策。';
        }
        
        // 强制语言规则 - 粤语繁体
        systemPrompt += '\n\n【語言規則 - 必須嚴格遵守】\n1. 預設用香港廣東話口語 + 繁體字回答，例如「你好呀」「唔該」「多謝」「嘅」「咁」「喺」「哋」\n2. 絕對不能用簡體字，所有字必須是繁體\n3. 用戶用英文提問，先用英文回答\n4. 用戶明確要求普通話/書面語，才用書面繁體\n5. 跟隨用戶嘅語言，唔好主動轉換';
        
        // 输出限制
        systemPrompt += '\n\n【輸出限制】只輸出文字回答，不要生成圖片、視頻、代碼塊或Markdown格式，用純文本回答。';
        
        // 加载全网站内容
        let knowledgeContext = '';
        
        try {
            const r = await fetch(SUPABASE_URL + '/rest/v1/blog_posts?select=title,content,created_at&is_published=eq.true&order=created_at.desc&limit=10', { headers });
            const posts = await r.json();
            if (posts && posts.length > 0) {
                knowledgeContext += '\n\n【品牌Blog文章】\n' + posts.map(p => '標題:' + p.title + '\n內容:' + (p.content||'').substring(0,300)).join('\n---\n');
            }
        } catch(e) {}
        
        try {
            const r = await fetch(SUPABASE_URL + '/rest/v1/faq_items?select=question,answer&is_published=eq.true&order=sort_order.asc&limit=20', { headers });
            const faqs = await r.json();
            if (faqs && faqs.length > 0) {
                knowledgeContext += '\n\n【常見問題FAQ】\n' + faqs.map(f => 'Q:' + f.question + '\nA:' + f.answer).join('\n---\n');
            }
        } catch(e) {}
        
        try {
            const r = await fetch(SUPABASE_URL + '/rest/v1/contact_settings?select=*&limit=1', { headers });
            const contact = await r.json();
            if (contact && contact.length > 0) {
                const c = contact[0];
                knowledgeContext += '\n\n【聯絡我們】電話:' + (c.phone||'') + ' | 電郵:' + (c.email||'') + ' | 地址:' + (c.address||'') + ' | 營業時間:' + (c.business_hours||'');
            }
        } catch(e) {}
        
        try {
            const r = await fetch(SUPABASE_URL + '/rest/v1/flower_care?select=title,content&is_active=eq.true&limit=10', { headers });
            const care = await r.json();
            if (care && care.length > 0) {
                knowledgeContext += '\n\n【花材護理知識】\n' + care.map(c => '標題:' + c.title + '\n內容:' + (c.content||'').substring(0,200)).join('\n---\n');
            }
        } catch(e) {}
        
        try {
            const r = await fetch(SUPABASE_URL + '/rest/v1/categories?select=id,name_zh,name_en,description&is_active=eq.true&order=sort_order.asc', { headers });
            const cats = await r.json();
            if (cats && cats.length > 0) {
                knowledgeContext += '\n\n【商品分類】\n' + cats.map(c => 'ID:' + c.id + ' | ' + (c.name_zh||'') + ' ' + (c.name_en||'') + ' | ' + (c.description||'')).join('\n');
            }
        } catch(e) {}
        
        try {
            const r = await fetch(SUPABASE_URL + '/rest/v1/products?select=id,name_zh,name_en,price,category,description,flower_materials,scent_notes,occasion_tags,is_active&is_active=eq.true&order=created_at.desc&limit=30', { headers });
            const products = await r.json();
            if (products && products.length > 0) {
                knowledgeContext += '\n\n【全部商品列表】\n' + products.map(p => 
                    'ID:' + p.id + ' | ' + (p.name_zh||p.name_en) + ' | HK$' + p.price + ' | 分類:' + (p.category||'') + ' | 花材:' + (p.flower_materials||'') + ' | 香氣:' + (p.scent_notes||'') + ' | 場景:' + (p.occasion_tags||'') + ' | 描述:' + (p.description||'').substring(0,100) + ' | 鏈接:/product-detail.html?id=' + p.id
                ).join('\n');
            }
        } catch(e) {}
        
        systemPrompt += knowledgeContext;
        
        systemPrompt += '\n\n【商品推薦規則】用戶詢問推薦商品、想買花、送禮、有什麼花束等，從上方商品列表中推薦最合適的商品，並給出鏈接（格式：商品名稱 - HK$價格 - 鏈接：/product-detail.html?id=商品ID）。可以推薦2-3個選項。';
        
        if (productInfo) {
            systemPrompt += '\n\n【用戶當前瀏覽的商品】ID:' + productInfo.id + ' | ' + productInfo.name + ' | ' + (productInfo.price || '');
        }
        
        if (userOrders && userOrders.length > 0) {
            systemPrompt += '\n\n【用戶訂單與消費分析】這是該客戶的歷史訂單，請根據購買記錄了解客戶的喜好、消費力，提供個性化推薦和服務：\n';
            systemPrompt += userOrders.map(o => 
                '訂單號:' + (o.order_code || o.id) + ' | 狀態:' + o.status + ' | 金額:HK$' + o.total + ' | 日期:' + (o.created_at? o.created_at.substring(0,10) : '') + ' | 商品:' + JSON.stringify(o.items || []).substring(0,200) + ' | 鏈接:/order-detail.html?id=' + o.id
            ).join('\n');
            systemPrompt += '\n請根據客戶過往購買的花材類型、價格區間、購買頻率，推薦符合其喜好和消費力的商品。';
        } else if (userEmail) {
            systemPrompt += '\n\n用戶已登錄，電郵：' + userEmail + '，暫時沒有訂單記錄。可以推薦入門級商品。';
        }
        
        let messages = [{ role: 'system', content: systemPrompt }];
        if (history && Array.isArray(history)) {
            messages = messages.concat(history.slice(-6));
        }
        
        if (imageBase64) {
            messages.push({
                role: 'user',
                content: [
                    { type: 'image_url', image_url: { url: imageBase64 } },
                    { type: 'text', text: message || '請描述這張圖片的內容，如果是花束，請識別花材、風格，並推薦類似的商品。' }
                ]
            });
        } else {
            messages.push({ role: 'user', content: message });
        }
        
        const resp = await fetch(BASE_URL + '/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + API_KEY
            },
            body: JSON.stringify({
                model: MODEL_ID,
                messages: messages,
                max_tokens: 1000,
                temperature: 0.7
            })
        });
        
        const data = await resp.json();
        if (data.choices && data.choices[0]) {
            return Response.json({ 
                reply: data.choices[0].message.content,
                usage: data.usage
            });
        } else {
            return Response.json({ error: data.error ? data.error.message : 'AI 回复失败' }, { status: 500 });
        }
    } catch(err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
}
