// Google搜索排名爬取Function
// 用法: GET /google-rank?keyword=香港花店
// 返回: { keyword, position, found, url, title }

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const keyword = url.searchParams.get('keyword') || '';
  
  if (!keyword) {
    return new Response(JSON.stringify({ error: '缺少keyword参数' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  try {
    // 构造Google搜索URL，查询前100条结果
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(keyword)}&num=100&hl=zh-TW&gl=hk`;
    
    // 发送请求，模拟浏览器
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ 
        keyword, 
        position: null, 
        found: false, 
        error: `Google返回状态码: ${response.status}` 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const html = await response.text();
    
    // 解析搜索结果，查找royalspl.shop的排名
    const result = parseGoogleResults(html, keyword);
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ 
      keyword, 
      position: null, 
      found: false, 
      error: error.message 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}

function parseGoogleResults(html, keyword) {
  const targetDomain = 'royalspl.shop';
  let position = null;
  let foundUrl = '';
  let foundTitle = '';
  
  try {
    // 方法1: 解析标准搜索结果 <div class="g">
    // Google搜索结果中的链接格式: <a href="/url?q=https://www.royalspl.shop/...&sa=...
    // 或者直接: <a href="https://www.royalspl.shop/..."
    
    // 提取所有搜索结果链接
    const linkRegex = /<a[^>]+href="(?:\/url\?q=)?(https?:\/\/[^"&]+)[^"]*"[^>]*>/gi;
    let match;
    let rank = 0;
    const seenUrls = new Set();
    
    while ((match = linkRegex.exec(html)) !== null) {
      let linkUrl = match[1];
      
      // 跳过Google自身的链接
      if (linkUrl.includes('google.com') || 
          linkUrl.includes('googleusercontent.com') ||
          linkUrl.includes('gstatic.com') ||
          linkUrl.includes('youtube.com')) {
        continue;
      }
      
      // 解码URL
      try {
        linkUrl = decodeURIComponent(linkUrl);
      } catch(e) {}
      
      // 去重
      if (seenUrls.has(linkUrl)) continue;
      seenUrls.add(linkUrl);
      
      rank++;
      
      // 检查是否是目标网站
      if (linkUrl.includes(targetDomain)) {
        position = rank;
        foundUrl = linkUrl;
        
        // 尝试提取标题
        const titleMatch = match[0].match(/<h3[^>]*>([^<]+)<\/h3>/i);
        if (titleMatch) {
          foundTitle = titleMatch[1].trim();
        }
        break;
      }
    }
    
    // 方法2: 如果方法1没找到，尝试直接搜索域名出现的位置
    if (!position) {
      const domainIndex = html.indexOf(targetDomain);
      if (domainIndex !== -1) {
        // 估算排名（粗略）
        const beforeText = html.substring(0, domainIndex);
        const resultCount = (beforeText.match(/<div class="g"/g) || []).length;
        if (resultCount > 0) {
          position = resultCount + 1;
        }
      }
    }
    
  } catch (e) {
    console.error('解析失败:', e);
  }
  
  return {
    keyword,
    position,
    found: position !== null,
    url: foundUrl,
    title: foundTitle
  };
}
