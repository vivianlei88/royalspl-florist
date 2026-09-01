export async function onRequestPost(context) {
    try {
        const { imageUrl, imageBase64, existingData } = await context.request.json();
        
        const API_KEY = context.env.DOUBAO_SEED_2_0_MINI_API_KEY;
        const MODEL_ID = 'doubao-seed-2-0-mini-260428';
        const BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3';
        
        if (!API_KEY) {
            return Response.json({ error: 'AI 服务未配置' }, { status: 500 });
        }
        
        if (!imageUrl && !imageBase64) {
            return Response.json({ error: '请先上传商品图片' }, { status: 400 });
        }
        
        const imageContent = imageBase64 || { url: imageUrl };
        
        const prompt = `你是香港花店的专业商品文案编辑。请仔细看这张花束图片，识别并填写以下商品信息，用繁体中文回答。

请严格按照以下JSON格式输出，不要输出其他内容：
{
  "name_zh": "商品中文名（优雅有诗意，4-8个字）",
  "name_en": "商品英文名（简洁优雅）",
  "description": "商品描述（80-120字，包含花材、风格、适用场景、花语）",
  "flower_materials": "主要花材（用逗号分隔，如：玫瑰,绣球,尤加利）",
  "specs": "规格尺寸（如：约30cm高，19支主花）",
  "scent_notes": "香气描述（如：淡雅清香，无浓郁花香）",
  "occasion_tags": "适用场景标签（用逗号分隔，如：生日,纪念日,表白）",
  "flower_tags": "核心花材标签（用逗号分隔，如：玫瑰,绣球）",
  "price_range": "价格区间标签（从以下选择：500以下/500-1000/1000-2000/2000以上）",
  "style_tags": "设计风格标签（用逗号分隔，如：韩式,日式,法式田园）"
}

${existingData ? '已有信息参考：' + JSON.stringify(existingData) : ''}`;
        
        const resp = await fetch(`${BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: MODEL_ID,
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'image_url', image_url: imageContent },
                            { type: 'text', text: prompt }
                        ]
                    }
                ],
                max_tokens: 1000,
                temperature: 0.5
            })
        });
        
        const data = await resp.json();
        if (data.choices && data.choices[0]) {
            let content = data.choices[0].message.content;
            // 尝试提取JSON
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    const result = JSON.parse(jsonMatch[0]);
                    return Response.json({ success: true, data: result, raw: content });
                } catch(e) {
                    return Response.json({ success: true, data: null, raw: content });
                }
            }
            return Response.json({ success: true, data: null, raw: content });
        }
        return Response.json({ error: data.error?.message || '识别失败' }, { status: 500 });
    } catch(err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
}
