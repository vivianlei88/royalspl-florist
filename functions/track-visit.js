// 訪客追踪 Function：獲取訪客IP、解析地理位置、存入數據庫
export async function onRequestPost(context) {
    const { request, env } = context;
    
    try {
        const body = await request.json();
        const pageUrl = body.page_url || request.headers.get('referer') || '';
        const pageTitle = body.page_title || '';
        const userAgent = request.headers.get('user-agent') || '';
        
        // 1. 獲取訪客真實IP
        const ip = request.headers.get('cf-connecting-ip') 
                || request.headers.get('x-forwarded-for')?.split(',')[0].trim()
                || '';
        
        if (!ip) {
            return new Response(JSON.stringify({ success: false, error: '無法獲取IP' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }
        
        // 2. 解析IP地理位置（使用ip-api.com，免費版）
        let country = '';
        let region = '';
        let city = '';
        
        try {
            const geoResponse = await fetch(`http://ip-api.com/json/${ip}?fields=country,regionName,city,status`, {
                method: 'GET'
            });
            const geoData = await geoResponse.json();
            if (geoData.status === 'success') {
                country = geoData.country || '';
                region = geoData.regionName || '';
                city = geoData.city || '';
            }
        } catch (geoError) {
            console.error('IP地理解析失敗:', geoError);
        }
        
        // 3. 判斷新老訪客（通過IP是否曾經訪問過）
        let isNewVisitor = false;
        try {
            const checkResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/visitor_logs?ip=eq.${encodeURIComponent(ip)}&select=id&limit=1`, {
                method: 'GET',
                headers: {
                    'apikey': env.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                }
            });
            const checkData = await checkResponse.json();
            isNewVisitor = (!checkData || checkData.length === 0);
        } catch (checkError) {
            console.error('檢查新老訪客失敗:', checkError);
        }
        
        // 4. 存入數據庫
        const insertResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/visitor_logs`, {
            method: 'POST',
            headers: {
                'apikey': env.SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
                ip: ip,
                country: country,
                region: region,
                city: city,
                page_url: pageUrl,
                page_title: pageTitle,
                is_new_visitor: isNewVisitor,
                user_agent: userAgent
            })
        });
        
        if (!insertResponse.ok) {
            const errorText = await insertResponse.text();
            console.error('存入數據庫失敗:', errorText);
            return new Response(JSON.stringify({ success: false, error: '存入數據庫失敗' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }
        
        return new Response(JSON.stringify({ 
            success: true, 
            ip: ip, 
            country: country, 
            region: region,
            city: city,
            is_new_visitor: isNewVisitor
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
        
    } catch (error) {
        console.error('訪客追踪錯誤:', error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
}

// 處理OPTIONS預檢請求
export async function onRequestOptions(context) {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
}
