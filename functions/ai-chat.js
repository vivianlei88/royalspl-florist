export async function onRequestPost(context) {
    try {
        const { message, history, productInfo, pageContext, userEmail, userOrders, imageBase64 } = await context.request.json();
        
        const SUPABASE_URL = context.env.SUPABASE_URL || 'https://gefqlrmozxbgfhxgngtg.supabase.co';
        const SERVICE_KEY = context.env.SUPABASE_SERVICE_ROLE_KEY || context.env.SUPABASE_Secret_keys;
        
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
        
        // 加载全网站内容（精简版，控制在8K上下文内）
        let knowledgeContext = '';
        
        try {
            const r = await fetch(SUPABASE_URL + '/rest/v1/blog_posts?select=title,content,created_at&is_published=eq.true&order=created_at.desc&limit=5', { headers });
            const posts = await r.json();
            if (posts && posts.length > 0) {
                knowledgeContext += '\n\n【品牌Blog】\n' + posts.map(p => '標題:' + p.title + '\n內容:' + (p.content||'').substring(0,150)).join('\n---\n');
            }
        } catch(e) {}
        
        try {
            const r = await fetch(SUPABASE_URL + '/rest/v1/faq_items?select=question,answer&is_published=eq.true&order=sort_order.asc&limit=10', { headers });
            const faqs = await r.json();
            if (faqs && faqs.length > 0) {
                knowledgeContext += '\n\n【常見問題】\n' + faqs.map(f => 'Q:' + f.question + '\nA:' + (f.answer||'').substring(0,100)).join('\n---\n');
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
            const r = await fetch(SUPABASE_URL + '/rest/v1/flower_care?select=title,content&is_active=eq.true&limit=5', { headers });
            const care = await r.json();
            if (care && care.length > 0) {
                knowledgeContext += '\n\n【花材護理】\n' + care.map(c => '標題:' + c.title + '\n內容:' + (c.content||'').substring(0,100)).join('\n---\n');
            }
        } catch(e) {}
        
        try {
            const r = await fetch(SUPABASE_URL + '/rest/v1/categories?select=id,name_zh,name_en&is_active=eq.true&order=sort_order.asc', { headers });
            const cats = await r.json();
            if (cats && cats.length > 0) {
                knowledgeContext += '\n\n【商品分類】\n' + cats.map(c => 'ID:' + c.id + ' | ' + (c.name_zh||'') + ' ' + (c.name_en||'')).join('\n');
            }
        } catch(e) {}
        
        try {
            const r = await fetch(SUPABASE_URL + '/rest/v1/products?select=id,name_zh,name_en,price,category,specs_flowers,is_active&is_active=eq.true&order=created_at.desc&limit=30', { headers });
            const products = await r.json();
            if (products && products.length > 0) {
                knowledgeContext += '\n\n【全部商品】\n' + products.map(p => 
                    'ID:' + p.id + ' | ' + (p.name_zh||p.name_en) + ' | HK$' + p.price + ' | 分類:' + (p.category||'') + ' | 花材:' + (p.specs_flowers||'') + ' | 鏈接:/product-detail.html?id=' + p.id
                ).join('\n');
            }
        } catch(e) {}
        
        systemPrompt += knowledgeContext;
        
        systemPrompt += '\n\n【商品推薦規則-最重要】用戶詢問推薦商品、想買花、送禮、有什麼花束、報預算等，必須從上方【全部商品列表】中挑選具體商品來推薦，嚴禁推薦分類。\n推薦步驟：1) 若用戶報咗預算（如800-1000、600左右），從商品列表中篩選價格符合預算的商品；2) 若無預算，選2-3個最受歡迎/最合適嘅商品。\n每個推薦必須嚴格使用列表中的真實商品ID，鏈接格式（一字不差）：\n商品名稱 - HK$真實價格 - 鏈接：/product-detail.html?id=真實商品ID\n示例：\n鬱金香光譜 - HK$460 - 鏈接：/product-detail.html?id=66\n\n【禁止事項】\n1. 嚴禁推薦分類（如法式田園自然風、日式鮮花束等），必須推薦具體商品；\n2. 嚴禁編造或猜測ID，鏈接中的ID必須是商品列表中出現過的；\n3. 嚴禁寫HK$價格暫缺，價格必須用商品列表中的真實價格；\n4. 除非用戶明確問「有咩分類」，先可以用分類頁鏈接：/products.html?category=分類ID。';
        
        if (productInfo) {
            systemPrompt += '\n\n【用戶當前瀏覽的商品】ID:' + productInfo.id + ' | ' + productInfo.name + ' | ' + (productInfo.price || '');
        }
        if (pageContext) {
            systemPrompt += '\n\n【客人停留頁面】' + (pageContext.pageType || '') + ' | ' + (pageContext.detail || '') + ' | 頁面地址:' + (pageContext.url || '');
            systemPrompt += '\n請結合客人停留的頁面給出貼合情境的回覆：例如客人在商品詳情頁就圍繞該商品講解與推薦搭配；在分類頁就推薦該分類商品；在購物車/結帳頁就協助訂單問題；在首頁就引導選擇。';
        }
        
        if (userOrders && userOrders.length > 0) {
            systemPrompt += '\n\n【用戶訂單與消費分析】這是該客戶的歷史訂單，請根據購買記錄了解客戶的喜好、消費力，提供個性化推薦和服務：\n';
            systemPrompt += userOrders.map(o => 
                '訂單號:' + (o.order_code || o.id) + ' | 狀態:' + o.status + ' | 金額:HK$' + (o.total_amount != null ? o.total_amount : '-') + ' | 日期:' + (o.created_at? o.created_at.substring(0,10) : '') + ' | 商品:' + JSON.stringify(o.items || []).substring(0,200) + ' | 鏈接:/order-detail.html?id=' + o.id
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
        
        // 优先使用 Gemini API（如果配置了）
        const GEMINI_API_KEY = context.env.GEMINI_API_KEY || context.env.GEMINI_KEY || '';
        
        if (GEMINI_API_KEY) {
            try {
                console.log('使用 Gemini API');
                
                // 转换消息格式为 Gemini 格式
                const geminiContents = [];
                const systemMsg = messages.find(m => m.role === 'system');
                const chatMessages = messages.filter(m => m.role !== 'system');
                
                for (let i = 0; i < chatMessages.length; i++) {
                    const m = chatMessages[i];
                    const role = m.role === 'assistant' ? 'model' : 'user';
                    let parts = [];
                    
                    if (typeof m.content === 'string') {
                        parts = [{ text: m.content }];
                    } else if (Array.isArray(m.content)) {
                        parts = m.content.map(p => {
                            if (p.type === 'text') return { text: p.text };
                            if (p.type === 'image_url') return { inlineData: { data: p.image_url.url.replace(/^data:image\/\w+;base64,/, ''), mimeType: 'image/jpeg' } };
                            return { text: '' };
                        });
                    }
                    
                    geminiContents.push({ role: role, parts: parts });
                }
                
                const geminiBody = {
                    contents: geminiContents,
                    generationConfig: {
                        maxOutputTokens: 1000,
                        temperature: 0.7
                    }
                };
                
                if (systemMsg && systemMsg.content) {
                    geminiBody.systemInstruction = {
                        parts: [{ text: systemMsg.content }]
                    };
                }
                
                const geminiResp = await fetch(
                    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + GEMINI_API_KEY,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(geminiBody)
                    }
                );
                
                const geminiData = await geminiResp.json();
                
                if (geminiData.candidates && geminiData.candidates[0] && 
                    geminiData.candidates[0].content && 
                    geminiData.candidates[0].content.parts &&
                    geminiData.candidates[0].content.parts[0]) {
                    const reply = geminiData.candidates[0].content.parts[0].text;
                    if (reply) {
                        return Response.json({ 
                            reply: reply,
                            model: 'gemini-2.0-flash'
                        });
                    }
                }
                
                console.error('Gemini 返回异常:', JSON.stringify(geminiData).substring(0, 500));
            } catch (e) {
                console.error('Gemini API 调用失败:', e.message);
                // 失败后继续尝试 Cloudflare Workers AI
            }
        }
        
        // 使用Cloudflare Workers AI（免费额度）- 作为 fallback
        const models = [
            '@cf/google/gemma-2-9b-it',
            '@cf/google/gemma-7b-it',
            '@cf/meta/llama-3.1-8b-instruct',
            '@cf/mistral/mistral-7b-instruct-v0.1'
        ];
        
        let aiResponse = null;
        let lastError = null;
        
        for (let i = 0; i < models.length; i++) {
            try {
                console.log('尝试模型:', models[i]);
                aiResponse = await context.env.AI.run(models[i], {
                    messages: messages,
                    max_tokens: 1000,
                    temperature: 0.7
                });
                if (aiResponse && (aiResponse.response || (aiResponse.choices && aiResponse.choices[0]))) {
                    console.log('模型成功:', models[i]);
                    break;
                }
            } catch (e) {
                console.error('模型', models[i], '失败:', e.message);
                lastError = e;
                aiResponse = null;
            }
        }
        
        if (!aiResponse) {
            return Response.json({ 
                error: '所有AI模型都调用失败: ' + (lastError ? lastError.message : '未知错误'),
                reply: '抱歉，AI客服暫時無法使用，請稍後再試或點擊「轉人工客服」聯繫我們。'
            }, { status: 500 });
        }
        
        // 兼容两种返回格式：Cloudflare标准格式(response)和OpenAI格式(choices)
        let reply = '';
        if (aiResponse && aiResponse.response) {
            reply = aiResponse.response;
        } else if (aiResponse && aiResponse.choices && aiResponse.choices[0] && aiResponse.choices[0].message) {
            reply = aiResponse.choices[0].message.content;
        }
        
        if (reply) {
            return Response.json({ 
                reply: reply,
                usage: aiResponse.usage
            });
        } else {
            return Response.json({ error: 'AI 回复失败', raw: aiResponse }, { status: 500 });
        }
    } catch(err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
}
