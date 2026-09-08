export async function onRequestPost(context) {
    try {
        const { text, target_lang } = await context.request.json();

        const API_KEY = context.env.DOUBAO_SEED_2_0_MINI_API_KEY;
        const MODEL_ID = 'doubao-seed-2-0-mini-260428';
        const BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3';

        if (!API_KEY) {
            return Response.json({ error: 'AI 服务未配置' }, { status: 500 });
        }

        const targetLang = target_lang || 'en';
        let prompt = '';
        let systemPrompt = '';

        if (targetLang === 'en') {
            systemPrompt = 'You are a professional translator for a premium Hong Kong florist website. Translate the given Chinese (Traditional) text to natural, elegant English. Keep the floral industry terminology accurate. Only output the translation result, do not add any explanation or notes.';
            prompt = `Please translate the following text to English. The text may contain multiple sections separated by "\n---\n". Keep the same separator format in your output.\n\nText to translate:\n${text || ''}`;
        } else {
            systemPrompt = '你是香港高端花店網站的專業翻譯。將英文翻譯成自然優雅的繁體中文。保持花藝行業術語準確。只輸出翻譯結果，不要添加任何解釋或註釋。';
            prompt = `請將以下文字翻譯成繁體中文。文字可能包含多個以"\n---\n"分隔的部分，請在輸出中保持相同的分隔符格式。\n\n需要翻譯的文字：\n${text || ''}`;
        }

        const resp = await fetch(`${BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: MODEL_ID,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 2000,
                temperature: 0.5
            })
        });

        const data = await resp.json();
        if (data.choices && data.choices[0]) {
            let translated = data.choices[0].message.content.trim();
            // 清理可能的markdown格式
            translated = translated.replace(/^```\w*\n?/g, '').replace(/```$/g, '').trim();
            return Response.json({ success: true, translated: translated });
        }
        return Response.json({ error: data.error?.message || '翻譯失敗' }, { status: 500 });
    } catch(err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
}
