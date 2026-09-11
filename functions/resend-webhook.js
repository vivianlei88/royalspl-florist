export async function onRequestPost(context) {
    try {
        const body = await context.request.json();
        console.log('Resend webhook received:', JSON.stringify(body).substring(0, 500));
        
        // Resend的邮件接收事件格式
        if (body.type === 'email.received' && body.data) {
            const email = body.data;
            
            const SUPABASE_URL = context.env.SUPABASE_URL || 'https://gefqlrmozxbgfhxgngtg.supabase.co';
            // 使用ANON_KEY作为后备（因为表没有RLS限制）
            const API_KEY = context.env.SUPABASE_SERVICE_ROLE_KEY || 
                           context.env.SUPABASE_Secret_keys ||
                           context.env.SUPABASE_ANON_KEY ||
                           'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZnFscm1venhiZ2ZoeGduZ3RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyOTI0MDQsImV4cCI6MjEwMTg2ODQwNH0.oH0fI1xpKn6arQlpvznrXXMMWsD1ZxNazRP4LZeZ68Y';
            
            console.log('Using API key (first 20 chars):', API_KEY.substring(0, 20));
            
            // 解析发件人
            let fromEmail = email.from || '';
            let fromName = '';
            if (fromEmail.includes('<')) {
                const match = fromEmail.match(/^(.*?)\s*<(.+?)>$/);
                if (match) {
                    fromName = match[1].trim().replace(/^["']|["']$/g, '');
                    fromEmail = match[2];
                }
            }
            
            // 解析收件人
            let toEmail = '';
            if (Array.isArray(email.to) && email.to.length > 0) {
                toEmail = email.to[0];
                if (toEmail.includes('<')) {
                    const match = toEmail.match(/<(.+?)>/);
                    if (match) toEmail = match[1];
                }
            } else if (typeof email.to === 'string') {
                toEmail = email.to;
            }
            
            const emailData = {
                resend_id: email.id || '',
                from_email: fromEmail,
                from_name: fromName,
                to_email: toEmail,
                subject: email.subject || '(无主题)',
                text_content: email.text || '',
                html_content: email.html || ''
            };
            
            console.log('Email data to save:', JSON.stringify(emailData).substring(0, 200));
            
            // 存储到数据库
            const resp = await fetch(SUPABASE_URL + '/rest/v1/received_emails', {
                method: 'POST',
                headers: {
                    'apikey': API_KEY,
                    'Authorization': 'Bearer ' + API_KEY,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(emailData)
            });
            
            const result = await resp.json();
            console.log('Supabase response status:', resp.status);
            console.log('Supabase response:', JSON.stringify(result).substring(0, 300));
            
            if (!resp.ok) {
                return Response.json({ 
                    success: false, 
                    error: 'Failed to save email',
                    status: resp.status,
                    details: result
                }, { status: 500 });
            }
            
            return Response.json({ success: true, id: result[0]?.id });
        }
        
        return Response.json({ success: true, message: 'Event received' });
    } catch (err) {
        console.error('Resend webhook error:', err);
        return Response.json({ success: false, error: err.message }, { status: 500 });
    }
}

// 支持GET请求用于测试
export async function onRequestGet(context) {
    return Response.json({ 
        message: 'Resend webhook endpoint is working',
        usage: 'POST email data to this URL'
    });
}
