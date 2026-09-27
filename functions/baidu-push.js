// 百度站長 API 提交代理 Function
// 前端（admin.html）POST URL 列表到本站 /baidu-push，由服務端轉發俾百度（避免瀏覽器 CORS / https 混合內容限制）
// 百度 API：POST http://data.zz.baidu.com/urls?site=<site>&token=<token>，body 每行一個 URL
// Token 優先讀環境變量 BAIDU_PUSH_TOKEN / BAIDU_PUSH_SITE；未設定時用下方默認值（可在 Cloudflare Pages > Settings > Environment variables 設定覆蓋）

const DEFAULT_SITE = 'https://www.royalspl.shop';
const DEFAULT_TOKEN = 'MJW9B72xuuinJejw';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestPost(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await request.text();
    const urls = body.split('\n').map((u) => u.trim()).filter(Boolean);

    if (urls.length === 0) {
      return new Response(JSON.stringify({ success: false, error: '無 URL 可推送' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 只允許推送本站網址，防止被盜用
    const site = env.BAIDU_PUSH_SITE || DEFAULT_SITE;
    for (const u of urls) {
      if (u.indexOf('royalspl.shop') === -1) {
        return new Response(JSON.stringify({ success: false, error: '非本站 URL：' + u }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    const token = env.BAIDU_PUSH_TOKEN || DEFAULT_TOKEN;
    // 百度 API 要求 site/token 用原始字符串拼接（不可 URL 編碼，否則 site init fail）
    const resp = await fetch('http://data.zz.baidu.com/urls?site=' + site + '&token=' + token, {
      method: 'POST',
      body: urls.join('\n'),
      headers: { 'Content-Type': 'text/plain' },
    });

    const text = await resp.text();
    return new Response(text, { status: resp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: '轉發失敗: ' + e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}
