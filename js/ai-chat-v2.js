// RoyalSpl AI 客服
(function() {
    let chatHistory = [];
    let aiFailCount = 0;
    let isHumanMode = false;
    let currentProduct = null;
    let userInfo = { email: null, orders: [] };
    let chatConfig = {
        welcome_message: '您好！我是 RoyalSpl AI 客服，有什么可以帮您？🌸',
        whatsapp_number: '85265036907',
        transfer_keywords: '人工,客服,真人,投诉,退款,退貨,投訴,#人工',
        max_fail_count: 2,
        is_active: true
    };

    const SUPABASE_URL = 'https://gefqlrmozxbgfhxgngtg.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZnFscm1venhiZ2ZoeGduZ3RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyOTI0MDQsImV4cCI6MjEwMTg2ODQwNH0.oH0fI1xpKn6arQlpvznrXXMMWsD1ZxNazRP4LZeZ68Y';

    // 加载配置
    async function loadConfig() {
        try {
            const resp = await fetch('/ai-chat-settings');
            const data = await resp.json();
            if (data && !data.error) {
                chatConfig = Object.assign(chatConfig, data);
            }
        } catch(e) { console.error('加载客服配置失败:', e); }
    }

    // 检测用户登录和订单
    async function loadUserInfo() {
        try {
            // 等待 supabase 库加载
            if (!window.supabase) {
                await new Promise(resolve => {
                    const check = setInterval(() => {
                        if (window.supabase) { clearInterval(check); resolve(); }
                    }, 100);
                    setTimeout(() => { clearInterval(check); resolve(); }, 3000);
                });
            }
            
            if (window.supabase) {
                const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                const { data: { user } } = await sb.auth.getUser();
                if (user) {
                    userInfo.email = user.email;
                    // 查询用户最近订单
                    const { data: orders } = await sb.from('orders')
                        .select('id,order_code,status,total_amount,created_at')
                        .eq('user_id', user.id)
                        .order('created_at', { ascending: false })
                        .limit(5);
                    if (orders) userInfo.orders = orders;
                }
            }
        } catch(e) { console.error('加载用户信息失败:', e); }
    }

    // 检测当前页面商品
    function detectProduct() {
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');
        if (productId && document.querySelector('.detail-title-zh')) {
            currentProduct = {
                id: productId,
                name: document.querySelector('.detail-title-zh')?.textContent,
                price: document.querySelector('.detail-price')?.textContent
            };
        }
    }

    // 检测是否需要转人工
    function shouldTransfer(message) {
        const msg = message.toLowerCase();
        const keywords = chatConfig.transfer_keywords.split(',').map(k => k.trim().toLowerCase());
        return keywords.some(kw => msg.includes(kw));
    }

    // 检测 AI 是否无法回答
    function isAIUnable(reply) {
        const unablePatterns = ['抱歉', '对不起', '无法回答', '不太清楚', '建议您联系', '请联系人工'];
        return unablePatterns.some(p => reply.includes(p));
    }

    // 创建客服窗口
    function getWelcomeMessage() {
        const lang = navigator.language || navigator.userLanguage || 'zh';
        const msg = chatConfig.welcome_message || '';
        // 如果欢迎语包含中英文分隔符 ||，自动选择
        if (msg.includes('||')) {
            const parts = msg.split('||');
            if (lang.toLowerCase().startsWith('en')) {
                return parts[1]?.trim() || parts[0];
            }
            return parts[0]?.trim() || parts[1] || msg;
        }
        return msg;
    }

    function createWidget() {
        const widget = document.createElement('div');
        widget.className = 'ai-chat-widget';
        widget.innerHTML = `
            <button class="ai-chat-button" onclick="toggleChat()">💬</button>
            <div class="ai-chat-window" id="aiChatWindow">
                <div class="ai-chat-header">
                    <h4>RoyalSpl 客服</h4>
                    <button class="ai-chat-close" onclick="toggleChat()">×</button>
                </div>
                <div class="ai-chat-messages" id="aiChatMessages">
                    <div class="ai-message">${getWelcomeMessage()}</div>
                </div>
                <div class="ai-chat-input">
                    <label class="ai-chat-upload" title="上传图片">
                        📷
                        <input type="file" id="aiChatImage" accept="image/*" style="display:none" onchange="handleImageUpload(event)">
                    </label>
                    <input type="text" id="aiChatInput" placeholder="输入您的问题..." onkeypress="if(event.key==='Enter')sendMessage()">
                    <button onclick="sendMessage()">发送</button>
                </div>
                <div id="aiChatImagePreview" style="display:none;padding:5px 15px;">
                    <img id="aiChatPreviewImg" style="max-width:80px;max-height:80px;border-radius:5px;">
                    <span onclick="clearImage()" style="cursor:pointer;color:#999;margin-left:5px;">✕</span>
                </div>
                <div class="ai-chat-transfer">
                    <button onclick="showHumanSupport()">转人工客服</button>
                </div>
            </div>
        `;
        document.body.appendChild(widget);
    }

    // 切换窗口
    window.toggleChat = function() {
        const win = document.getElementById('aiChatWindow');
        win.classList.toggle('active');
        if (win.classList.contains('active')) {
            detectProduct();
        }
    };

    let pendingImage = null;

    // 图片上传处理
    window.handleImageUpload = function(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            pendingImage = e.target.result; // base64
            document.getElementById('aiChatImagePreview').style.display = 'block';
            document.getElementById('aiChatPreviewImg').src = pendingImage;
        };
        reader.readAsDataURL(file);
    };

    window.clearImage = function() {
        pendingImage = null;
        document.getElementById('aiChatImagePreview').style.display = 'none';
        document.getElementById('aiChatImage').value = '';
    };

    // 发送消息
    window.sendMessage = async function() {
        const input = document.getElementById('aiChatInput');
        const message = input.value.trim();
        if (!message) return;

        if (isHumanMode) {
            addMessage(message, 'user');
            input.value = '';
            return;
        }

        // 检测转人工
        if (shouldTransfer(message)) {
            addMessage(message, 'user');
            addMessage('好的，正在为您转接人工客服...', 'ai');
            setTimeout(showHumanSupport, 500);
            input.value = '';
            return;
        }

        if (pendingImage) {
            addMessage('[图片] ' + message, 'user');
        } else {
            addMessage(message, 'user');
        }
        input.value = '';
        const imgToSend = pendingImage;
        clearImage();
        showTyping();

        try {
            const resp = await fetch('/ai-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: message,
                    history: chatHistory,
                    productInfo: currentProduct,
                    userEmail: userInfo.email,
                    userOrders: userInfo.orders,
                    imageBase64: imgToSend
                })
            });
            const data = await resp.json();
            hideTyping();

            if (data.reply) {
                // 处理回复：商品/訂單鏈接渲染成淘寶風格卡片，其餘鏈接可點擊
                await displayAiReply(data.reply);
                chatHistory.push({ role: 'user', content: message });
                chatHistory.push({ role: 'assistant', content: data.reply });

                // 检测 AI 无法回答
                if (isAIUnable(data.reply)) {
                    aiFailCount++;
                    if (aiFailCount >= chatConfig.max_fail_count) {
                        setTimeout(() => {
                            addMessage('抱歉多次未能解答您的问题，建议转人工客服为您服务。', 'ai');
                            setTimeout(showHumanSupport, 1000);
                        }, 500);
                        aiFailCount = 0;
                    }
                } else {
                    aiFailCount = 0;
                }
            } else {
                addMessage('抱歉，服务暂时不可用，请稍后重试或转人工客服。', 'ai');
            }
        } catch(e) {
            hideTyping();
            addMessage('网络错误，请检查连接或转人工客服。', 'ai');
        }
    };

    // 添加消息（纯文本）
    function addMessage(text, type) {
        const container = document.getElementById('aiChatMessages');
        const div = document.createElement('div');
        div.className = type === 'user' ? 'ai-message user-message' : 'ai-message';
        div.textContent = text;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }

    // 添加消息（HTML，支持链接）
    function addMessageHtml(html, type) {
        const container = document.getElementById('aiChatMessages');
        const div = document.createElement('div');
        div.className = type === 'user' ? 'ai-message user-message' : 'ai-message';
        div.innerHTML = html;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }

    // ===== 淘寶風格：把回覆中的商品/訂單鏈接渲染成卡片 =====
    // 等待 supabase 庫就緒
    async function waitForSupabase(timeoutMs) {
        if (window.supabase) return true;
        return new Promise(function(resolve) {
            let done = false;
            const check = setInterval(function() {
                if (window.supabase) { clearInterval(check); done = true; resolve(true); }
            }, 100);
            setTimeout(function() { if (!done) { clearInterval(check); resolve(false); } }, timeoutMs || 4000);
        });
    }
    // 撈商品資料（圖片/名稱/價格）渲染成可點擊卡片
    async function enrichProductCards(replyHtml) {
        const regex = /\/product-detail\.html\?id=(\d+)/g;
        const ids = [];
        let m;
        while ((m = regex.exec(replyHtml)) !== null) {
            if (ids.indexOf(m[1]) === -1) ids.push(m[1]);
        }
        if (ids.length === 0) return replyHtml;
        const ready = await waitForSupabase();
        if (!ready) return replyHtml;
        const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const { data: products, error } = await sb.from('products')
            .select('id,name_zh,name_en,price,image_url,images')
            .in('id', ids);
        if (error || !products || products.length === 0) return replyHtml;
        const pMap = {};
        products.forEach(function(p) { pMap[String(p.id)] = p; });
        // 每個 id 替換為卡片
        ids.forEach(function(id) {
            const p = pMap[id];
            if (!p) return;
            const img = (p.images && p.images.length > 0) ? p.images[0] : (p.image_url || '');
            const card = buildProductCard(p.id, img, p.name_zh, p.name_en, p.price);
            // 替換「鏈接：/product-detail.html?id=X」或「/product-detail.html?id=X」格式
            const urlPattern = new RegExp('(鏈接[：: ]*|\\()?/?product-detail\\.html\\?id=' + id + '(\\))?', 'g');
            replyHtml = replyHtml.replace(urlPattern, function(match, prefix, suffix) {
                return card;
            });
        });
        return replyHtml;
    }

    function buildProductCard(id, img, nameZh, nameEn, price) {
        var imgHtml = img ? '<img src="' + img + '" alt="' + (nameZh || '') + '">' : '<div class="ai-card-noimg">🌸</div>';
        return '<a href="/product-detail.html?id=' + id + '" target="_blank" class="ai-product-card">' +
            '<span class="ai-card-img">' + imgHtml + '</span>' +
            '<span class="ai-card-body">' +
            '<span class="ai-card-name">' + (nameZh || '') + '</span>' +
            (nameEn ? '<span class="ai-card-name-en">' + nameEn + '</span>' : '') +
            '<span class="ai-card-price">HK$' + price + '</span>' +
            '</span>' +
            '<span class="ai-card-go">查看 ›</span>' +
            '</a>';
    }

    // 撈訂單資料渲染成訂單卡片
    async function enrichOrderCards(replyHtml) {
        const regex = /\/order-detail\.html\?id=(\d+)/g;
        const ids = [];
        let m;
        while ((m = regex.exec(replyHtml)) !== null) {
            if (ids.indexOf(m[1]) === -1) ids.push(m[1]);
        }
        if (ids.length === 0) return replyHtml;
        const ready = await waitForSupabase();
        if (!ready) return replyHtml;
        const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const { data: orders, error } = await sb.from('orders')
            .select('id,order_code,status,total_amount,subtotal,created_at,items,product_images,product_names')
            .in('id', ids);
        if (error || !orders || orders.length === 0) return replyHtml;
        const oMap = {};
        orders.forEach(function(o) { oMap[String(o.id)] = o; });
        ids.forEach(function(id) {
            const o = oMap[id];
            if (!o) return;
            const card = buildOrderCard(o);
            const urlPattern = new RegExp('(鏈接[：: ]*|\\()?/?order-detail\\.html\\?id=' + id + '(\\))?', 'g');
            replyHtml = replyHtml.replace(urlPattern, function(match, prefix, suffix) {
                return card;
            });
        });
        return replyHtml;
    }

    function buildOrderCard(o) {
        // 取訂單第一件商品圖片
        let img = '';
        if (o.items && Array.isArray(o.items) && o.items.length > 0 && o.items[0].image) {
            img = o.items[0].image;
        } else if (o.product_images) {
            try {
                const arr = JSON.parse(o.product_images);
                if (arr && arr.length > 0) img = arr[0];
            } catch(e) {
                img = (o.product_images || '').split('|')[0];
            }
        }
        const statusMap = { pending: '待付款', paid: '已付款', processing: '處理中', shipped: '已發貨', delivered: '已完成', cancelled: '已取消', completed: '已完成' };
        const statusText = statusMap[o.status] || o.status || '';
        const nameText = (o.items && o.items.length > 0 && o.items[0].name) ? o.items[0].name : (o.product_names || '');
        const imgHtml = img ? '<img src="' + img + '" alt="訂單">' : '<div class="ai-card-noimg">📦</div>';
        return '<a href="/order-detail.html?id=' + o.id + '" target="_blank" class="ai-order-card">' +
            '<span class="ai-card-img">' + imgHtml + '</span>' +
            '<span class="ai-card-body">' +
            '<span class="ai-card-name">' + (nameText || '訂單 ' + o.order_code) + '</span>' +
            '<span class="ai-card-sub">訂單號 ' + (o.order_code || o.id) + '</span>' +
            '<span class="ai-card-sub">' + (statusText ? '狀態 ' + statusText : '') + '</span>' +
            '<span class="ai-card-price">HK$' + (o.total_amount != null ? o.total_amount : '-') + '</span>' +
            '</span>' +
            '<span class="ai-card-go">查看 ›</span>' +
            '</a>';
    }

    // 處理回覆：先換卡片再顯示
    async function displayAiReply(reply) {
        let replyHtml = reply.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
        replyHtml = replyHtml.replace(/<a href="(\/product-detail\.html\?id=\d+)"[^>]*>[^<]*<\/a>/g, '$1');
        replyHtml = replyHtml.replace(/<a href="(\/order-detail\.html\?id=\d+)"[^>]*>[^<]*<\/a>/g, '$1');
        // 先轉換為卡片
        try {
            replyHtml = await enrichProductCards(replyHtml);
            replyHtml = await enrichOrderCards(replyHtml);
        } catch(e) { console.error('渲染卡片失敗:', e); }
        // 剩餘普通鏈接才轉成 <a>
        replyHtml = replyHtml.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
        addMessageHtml(replyHtml, 'ai');
    }

    // 显示输入中
    function showTyping() {
        const container = document.getElementById('aiChatMessages');
        const div = document.createElement('div');
        div.className = 'ai-message ai-typing';
        div.id = 'aiTyping';
        div.textContent = '正在输入...';
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }

    function hideTyping() {
        const typing = document.getElementById('aiTyping');
        if (typing) typing.remove();
    }

    // 显示人工客服
    window.showHumanSupport = function() {
        isHumanMode = true;
        const container = document.getElementById('aiChatMessages');
        container.innerHTML = `
            <div class="human-support-panel">
                <h5>人工客服</h5>
                <p style="font-size:13px;color:#666;margin-bottom:15px;">您可以通过以下方式联系我们：</p>
                <a href="https://wa.me/${chatConfig.whatsapp_number}" target="_blank" class="whatsapp-link">
                    <span style="font-size:20px;">💬</span>
                    <span>WhatsApp 联系客服</span>
                </a>
                <p style="font-size:13px;color:#666;margin-bottom:10px;">或留言，我们会尽快回复：</p>
                <div class="message-form">
                    <input type="text" id="msgName" placeholder="您的姓名">
                    <input type="tel" id="msgPhone" placeholder="联系电话">
                    <textarea id="msgContent" placeholder="请描述您的问题..."></textarea>
                    <button onclick="submitMessage()">提交留言</button>
                </div>
            </div>
        `;
    };

    // 提交留言
    window.submitMessage = async function() {
        const name = document.getElementById('msgName').value.trim();
        const phone = document.getElementById('msgPhone').value.trim();
        const message = document.getElementById('msgContent').value.trim();

        if (!name || !phone || !message) {
            alert('请填写完整信息');
            return;
        }

        try {
            const resp = await fetch('/customer-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, phone, message })
            });
            const data = await resp.json();
            if (data.success) {
                alert('留言提交成功！我们会尽快联系您。');
                document.getElementById('msgName').value = '';
                document.getElementById('msgPhone').value = '';
                document.getElementById('msgContent').value = '';
            } else {
                alert('提交失败：' + (data.error || '未知错误'));
            }
        } catch(e) {
            alert('提交失败：' + e.message);
        }
    };

    // 初始化
    async function init() {
        await loadConfig();
        loadUserInfo(); // 异步加载，不阻塞
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', createWidget);
        } else {
            createWidget();
        }
    }
    init();
})();
