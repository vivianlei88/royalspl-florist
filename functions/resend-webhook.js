export async function onRequestPost(context) {
    try {
        const body = await context.request.json();
        console.log('Resend webhook received:', JSON.stringify(body).substring(0, 500));
        
        // Resend的邮件接收事件格式（webhook 只含元数据，正文需用 email_id 调 Received Emails API 获取）
        if (body.type === 'email.received' && body.data) {
            const email = body.data;
            
            const SUPABASE_URL = context.env.SUPABASE_URL || 'https://gefqlrmozxbgfhxgngtg.supabase.co';
            // 使用ANON_KEY作为后备（因为表没有RLS限制）
            const API_KEY = context.env.SUPABASE_SERVICE_ROLE_KEY || 
                           context.env.SUPABASE_Secret_keys ||
                           context.env.SUPABASE_ANON_KEY ||
                           'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZnFscm1venhiZ2ZoeGduZ3RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyOTI0MDQsImV4cCI6MjEwMTg2ODQwNH0.oH0fI1xpKn6arQlpvznrXXMMWsD1ZxNazRP4LZeZ68Y';
            const RESEND_API_KEY = context.env.RESEND_API_KEY || '';
            
            console.log('Using API key (first 20 chars):', API_KEY.substring(0, 20));
            console.log('RESEND_API_KEY configured:', RESEND_API_KEY ? 'yes' : 'no');
            
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
            
            // Resend webhook 的 payload 里邮件 ID 字段是 email_id（不是 id）
            const emailId = email.email_id || email.id || '';
            
            // 正文：webhook 不含正文，用 email_id 回调 Resend Received Emails API 获取
            let textContent = email.text || '';
            let htmlContent = email.html || '';
            if (emailId && RESEND_API_KEY) {
                try {
                    const apiResp = await fetch('https://api.resend.com/emails/receiving/' + encodeURIComponent(emailId), {
                        headers: { 'Authorization': 'Bearer ' + RESEND_API_KEY }
                    });
                    if (apiResp.ok) {
                        const full = await apiResp.json();
                        textContent = full.text || '';
                        htmlContent = full.html || '';
                        console.log('Resend receiving API got email:', emailId, 'text len:', textContent.length, 'html len:', htmlContent.length);
                    } else {
                        const errText = await apiResp.text();
                        console.log('Resend receiving API error:', apiResp.status, errText.substring(0, 200));
                    }
                } catch (err) {
                    console.error('Resend receiving API fetch failed:', err.message);
                }
            } else {
                console.log('email_id or RESEND_API_KEY missing, saving metadata only (id=' + emailId + ')');
            }
            
            const emailData = {
                resend_id: emailId,
                from_email: fromEmail,
                from_name: fromName,
                to_email: toEmail,
                subject: email.subject || '(无主题)',
                text_content: textContent || '',
                html_content: htmlContent || ''
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
